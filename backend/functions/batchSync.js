/**
 * BigQuery Batch Sync Cloud Function
 * 
 * Triggered every 5 minutes by Cloud Scheduler
 * Processes bigquery_sync_queue and syncs delivered/cancelled orders to BigQuery
 * 
 * Architecture:
 * 1. Read unprocessed items from bigquery_sync_queue
 * 2. Fetch order data from Firestore (status = 'Entregue' OR 'Cancelado')
 * 3. Transform data (extract region, calculate delivery time)
 * 4. Upload to Cloud Storage (FREE!)
 * 5. Load to BigQuery via Cloud Storage
 * 6. Mark items as processed
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Initialize services (admin already initialized in main index.js)
const db = admin.firestore();
const bigquery = new BigQuery();
const storage = new Storage();

const BUCKET_NAME = 'farmanossa-bigquery-staging';
const DATASET_ID = 'farmanossa_analytics';
const TABLE_ID = 'orders';
const BATCH_SIZE = 100; // Process up to 100 orders per run

/**
 * Extract region from address using known Brasília regions
 */
function extractRegionFromAddress(address) {
  if (!address) return null;
  
  const addressUpper = address.toUpperCase();
  
  const regions = [
    'AGUAS CLARAS', 'ASA SUL', 'ASA NORTE', 'ARNIQUEIRA', 'BRAZLANDIA',
    'CANDANGOLANDIA', 'CEILANDIA', 'CRUZEIRO', 'ESTRUTURAL', 'FERCAL',
    'GAMA', 'GUARA', 'ITAPOA', 'JARDIM BOTANICO', 'JARDIM BOTÂNICO',
    'LAGO NORTE', 'LAGO SUL', 'NUCLEO BANDEIRANTE', 'PARANOA', 'PARANOÁ',
    'PARK WAY', 'PLANALTINA', 'RECANTO DAS EMAS', 'RIACHO FUNDO',
    'RIACHO FUNDO I', 'RIACHO FUNDO II', 'SAMAMBAIA', 'SANTA MARIA',
    'SAO SEBASTIAO', 'SÃO SEBASTIÃO', 'SCIA', 'SIA', 'SOL NASCENTE',
    'SOBRADINHO', 'SOBRADINHO II', 'SUDOESTE', 'TAGUATINGA', 'VARJAO',
    'VARJÃO', 'VICENTE PIRES', 'OCTOGONAL', 'SETOR O', 'NOROESTE',
    'CRUZEIRO NOVO', 'CRUZEIRO VELHO', 'PARK SUL', 'LAGO', 'SETOR MILITAR URBANO'
  ];
  
  for (const region of regions) {
    if (addressUpper.includes(region)) {
      return region;
    }
  }
  
  return null;
}

/**
 * Calculate delivery time in minutes from status history
 */
function calculateDeliveryTime(statusHistory, orderId = 'unknown') {
  if (!statusHistory || !Array.isArray(statusHistory)) {
    console.log(`⚠️ [${orderId}] No statusHistory or not array:`, statusHistory);
    console.log(`⚡ [${orderId}] Using 10 min template (manual registration)`);
    return 10.0;
  }
  
  const startStatus = statusHistory.find(item => item.status === 'A caminho');
  const endStatus = statusHistory.find(item => item.status === 'Entregue');
  
  if (!startStatus) {
    console.log(`⚠️ [${orderId}] Missing 'A caminho' status. Available statuses:`, 
      statusHistory.map(s => s.status).join(', '));
    console.log(`⚡ [${orderId}] Using 10 min template (manual registration)`);
    return 10.0;
  }
  
  if (!endStatus) {
    console.log(`⚠️ [${orderId}] Missing 'Entregue' status. Available statuses:`, 
      statusHistory.map(s => s.status).join(', '));
    console.log(`⚡ [${orderId}] Using 10 min template (manual registration)`);
    return 10.0;
  }
  
  const startTime = startStatus.timestamp?._seconds 
    ? new Date(startStatus.timestamp._seconds * 1000)
    : (startStatus.timestamp?.toDate?.() || new Date(startStatus.timestamp));
    
  const endTime = endStatus.timestamp?._seconds
    ? new Date(endStatus.timestamp._seconds * 1000)
    : (endStatus.timestamp?.toDate?.() || new Date(endStatus.timestamp));
  
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  console.log(`📊 [${orderId}] Delivery time calculated:`, {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    diffMinutes: diffMinutes.toFixed(2)
  });
  
  // If time is valid (between 0 and 5 hours)
  if (diffMinutes > 0 && diffMinutes <= 300) {
    // If delivery is too fast (< 5 min), it's probably a manual registration
    // Use 10 min template (average delivery time) for consistency
    if (diffMinutes < 5) {
      console.log(`⚡ [${orderId}] Very fast delivery (${diffMinutes.toFixed(2)} min) - Using 10 min template`);
      return 10.0;
    }
    
    return Math.round(diffMinutes * 100) / 100;
  }
  
  // If time is out of range, also use 10 min template
  console.log(`⚠️ [${orderId}] Time out of range: ${diffMinutes.toFixed(2)} min - Using 10 min template`);
  return 10.0;
}

/**
 * Get license plate from motorcycle ID if needed
 * Returns the actual plate or null if not found
 */
async function getLicensePlateFromId(licensePlateOrId) {
  // If empty or null, return null
  if (!licensePlateOrId) return null;
  
  // Check if it's already a plate (contains letters and numbers in typical plate format)
  // Brazilian plates: ABC1234 or ABC1D23 (new Mercosul format)
  const platePattern = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;
  if (platePattern.test(licensePlateOrId.replace(/[-\s]/g, ''))) {
    return licensePlateOrId;
  }
  
  // Otherwise, it's likely a motorcycle ID, try to fetch from Firestore
  try {
    const motorcycleDoc = await db.collection('motorcycles').doc(licensePlateOrId).get();
    if (motorcycleDoc.exists) {
      const motorcycleData = motorcycleDoc.data();
      return motorcycleData.plate || null;
    }
  } catch (error) {
    console.error(`⚠️ Error fetching motorcycle ${licensePlateOrId}:`, error.message);
  }
  
  // If not found or error, return the original value
  return licensePlateOrId;
}

/**
 * Transform Firestore order to BigQuery schema
 */
async function transformOrderForBigQuery(doc) {
  const data = doc.data();
  const id = doc.id;
  
  // Parse items
  let items = [];
  let itemCount = 0;
  
  if (data.items) {
    if (typeof data.items === 'string') {
      items = data.items.split(',').map(item => item.trim()).filter(Boolean);
    } else if (Array.isArray(data.items)) {
      items = data.items;
    }
    itemCount = items.length;
  }
  
  // Extract region
  const region = extractRegionFromAddress(data.address || '');
  
  // Calculate delivery time
  const deliveryTimeMinutes = calculateDeliveryTime(data.statusHistory, id);
  
  // Parse timestamps
  const createdAt = data.createdAt?.toDate?.() || new Date(data.date || data.createdAt);
  const updatedAt = data.updatedAt?.toDate?.() || createdAt;
  
  // Parse rating date
  let reviewDate = null;
  if (data.reviewDate) {
    reviewDate = data.reviewDate.toDate?.() || new Date(data.reviewDate);
  }
  
  // Get actual license plate (convert ID to plate if needed)
  const licensePlate = await getLicensePlateFromId(data.licensePlate);
  
  return {
    order_id: id,
    order_number: data.orderId || data.originalOrderId || id,
    customer_name: data.customerName || '',
    customer_phone: data.customerPhone || '',
    address: data.address || '',
    region: region,
    
    pharmacy_unit_id: data.pharmacyUnitId || '',
    delivery_man: data.deliveryMan || null,
    delivery_man_name: data.deliveryManName || null,
    
    status: data.status || '',
    price_number: parseFloat(data.priceNumber) || 0,
    rating: data.rating ? parseFloat(data.rating) : null,
    review_comment: data.reviewComment || null,
    review_date: reviewDate,
    
    items: JSON.stringify(items),
    item_count: itemCount,
    
    license_plate: licensePlate,
    
    delivery_time_minutes: deliveryTimeMinutes,
    
    status_history: JSON.stringify(data.statusHistory || []),
    
    created_at: createdAt,
    updated_at: updatedAt
  };
}

/**
 * Main sync function
 */
exports.batchSyncToBigQuery = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('every 5 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('Starting BigQuery batch sync...');
    const startTime = Date.now();
    
    try {
      // Step 1: Get unprocessed items from queue
      const queueSnapshot = await db.collection('bigquery_sync_queue')
        .where('processed', '==', false)
        .limit(BATCH_SIZE)
        .get();
      
      if (queueSnapshot.empty) {
        console.log('No items to sync. Queue is empty.');
        return null;
      }
      
      console.log(`Found ${queueSnapshot.size} items to sync`);
      
      // Step 2: Fetch orders from Firestore
      const orderIds = queueSnapshot.docs.map(doc => doc.data().orderId);
      const orders = [];
      
      for (const orderId of orderIds) {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (orderDoc.exists) {
          const status = orderDoc.data().status;
          // Aceitar pedidos Entregues ou Cancelados
          if (status === 'Entregue' || status === 'Cancelado') {
            orders.push(orderDoc);
          }
        }
      }
      
      if (orders.length === 0) {
        console.log('No delivered/cancelled orders found in queue items');
        // Delete invalid queue items (orders not found or not delivered/cancelled)
        const batch = db.batch();
        queueSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`  Deleted ${queueSnapshot.size} invalid items from queue`);
        return null;
      }
      
      console.log(`Processing ${orders.length} orders (delivered/cancelled)`);
      
      // Step 3: Transform data (now async to fetch license plates)
      const transformedOrders = await Promise.all(orders.map(order => transformOrderForBigQuery(order)));
      
      // Step 4: Create NDJSON file
      const tempFilePath = path.join(os.tmpdir(), `sync_${Date.now()}.ndjson`);
      const ndjsonContent = transformedOrders.map(order => JSON.stringify(order)).join('\n');
      fs.writeFileSync(tempFilePath, ndjsonContent);
      
      console.log(`Created NDJSON file: ${(fs.statSync(tempFilePath).size / 1024 / 1024).toFixed(2)} MB`);
      
      // Step 5: Upload to Cloud Storage
      const bucket = storage.bucket(BUCKET_NAME);
      const gcsFileName = `sync/sync_${Date.now()}.ndjson`;
      await bucket.upload(tempFilePath, {
        destination: gcsFileName,
        metadata: { contentType: 'application/x-ndjson' }
      });
      
      console.log(`Uploaded to: gs://${BUCKET_NAME}/${gcsFileName}`);
      
      // Step 6: Load to BigQuery
      const dataset = bigquery.dataset(DATASET_ID);
      const table = dataset.table(TABLE_ID);
      const file = bucket.file(gcsFileName);
      
      const [job] = await table.load(file, {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        writeDisposition: 'WRITE_APPEND',
        autodetect: false,
        schema: {
          fields: [
            { name: 'order_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'order_number', type: 'STRING', mode: 'NULLABLE' },
            { name: 'customer_name', type: 'STRING', mode: 'NULLABLE' },
            { name: 'customer_phone', type: 'STRING', mode: 'NULLABLE' },
            { name: 'address', type: 'STRING', mode: 'NULLABLE' },
            { name: 'region', type: 'STRING', mode: 'NULLABLE' },
            { name: 'pharmacy_unit_id', type: 'STRING', mode: 'NULLABLE' },
            { name: 'delivery_man', type: 'STRING', mode: 'NULLABLE' },
            { name: 'delivery_man_name', type: 'STRING', mode: 'NULLABLE' },
            { name: 'status', type: 'STRING', mode: 'NULLABLE' },
            { name: 'price_number', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'rating', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'review_comment', type: 'STRING', mode: 'NULLABLE' },
            { name: 'review_date', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'items', type: 'STRING', mode: 'NULLABLE' },
            { name: 'item_count', type: 'INT64', mode: 'NULLABLE' },
            { name: 'license_plate', type: 'STRING', mode: 'NULLABLE' },
            { name: 'delivery_time_minutes', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'status_history', type: 'STRING', mode: 'NULLABLE' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'updated_at', type: 'TIMESTAMP', mode: 'NULLABLE' }
          ]
        }
      });
      
      console.log(`BigQuery job started: ${job.id}`);
      
      // Step 7: Delete processed queue items (keep queue clean and performant)
      const batch = db.batch();
      queueSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref); // Delete immediately after successful sync
      });
      await batch.commit();
      
      console.log(`  Deleted ${queueSnapshot.size} items from sync queue`);
      
      // Step 8: Cleanup temporary files
      fs.unlinkSync(tempFilePath);
      await file.delete();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ Sync complete! ${orders.length} orders synced in ${duration}s`);
      
      return null;
      
    } catch (error) {
      console.error('Batch sync failed:', error);
      throw error;
    }
  });
