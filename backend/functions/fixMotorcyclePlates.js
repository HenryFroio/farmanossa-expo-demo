/**
 * One-time script to fix motorcycle IDs to actual plates in BigQuery
 * Run manually: node fixMotorcyclePlates.js
 */

const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');

// Initialize Firebase Admin
const serviceAccount = require('../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const bigquery = new BigQuery({
  projectId: 'farmanossadelivery-76182',
  keyFilename: '../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json'
});
const DATASET_ID = 'farmanossa_analytics';
const TABLE_ID = 'orders';

async function getMotorcyclePlates() {
  console.log('📋 Fetching motorcycles from Firestore...');
  const motorcyclesSnapshot = await db.collection('motorcycles').get();
  
  const motorcycleMap = {};
  motorcyclesSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.plate) {
      motorcycleMap[doc.id] = data.plate;
    }
  });
  
  console.log(`✅ Found ${Object.keys(motorcycleMap).length} motorcycles with plates`);
  return motorcycleMap;
}

async function updateBigQueryPlates(motorcycleMap) {
  console.log('\n🔄 Updating BigQuery with actual plates (October 2025 only)...');
  
  const updates = [];
  
  for (const [motorcycleId, plate] of Object.entries(motorcycleMap)) {
    const query = `
      UPDATE \`farmanossadelivery-76182.${DATASET_ID}.${TABLE_ID}\`
      SET license_plate = @plate
      WHERE license_plate = @motorcycleId
        AND DATE(created_at, 'America/Sao_Paulo') >= '2025-10-01'
        AND DATE(created_at, 'America/Sao_Paulo') < '2025-11-01'
    `;
    
    const options = {
      query: query,
      params: {
        plate: plate,
        motorcycleId: motorcycleId
      }
    };
    
    try {
      const [job] = await bigquery.createQueryJob(options);
      const [rows] = await job.getQueryResults();
      
      // Get affected rows count from job metadata
      const [metadata] = await job.getMetadata();
      const affectedRows = parseInt(metadata?.statistics?.query?.numDmlAffectedRows || '0');
      
      if (affectedRows > 0) {
        console.log(`  ✅ ${motorcycleId} → ${plate}: ${affectedRows} rows updated`);
        updates.push({ motorcycleId, plate, count: affectedRows });
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${motorcycleId}:`, error.message);
    }
  }
  
  return updates;
}

async function verifyUpdates() {
  console.log('\n🔍 Verifying updates (October 2025 only)...');
  
  const query = `
    SELECT DISTINCT license_plate, COUNT(*) as count
    FROM \`farmanossadelivery-76182.${DATASET_ID}.${TABLE_ID}\`
    WHERE license_plate IS NOT NULL 
      AND license_plate != ''
      AND DATE(created_at, 'America/Sao_Paulo') >= '2025-10-01'
      AND DATE(created_at, 'America/Sao_Paulo') < '2025-11-01'
    GROUP BY license_plate
    ORDER BY license_plate
  `;
  
  const [rows] = await bigquery.query(query);
  
  console.log('\n📊 Current plates in BigQuery (October 2025):');
  let idCount = 0;
  let plateCount = 0;
  
  rows.forEach(row => {
    const isId = row.license_plate.match(/^M\d{3}$/);
    if (isId) {
      console.log(`  ⚠️  ID: ${row.license_plate} (${row.count} orders)`);
      idCount += row.count;
    } else {
      console.log(`  ✅ PLATE: ${row.license_plate} (${row.count} orders)`);
      plateCount += row.count;
    }
  });
  
  console.log(`\n📈 Summary:`);
  console.log(`  Orders with IDs: ${idCount}`);
  console.log(`  Orders with Plates: ${plateCount}`);
}

async function main() {
  try {
    console.log('🏍️  Starting motorcycle plate fix...\n');
    
    // Step 1: Get motorcycle plates from Firestore
    const motorcycleMap = await getMotorcyclePlates();
    
    // Step 2: Update BigQuery
    const updates = await updateBigQueryPlates(motorcycleMap);
    
    // Step 3: Verify
    await verifyUpdates();
    
    console.log('\n✅ Done!');
    console.log(`\nSummary: Updated ${updates.length} motorcycle IDs to plates`);
    console.log('Total affected orders:', updates.reduce((sum, u) => sum + u.count, 0));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
