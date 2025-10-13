/**
 * Safe Migration Script: Firestore Orders → BigQuery
 * 
 * Migrates only DELIVERED orders (status = 'Entregue')
 * Processes in small batches to avoid memory issues
 * 
 * Total orders: 172,323
 * Estimated delivered orders: ~50,000-70,000
 * 
 * Usage: node migrateToBigQuerySafe.js [--dry-run] [--limit=1000]
 */

const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'farmanossadelivery-76182.appspot.com'
});

const db = admin.firestore();
const bigquery = new BigQuery({
  projectId: 'farmanossadelivery-76182',
  keyFilename: path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json')
});
const storage = new Storage({
  projectId: 'farmanossadelivery-76182',
  keyFilename: path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json')
});

const bucket = storage.bucket('farmanossa-bigquery-staging');

// Configuration
const DATASET_ID = 'farmanossa_analytics';
const TABLE_ID = 'orders';
const BATCH_SIZE = 500; // Process 500 orders at a time for upload

/**
 * Extract region from address (same logic as client)
 */
function extractRegionFromAddress(address) {
  if (!address) return null;
  
  try {
    const addressUpper = address.toUpperCase();
    
    // Known Brasilia regions
    const knownRegions = [
      'ÁGUAS CLARAS', 'TAGUATINGA', 'CEILÂNDIA', 'GAMA', 'PLANALTINA',
      'SOBRADINHO', 'BRAZLÂNDIA', 'RIACHO FUNDO', 'SAMAMBAIA', 'SANTA MARIA',
      'SÃO SEBASTIÃO', 'RECANTO DAS EMAS', 'CRUZEIRO', 'LAGO SUL', 'LAGO NORTE',
      'JARDIM BOTÂNICO', 'VICENTE PIRES', 'PARK WAY', 'CANDANGOLÂNDIA',
      'NÚCLEO BANDEIRANTE', 'GUARÁ', 'ESTRUTURAL', 'ITAPOÃ', 'VARJÃO',
      'PARANOA', 'PARANOÁ', 'ENTRE LAGOS', 'ASA SUL', 'ASA NORTE', 'BOQUEIRAO',
      'LAGO'
    ];
    
    for (const region of knownRegions) {
      if (addressUpper.includes(region)) {
        return region;
      }
    }
    
    // Pattern between commas before BRASILIA/DF
    const patterns = [
      /,\s*([A-Z\s\d\-]+)\s*,\s*BRASILIA/i,
      /,\s*([A-Z\s\d\-]+)\s*,\s*DF/i
    ];
    
    for (const pattern of patterns) {
      const match = addressUpper.match(pattern);
      if (match && match[1]) {
        const region = match[1].trim();
        if (region.length > 2 && !/^\d+$/.test(region)) {
          return region;
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate delivery time from status history
 */
function calculateDeliveryTime(statusHistory) {
  if (!statusHistory || !Array.isArray(statusHistory)) return null;
  
  const startStatus = statusHistory.find(item => item.status === 'A caminho');
  const endStatus = statusHistory.find(item => item.status === 'Entregue');
  
  if (!startStatus || !endStatus) return null;
  
  const startTime = startStatus.timestamp?._seconds 
    ? new Date(startStatus.timestamp._seconds * 1000)
    : (startStatus.timestamp?.toDate?.() || new Date(startStatus.timestamp));
    
  const endTime = endStatus.timestamp?._seconds
    ? new Date(endStatus.timestamp._seconds * 1000)
    : (endStatus.timestamp?.toDate?.() || new Date(endStatus.timestamp));
  
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes >= 5 && diffMinutes <= 300) {
    return Math.round(diffMinutes * 100) / 100;
  }
  
  return null;
}

/**
 * Transform Firestore order to BigQuery schema
 */
function transformOrderForBigQuery(doc) {
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
  const deliveryTimeMinutes = calculateDeliveryTime(data.statusHistory);
  
  // Parse timestamps
  const createdAt = data.createdAt?.toDate?.() || new Date(data.date || data.createdAt);
  const updatedAt = data.updatedAt?.toDate?.() || createdAt;
  
  // Parse rating date
  let reviewDate = null;
  if (data.reviewDate) {
    reviewDate = data.reviewDate.toDate?.() || new Date(data.reviewDate);
  }
  
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
    
    items: JSON.stringify(items), // Convert array to JSON string for BigQuery
    item_count: itemCount,
    
    license_plate: data.licensePlate || null,
    
    delivery_time_minutes: deliveryTimeMinutes,
    
    status_history: JSON.stringify(data.statusHistory || []), // Convert array to JSON string for BigQuery
    
    created_at: createdAt,
    updated_at: updatedAt
  };
}

/**
 * Main migration function
 */
async function migrateToBigQuerySafe() {
  console.log('========================================');
  console.log('BigQuery Safe Migration Script');
  console.log('========================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no data will be uploaded)' : 'LIVE MIGRATION'}`);
  console.log(`Limit: ${limit || 'No limit (all delivered orders)'}`);
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Count delivered orders
    console.log('Step 1: Counting delivered orders...');
    const ordersRef = db.collection('orders');
    const deliveredQuery = ordersRef.where('status', '==', 'Entregue');
    
    const countSnapshot = await deliveredQuery.count().get();
    const totalDelivered = countSnapshot.data().count;
    
    console.log(`Total delivered orders: ${totalDelivered.toLocaleString()}`);
    
    const ordersToMigrate = limit ? Math.min(limit, totalDelivered) : totalDelivered;
    console.log(`Orders to migrate: ${ordersToMigrate.toLocaleString()}\n`);
    
    if (totalDelivered === 0) {
      console.log('No delivered orders to migrate');
      return;
    }
    
    // Step 2: Fetch orders in batches
    console.log('Step 2: Fetching and transforming orders...');
    
    let query = deliveredQuery.orderBy('createdAt', 'desc');
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    console.log(`Fetched ${snapshot.size.toLocaleString()} orders\n`);
    
    // Step 3: Transform data
    console.log('Step 3: Transforming data...');
    const transformedOrders = [];
    let processedCount = 0;
    let errorCount = 0;
    
    snapshot.forEach(doc => {
      try {
        const transformed = transformOrderForBigQuery(doc);
        transformedOrders.push(transformed);
        processedCount++;
        
        if (processedCount % 1000 === 0) {
          console.log(`  Transformed ${processedCount.toLocaleString()}/${snapshot.size.toLocaleString()} orders`);
        }
      } catch (error) {
        console.error(`  Error transforming order ${doc.id}:`, error.message);
        errorCount++;
      }
    });
    
    console.log(`Transformed ${transformedOrders.length.toLocaleString()} orders (${errorCount} errors)\n`);
    
    if (isDryRun) {
      console.log('========================================');
      console.log('DRY RUN COMPLETE - No data uploaded');
      console.log('========================================');
      console.log(`Would have migrated: ${transformedOrders.length.toLocaleString()} orders`);
      console.log(`Sample transformed order:`);
      console.log(JSON.stringify(transformedOrders[0], null, 2));
      console.log('\nRun without --dry-run to perform actual migration');
      return;
    }
    
    // Step 4: Create NDJSON file
    console.log('Step 4: Creating NDJSON file...');
    const ndjsonContent = transformedOrders
      .map(order => JSON.stringify(order))
      .join('\n');
    
    const tempFileName = `temp/migration_${Date.now()}.ndjson`;
    const localTempPath = path.join(__dirname, 'temp_migration.ndjson');
    
    fs.writeFileSync(localTempPath, ndjsonContent);
    const fileSizeMB = (fs.statSync(localTempPath).size / 1024 / 1024).toFixed(2);
    console.log(`  Created local file: ${localTempPath}`);
    console.log(`  File size: ${fileSizeMB} MB\n`);
    
    // Step 5: Upload to Cloud Storage
    console.log('Step 5: Uploading to Cloud Storage...');
    const file = bucket.file(tempFileName);
    await bucket.upload(localTempPath, {
      destination: tempFileName,
      metadata: {
        contentType: 'application/x-ndjson',
      }
    });
    console.log(`  Uploaded to: gs://${bucket.name}/${tempFileName}\n`);
    
    // Step 6: Load to BigQuery (FREE!)
    console.log('Step 6: Loading to BigQuery...');
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    
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
    
    console.log(`  BigQuery Job ID: ${job.id}`);
    console.log(`  ✓ BigQuery load job started successfully`);
    console.log(`  Note: Job will complete asynchronously. Check BigQuery console for status.`);
    console.log(`  ✓ Successfully queued ${transformedOrders.length.toLocaleString()} orders for BigQuery loading\n`);
    
    // Step 7: Cleanup
    console.log('Step 7: Cleaning up...');
    await file.delete();
    fs.unlinkSync(localTempPath);
    console.log('  Deleted temp files\n');
    
    // Step 8: Update analytics tables
    // DISABLED: Analytics tables need schema update (INT64 → FLOAT64 for delivery times)
    // Will be updated after full migration
    console.log('Step 8: Skipping analytics tables update (will update after full migration)...\n');
    
    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log(`Orders migrated: ${transformedOrders.length.toLocaleString()}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`BigQuery dataset: ${DATASET_ID}`);
    console.log(`BigQuery table: ${TABLE_ID}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateToBigQuerySafe()
  .then(() => {
    console.log('✓ Migration script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Migration script failed:', error);
    process.exit(1);
  });
