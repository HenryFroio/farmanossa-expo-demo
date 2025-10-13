/**
 * BigQuery Batch Sync for DeliveryRuns
 * 
 * Triggered every 5 minutes by Cloud Scheduler (same as orders)
 * Processes bigquery_delivery_runs_sync_queue and syncs completed runs to BigQuery
 * 
 * Architecture:
 * 1. Read unprocessed items from bigquery_delivery_runs_sync_queue
 * 2. Fetch deliveryRun data from Firestore
 * 3. Transform data
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
const TABLE_ID = 'delivery_runs';
const BATCH_SIZE = 100; // Process up to 100 runs per execution

/**
 * Transform Firestore deliveryRun to BigQuery schema
 */
function transformDeliveryRunForBigQuery(doc) {
  const data = doc.data();
  const id = doc.id;
  
  // Parse timestamps
  const startTime = data.startTime?.toDate?.() || new Date(data.startTime);
  const endTime = data.endTime?.toDate?.() || null;
  
  return {
    run_id: id,
    deliveryman_id: data.deliverymanId || '',
    motorcycle_id: data.motorcycleId || null,
    pharmacy_unit_id: data.pharmacyUnitId || '',
    order_ids: data.orderIds || [],
    start_time: startTime,
    end_time: endTime,
    total_distance: parseFloat(data.totalDistance) || 0,
    status: data.status || '',
    checkpoint_count: data.checkpoints?.length || 0,
  };
}

/**
 * Sync completed delivery runs to BigQuery
 */
exports.syncDeliveryRunsToBigQuery = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  .pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const startTime = Date.now();
    console.log('🏍️ Starting delivery runs sync to BigQuery');
    
    try {
      // Step 1: Read unprocessed items from queue
      const queueSnapshot = await db.collection('bigquery_delivery_runs_sync_queue')
        .where('processed', '==', false)
        .orderBy('queuedAt', 'asc')
        .limit(BATCH_SIZE)
        .get();
      
      if (queueSnapshot.empty) {
        console.log('No delivery runs to sync');
        return null;
      }
      
      console.log(`Found ${queueSnapshot.size} delivery runs in queue`);
      
      // Step 2: Fetch deliveryRun data from Firestore
      const runIds = queueSnapshot.docs.map(doc => doc.data().runId);
      const runDocs = await Promise.all(
        runIds.map(id => db.collection('deliveryRuns').doc(id).get())
      );
      
      // Filter out non-existent or non-completed runs
      const completedRuns = runDocs.filter(doc => {
        if (!doc.exists) {
          console.warn(`Run ${doc.id} not found in Firestore`);
          return false;
        }
        const data = doc.data();
        if (data.status !== 'completed') {
          console.warn(`Run ${doc.id} status is ${data.status}, expected 'completed'`);
          return false;
        }
        return true;
      });
      
      if (completedRuns.length === 0) {
        console.warn('No valid completed runs found, cleaning queue');
        // Delete invalid queue items
        const batch = db.batch();
        queueSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`  Deleted ${queueSnapshot.size} invalid items from queue`);
        return null;
      }
      
      console.log(`Processing ${completedRuns.length} completed delivery runs`);
      
      // Step 3: Transform data
      const transformedRuns = completedRuns.map(transformDeliveryRunForBigQuery);
      
      // Step 4: Create NDJSON file
      const tempFilePath = path.join(os.tmpdir(), `delivery_runs_sync_${Date.now()}.ndjson`);
      const ndjsonContent = transformedRuns.map(run => JSON.stringify(run)).join('\n');
      fs.writeFileSync(tempFilePath, ndjsonContent);
      
      console.log(`Created NDJSON file: ${(fs.statSync(tempFilePath).size / 1024).toFixed(2)} KB`);
      
      // Step 5: Upload to Cloud Storage
      const bucket = storage.bucket(BUCKET_NAME);
      const gcsFileName = `delivery_runs_sync/sync_${Date.now()}.ndjson`;
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
            { name: 'run_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'deliveryman_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'motorcycle_id', type: 'STRING', mode: 'NULLABLE' },
            { name: 'pharmacy_unit_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'order_ids', type: 'STRING', mode: 'REPEATED' },
            { name: 'start_time', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'end_time', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'total_distance', type: 'FLOAT64', mode: 'REQUIRED' },
            { name: 'status', type: 'STRING', mode: 'REQUIRED' },
            { name: 'checkpoint_count', type: 'INT64', mode: 'NULLABLE' },
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
      console.log(`✓ DeliveryRuns sync complete! ${completedRuns.length} runs synced in ${duration}s`);
      
      return null;
      
    } catch (error) {
      console.error('❌ DeliveryRuns batch sync failed:', error);
      throw error;
    }
  });
