/**
 * Check BigQuery Sync Queue
 * Verifica quantos pedidos estão na fila esperando para serem sincronizados
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkQueue() {
  console.log('========================================');
  console.log('BigQuery Sync Queue Status');
  console.log('========================================\n');

  try {
    // Count total items in queue
    const queueSnapshot = await db.collection('bigquery_sync_queue').get();
    const totalInQueue = queueSnapshot.size;

    console.log(`Total items in queue: ${totalInQueue}`);

    if (totalInQueue > 0) {
      // Count processed vs unprocessed
      const unprocessedSnapshot = await db.collection('bigquery_sync_queue')
        .where('processed', '==', false)
        .get();
      
      const processedSnapshot = await db.collection('bigquery_sync_queue')
        .where('processed', '==', true)
        .get();

      console.log(`  Unprocessed: ${unprocessedSnapshot.size}`);
      console.log(`  Processed: ${processedSnapshot.size}`);

      // Show sample of unprocessed items
      if (unprocessedSnapshot.size > 0) {
        console.log('\nSample unprocessed items (first 5):');
        unprocessedSnapshot.docs.slice(0, 5).forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. Order ID: ${data.orderId}, Queued: ${data.queuedAt?.toDate?.() || data.queuedAt}`);
        });
      }
    } else {
      console.log('✓ Queue is empty - no pending sync items\n');
    }

    console.log('\n========================================\n');
    process.exit(0);

  } catch (error) {
    console.error('Error checking queue:', error);
    process.exit(1);
  }
}

checkQueue();
