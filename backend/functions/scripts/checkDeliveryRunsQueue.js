/**
 * Check BigQuery Delivery Runs Sync Queue Status
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkQueue() {
  console.log('🔍 Checking delivery_runs sync queue...\n');
  
  try {
    // Check queue
    const queueSnapshot = await db.collection('bigquery_delivery_runs_sync_queue')
      .orderBy('queuedAt', 'desc')
      .limit(20)
      .get();
    
    console.log(`📊 Queue Status:`);
    console.log(`   Total items (last 20): ${queueSnapshot.size}`);
    
    const processed = queueSnapshot.docs.filter(doc => doc.data().processed === true).length;
    const unprocessed = queueSnapshot.docs.filter(doc => doc.data().processed === false).length;
    
    console.log(`   ✓ Processed: ${processed}`);
    console.log(`   ⏳ Unprocessed: ${unprocessed}\n`);
    
    // Show unprocessed items
    const unprocessedDocs = queueSnapshot.docs.filter(doc => doc.data().processed === false);
    if (unprocessedDocs.length > 0) {
      console.log('⏳ Unprocessed Items:');
      unprocessedDocs.forEach((doc, index) => {
        const data = doc.data();
        const queuedAt = data.queuedAt?.toDate?.() || 'Unknown';
        console.log(`   ${index + 1}. Run ID: ${data.runId}`);
        console.log(`      Queued at: ${queuedAt}`);
        console.log(`      Retries: ${data.retries || 0}\n`);
      });
    }
    
    // Check if runs exist in Firestore
    if (unprocessedDocs.length > 0) {
      console.log('🔍 Checking if runs exist in Firestore...\n');
      
      for (const queueDoc of unprocessedDocs.slice(0, 5)) { // Check first 5
        const runId = queueDoc.data().runId;
        const runDoc = await db.collection('deliveryRuns').doc(runId).get();
        
        if (!runDoc.exists) {
          console.log(`   ❌ Run ${runId}: NOT FOUND in Firestore`);
        } else {
          const runData = runDoc.data();
          console.log(`   ✓ Run ${runId}:`);
          console.log(`      Status: ${runData.status}`);
          console.log(`      Deliveryman: ${runData.deliverymanId}`);
          console.log(`      Orders: ${runData.orderIds?.length || 0}`);
          console.log(`      Start: ${runData.startTime?.toDate?.()}`);
          console.log(`      End: ${runData.endTime?.toDate?.() || 'N/A'}`);
        }
        console.log('');
      }
    }
    
    // Check total queue count
    const totalQueueSnapshot = await db.collection('bigquery_delivery_runs_sync_queue')
      .where('processed', '==', false)
      .get();
    
    console.log(`\n📊 Total Unprocessed in Queue: ${totalQueueSnapshot.size}`);
    
    // Check recent completed runs NOT in queue
    console.log('\n🔍 Checking recent completed runs...\n');
    const completedRunsSnapshot = await db.collection('deliveryRuns')
      .where('status', '==', 'completed')
      .orderBy('endTime', 'desc')
      .limit(10)
      .get();
    
    console.log(`Found ${completedRunsSnapshot.size} recent completed runs\n`);
    
    for (const runDoc of completedRunsSnapshot.docs) {
      const runId = runDoc.id;
      const runData = runDoc.data();
      
      // Check if in queue
      const inQueue = await db.collection('bigquery_delivery_runs_sync_queue')
        .where('runId', '==', runId)
        .limit(1)
        .get();
      
      const status = inQueue.empty ? '❌ NOT IN QUEUE' : '✓ In queue';
      console.log(`   ${status} - Run ${runId}`);
      console.log(`      End time: ${runData.endTime?.toDate?.()}`);
      console.log(`      Orders: ${runData.orderIds?.length || 0}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkQueue();
