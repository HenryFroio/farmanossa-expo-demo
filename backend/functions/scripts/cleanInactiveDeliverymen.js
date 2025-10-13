/**
 * One-time cleanup script: Remove inactive deliverymen from BigQuery
 * 
 * This script queries Firestore for all deliverymen with status='inactive' or deleted=true
 * and removes them from the BigQuery analytics table.
 * 
 * Run once to clean historical data, then sync happens automatically via useEmployees hook.
 * 
 * Usage: node scripts/cleanInactiveDeliverymen.js
 */

const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();
const bigquery = new BigQuery({
  projectId: 'farmanossadelivery-76182',
  keyFilename: serviceAccountPath
});
const DATASET_ID = 'farmanossa_analytics';

async function cleanInactiveDeliverymen() {
  console.log('🔍 Starting cleanup of inactive deliverymen from BigQuery...\n');

  try {
    // Step 1: Query Firestore for inactive/deleted deliverymen
    const deliverymenSnapshot = await firestore.collection('deliverymen').get();
    
    const inactiveIds = [];
    const activeIds = [];
    
    deliverymenSnapshot.forEach(doc => {
      const data = doc.data();
      const isInactive = data.status === 'inactive' || data.deleted === true;
      
      if (isInactive) {
        inactiveIds.push(data.id);
      } else {
        activeIds.push(data.id);
      }
    });

    console.log(`📊 Firestore Analysis:`);
    console.log(`   Total deliverymen: ${deliverymenSnapshot.size}`);
    console.log(`   Active: ${activeIds.length}`);
    console.log(`   Inactive: ${inactiveIds.length}\n`);

    if (inactiveIds.length === 0) {
      console.log('✅ No inactive deliverymen found. Nothing to clean.');
      return;
    }

    console.log(`🗑️  Inactive deliverymen to remove from BigQuery:`);
    inactiveIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    console.log('');

    // Step 2: Query BigQuery to see current state
    const bigQueryCheckQuery = `
      SELECT delivery_man_id, name
      FROM \`farmanossadelivery-76182.${DATASET_ID}.deliverymen\`
      WHERE delivery_man_id IN (${inactiveIds.map(id => `'${id}'`).join(', ')})
      ORDER BY delivery_man_id
    `;

    const [existingInBigQuery] = await bigquery.query({
      query: bigQueryCheckQuery,
      location: 'southamerica-east1'
    });

    console.log(`📍 BigQuery Analysis:`);
    console.log(`   Found ${existingInBigQuery.length} inactive deliverymen in BigQuery\n`);

    if (existingInBigQuery.length === 0) {
      console.log('✅ BigQuery is already clean. No deletions needed.');
      return;
    }

    console.log(`🔧 Preparing to delete ${existingInBigQuery.length} records from BigQuery...\n`);

    // Step 3: Delete inactive deliverymen from BigQuery
    const deleteQuery = `
      DELETE FROM \`farmanossadelivery-76182.${DATASET_ID}.deliverymen\`
      WHERE delivery_man_id IN (${inactiveIds.map(id => `'${id}'`).join(', ')})
    `;

    console.log('⏳ Executing BigQuery DELETE statement...');
    
    const [job] = await bigquery.query({
      query: deleteQuery,
      location: 'southamerica-east1'
    });

    console.log('✅ DELETE completed successfully!\n');

    // Step 4: Verify cleanup
    const verifyQuery = `
      SELECT COUNT(*) as remaining_inactive
      FROM \`farmanossadelivery-76182.${DATASET_ID}.deliverymen\`
      WHERE delivery_man_id IN (${inactiveIds.map(id => `'${id}'`).join(', ')})
    `;

    const [verifyResult] = await bigquery.query({
      query: verifyQuery,
      location: 'southamerica-east1'
    });

    const remainingInactive = verifyResult[0].remaining_inactive;

    console.log('🔍 Verification:');
    console.log(`   Inactive deliverymen remaining in BigQuery: ${remainingInactive}`);
    
    if (remainingInactive === 0) {
      console.log('\n✅✅✅ SUCCESS! BigQuery cleanup completed successfully!');
      console.log(`\nRemoved ${existingInBigQuery.length} inactive deliverymen from analytics.`);
      console.log(`BigQuery now contains only ${activeIds.length} active deliverymen.\n`);
    } else {
      console.log('\n⚠️  Warning: Some inactive deliverymen still remain in BigQuery.');
      console.log('   Please check the logs and retry if needed.\n');
    }

    // Step 5: Summary
    console.log('📋 Summary:');
    console.log(`   Firestore active deliverymen: ${activeIds.length}`);
    console.log(`   BigQuery deliverymen after cleanup: ${activeIds.length}`);
    console.log(`   Deleted from BigQuery: ${existingInBigQuery.length}`);
    console.log('\n🎯 Future deletions will be handled automatically via useEmployees hook.\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanInactiveDeliverymen()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
