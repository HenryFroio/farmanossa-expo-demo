/**
 * Migration Script: Firestore → BigQuery
 * 
 * Migrates:
 * 1. DeliveryRuns (completed) - for distance tracking
 * 2. Cancelled Orders - for cancellation statistics
 * 
 * Total deliveryRuns: 67,919
 * Estimated cancelled orders: ~5,000-10,000
 * 
 * Usage: node migrateDeliveryRuns.js [--dry-run] [--limit=1000] [--runs-only] [--orders-only]
 */

const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const runsOnly = args.includes('--runs-only');
const ordersOnly = args.includes('--orders-only');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const bigquery = new BigQuery({
  projectId: 'farmanossadelivery-76182',
  keyFilename: path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json')
});

// Configuration
const DATASET_ID = 'farmanossa_analytics';
const TABLE_ID = 'delivery_runs';
const BATCH_SIZE = 500;

/**
 * Create BigQuery table schema
 */
async function createTableIfNotExists() {
  const dataset = bigquery.dataset(DATASET_ID);
  const table = dataset.table(TABLE_ID);
  
  try {
    const [exists] = await table.exists();
    
    if (!exists) {
      console.log(`Creating table ${DATASET_ID}.${TABLE_ID}...`);
      
      const schema = [
        { name: 'run_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'deliveryman_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'motorcycle_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'pharmacy_unit_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'order_ids', type: 'STRING', mode: 'REPEATED' },
        { name: 'start_time', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'end_time', type: 'TIMESTAMP', mode: 'NULLABLE' },
        { name: 'total_distance', type: 'FLOAT', mode: 'REQUIRED' },
        { name: 'status', type: 'STRING', mode: 'REQUIRED' },
        { name: 'checkpoint_count', type: 'INTEGER', mode: 'NULLABLE' },
      ];
      
      const options = {
        schema: schema,
        location: 'US',
        timePartitioning: {
          type: 'DAY',
          field: 'start_time',
        },
      };
      
      await table.create(options);
      console.log(`✓ Table ${TABLE_ID} created successfully`);
    } else {
      console.log(`✓ Table ${DATASET_ID}.${TABLE_ID} already exists`);
    }
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

/**
 * Transform Firestore deliveryRun to BigQuery row
 */
function transformDeliveryRun(docId, data) {
  return {
    run_id: docId,
    deliveryman_id: data.deliverymanId || '',
    motorcycle_id: data.motorcycleId || null,
    pharmacy_unit_id: data.pharmacyUnitId || '',
    order_ids: data.orderIds || [],
    start_time: data.startTime?.toDate?.()?.toISOString() || null,
    end_time: data.endTime?.toDate?.()?.toISOString() || null,
    total_distance: data.totalDistance || 0,
    status: data.status || 'unknown',
    checkpoint_count: data.checkpoints?.length || 0,
  };
}

/**
 * Transform Firestore cancelled order to BigQuery row
 * (Uses the EXACT same schema as delivered orders - reuses transformOrderForBigQuery logic)
 */
function transformCancelledOrder(docId, data) {
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
  
  // Extract region from address
  const region = extractRegionFromAddress(data.address || '');
  
  // Parse timestamps
  const createdAt = data.createdAt?.toDate?.() || new Date(data.date || data.createdAt);
  const updatedAt = data.updatedAt?.toDate?.() || createdAt;
  const lastStatusUpdate = data.lastStatusUpdate?.toDate?.() || updatedAt;
  
  // Parse rating date
  let reviewDate = null;
  if (data.reviewDate) {
    reviewDate = data.reviewDate.toDate?.() || new Date(data.reviewDate);
  }
  
  // Parse location (JSON field)
  let location = null;
  if (data.location && typeof data.location === 'object') {
    location = data.location;
  }
  
  return {
    order_id: docId,
    order_number: data.orderId || data.originalOrderId || docId,
    customer_name: data.customerName || '',
    customer_phone: data.customerPhone || '',
    address: data.address || '',
    region: region,
    
    pharmacy_unit_id: data.pharmacyUnitId || '',
    delivery_man: data.deliveryMan || null,
    delivery_man_name: data.deliveryManName || null,
    
    status: data.status || 'Cancelado',
    price_number: parseFloat(data.priceNumber) || 0,
    rating: data.rating ? parseFloat(data.rating) : null,
    review_comment: data.reviewComment || null,
    review_date: reviewDate,
    review_requested: data.reviewRequested || null,
    
    items: JSON.stringify(items),
    item_count: itemCount,
    
    license_plate: data.licensePlate || null,
    
    delivery_time_minutes: null, // Cancelled orders have no delivery time
    
    status_history: JSON.stringify(data.statusHistory || []),
    
    location: location,
    
    created_at: createdAt,
    updated_at: updatedAt,
    last_status_update: lastStatusUpdate
  };
}

/**
 * Extract region from address string
 */
function extractRegionFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  
  try {
    const addressUpper = address.toUpperCase();
    
    const patterns = [
      /,\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+?)\s*,\s*BRAS[IÍ]LIA/,
      /,\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+?)\s*-\s*DF/,
      /,\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+?)\s*,\s*DF/,
      /Nr\.\s*:\s*\d+,\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/,
      /\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]{3,})\s*,\s*BRAS/
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
 * Insert batch to BigQuery delivery_runs table
 */
async function insertDeliveryRunsBatch(rows) {
  if (rows.length === 0) return;
  
  const dataset = bigquery.dataset(DATASET_ID);
  const table = dataset.table(TABLE_ID);
  
  try {
    await table.insert(rows, {
      skipInvalidRows: false,
      ignoreUnknownValues: false,
    });
  } catch (error) {
    if (error.name === 'PartialFailureError') {
      console.error('❌ Some deliveryRuns failed to insert:');
      error.errors.forEach((err, index) => {
        console.error(`Row ${index}:`, JSON.stringify(err.row), err.errors);
      });
      throw error;
    }
    throw error;
  }
}

/**
 * Insert batch to BigQuery orders table
 */
async function insertOrdersBatch(rows) {
  if (rows.length === 0) return;
  
  const dataset = bigquery.dataset(DATASET_ID);
  const ordersTable = dataset.table('orders'); // Existing orders table
  
  try {
    await ordersTable.insert(rows, {
      skipInvalidRows: false,
      ignoreUnknownValues: false,
    });
  } catch (error) {
    if (error.name === 'PartialFailureError') {
      console.error('❌ Some cancelled orders failed to insert:');
      error.errors.forEach((err, index) => {
        console.error(`Row ${index}:`, JSON.stringify(err.row), err.errors);
      });
      throw error;
    }
    throw error;
  }
}

/**
 * Main migration function - DeliveryRuns
 */
async function migrateDeliveryRuns() {
  console.log('📦 Migrating DeliveryRuns...\n');

  const startTime = Date.now();
  
  try {
    // Create table if not exists
    if (!isDryRun) {
      await createTableIfNotExists();
    }
    
    // Query deliveryRuns
    console.log('📊 Querying deliveryRuns collection...');
    let query = db.collection('deliveryRuns');
    
    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    const totalRuns = snapshot.size;
    
    console.log(`✓ Found ${totalRuns} delivery runs\n`);
    
    if (totalRuns === 0) {
      console.log('⚠ No delivery runs to migrate');
      return { total: 0, success: 0, errors: 0, duration: 0 };
    }
    
    // Process in batches
    let batch = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const transformed = transformDeliveryRun(doc.id, data);
        
        // Validate required fields
        if (!transformed.run_id || !transformed.deliveryman_id || !transformed.start_time) {
          console.warn(`⚠ Skipping run ${doc.id}: missing required fields`);
          errorCount++;
          continue;
        }
        
        batch.push(transformed);
        successCount++;
        
        // Insert batch when reaches BATCH_SIZE
        if (batch.length >= BATCH_SIZE && !isDryRun) {
          await insertDeliveryRunsBatch(batch);
          console.log(`✓ Inserted ${batch.length} delivery runs`);
          batch = [];
        }
        
      } catch (error) {
        console.error(`❌ Error processing run ${doc.id}:`, error.message);
        errorCount++;
      }
      
      processedCount++;
      
      // Progress indicator
      if (processedCount % 1000 === 0) {
        console.log(`Progress: ${processedCount}/${totalRuns} runs processed`);
      }
    }
    
    // Insert remaining batch
    if (batch.length > 0 && !isDryRun) {
      await insertDeliveryRunsBatch(batch);
      console.log(`✓ Inserted final batch of ${batch.length} delivery runs`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return { total: totalRuns, success: successCount, errors: errorCount, duration };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Main migration function - Cancelled Orders
 */
async function migrateCancelledOrders() {
  console.log('\n� Migrating Cancelled Orders...\n');

  const startTime = Date.now();
  
  try {
    // Query cancelled orders
    console.log('📊 Querying cancelled orders...');
    let query = db.collection('orders').where('status', '==', 'Cancelado');
    
    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    const totalOrders = snapshot.size;
    
    console.log(`✓ Found ${totalOrders} cancelled orders\n`);
    
    if (totalOrders === 0) {
      console.log('⚠ No cancelled orders to migrate');
      return { total: 0, success: 0, errors: 0, duration: 0 };
    }
    
    // Process in batches
    let batch = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const transformed = transformCancelledOrder(doc.id, data);
        
        // Validate required fields
        if (!transformed.order_id || !transformed.pharmacy_unit_id) {
          console.warn(`⚠ Skipping order ${doc.id}: missing required fields`);
          errorCount++;
          continue;
        }
        
        batch.push(transformed);
        successCount++;
        
        // Insert batch when reaches BATCH_SIZE
        if (batch.length >= BATCH_SIZE && !isDryRun) {
          await insertOrdersBatch(batch);
          console.log(`✓ Inserted ${batch.length} cancelled orders`);
          batch = [];
        }
        
      } catch (error) {
        console.error(`❌ Error processing order ${doc.id}:`, error.message);
        errorCount++;
      }
      
      processedCount++;
      
      // Progress indicator
      if (processedCount % 1000 === 0) {
        console.log(`Progress: ${processedCount}/${totalOrders} orders processed`);
      }
    }
    
    // Insert remaining batch
    if (batch.length > 0 && !isDryRun) {
      await insertOrdersBatch(batch);
      console.log(`✓ Inserted final batch of ${batch.length} cancelled orders`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return { total: totalOrders, success: successCount, errors: errorCount, duration };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
    
/**
 * Main runner - orchestrates both migrations
 */
async function runMigration() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('    Firestore → BigQuery Migration');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  if (limit) console.log(`Limit: ${limit} documents per collection`);
  if (runsOnly) console.log('Scope: DeliveryRuns ONLY');
  if (ordersOnly) console.log('Scope: Cancelled Orders ONLY');
  console.log('════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  
  try {
    let runsResult = null;
    let ordersResult = null;
    
    // Migrate DeliveryRuns
    if (!ordersOnly) {
      runsResult = await migrateDeliveryRuns();
    }
    
    // Migrate Cancelled Orders
    if (!runsOnly) {
      ordersResult = await migrateCancelledOrders();
    }
    
    // Summary
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('Migration Complete!');
    console.log('════════════════════════════════════════════════════════════');
    
    if (runsResult) {
      console.log('\n📦 DeliveryRuns:');
      console.log(`  Total:      ${runsResult.total}`);
      console.log(`  Migrated:   ${runsResult.success}`);
      console.log(`  Errors:     ${runsResult.errors}`);
      console.log(`  Duration:   ${runsResult.duration}s`);
    }
    
    if (ordersResult) {
      console.log('\n📦 Cancelled Orders:');
      console.log(`  Total:      ${ordersResult.total}`);
      console.log(`  Migrated:   ${ordersResult.success}`);
      console.log(`  Errors:     ${ordersResult.errors}`);
      console.log(`  Duration:   ${ordersResult.duration}s`);
    }
    
    console.log(`\nTotal Duration:  ${totalDuration}s`);
    console.log(`Mode:            ${isDryRun ? 'DRY RUN (no data inserted)' : 'LIVE'}`);
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Verification queries
    if (!isDryRun) {
      console.log('Verifying data in BigQuery...\n');
      
      if (runsResult && runsResult.success > 0) {
        const [runsStats] = await bigquery.query({
          query: `
            SELECT 
              COUNT(*) as total_runs,
              COUNT(DISTINCT deliveryman_id) as unique_deliverymen,
              SUM(total_distance) as total_distance_km,
              AVG(total_distance) as avg_distance_km
            FROM \`${DATASET_ID}.${TABLE_ID}\`
          `,
          location: 'US',
        });
        
        console.log('📊 DeliveryRuns Statistics:');
        console.log(`  Total Runs:          ${runsStats[0].total_runs}`);
        console.log(`  Unique Deliverymen:  ${runsStats[0].unique_deliverymen}`);
        console.log(`  Total Distance:      ${runsStats[0].total_distance_km.toFixed(2)} km`);
        console.log(`  Avg Distance/Run:    ${runsStats[0].avg_distance_km.toFixed(2)} km\n`);
      }
      
      if (ordersResult && ordersResult.success > 0) {
        const [ordersStats] = await bigquery.query({
          query: `
            SELECT 
              COUNT(*) as total_cancelled,
              COUNT(DISTINCT pharmacy_unit_id) as unique_units
            FROM \`${DATASET_ID}.orders\`
            WHERE status = 'Cancelado'
          `,
          location: 'US',
        });
        
        console.log('📊 Cancelled Orders Statistics:');
        console.log(`  Total Cancelled:     ${ordersStats[0].total_cancelled}`);
        console.log(`  Unique Units:        ${ordersStats[0].unique_units}\n`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✓ Migration script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Migration script failed:', error);
    process.exit(1);
  });
