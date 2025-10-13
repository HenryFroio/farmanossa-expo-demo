/**
 * Firestore Schema Inspector
 * Inspects Firestore collections to understand data structure before migration
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectCollection(collectionName, sampleSize = 3) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Collection: ${collectionName}`);
  console.log('='.repeat(60));
  
  try {
    // Get collection reference
    const collectionRef = db.collection(collectionName);
    
    // Get total count
    const snapshot = await collectionRef.count().get();
    const totalDocs = snapshot.data().count;
    console.log(`\nTotal documents: ${totalDocs}`);
    
    if (totalDocs === 0) {
      console.log('Collection is empty');
      return;
    }
    
    // Get sample documents
    const sampleSnapshot = await collectionRef.limit(sampleSize).get();
    
    console.log(`\nSample documents (showing ${sampleSnapshot.size}):\n`);
    
    sampleSnapshot.forEach((doc, index) => {
      console.log(`--- Document ${index + 1}: ${doc.id} ---`);
      const data = doc.data();
      
      // Print field names and types
      Object.keys(data).forEach(key => {
        const value = data[key];
        let type = typeof value;
        
        if (value === null) {
          type = 'null';
        } else if (value?.toDate) {
          type = 'Timestamp';
        } else if (Array.isArray(value)) {
          type = `Array[${value.length}]`;
        } else if (type === 'object') {
          type = 'Object';
        }
        
        // Show sample value
        let sampleValue = '';
        if (type === 'string' && value.length > 50) {
          sampleValue = value.substring(0, 50) + '...';
        } else if (type === 'Timestamp') {
          sampleValue = value.toDate().toISOString();
        } else if (Array.isArray(value)) {
          sampleValue = JSON.stringify(value.slice(0, 2)) + (value.length > 2 ? '...' : '');
        } else if (type === 'Object') {
          sampleValue = JSON.stringify(value).substring(0, 100) + '...';
        } else {
          sampleValue = String(value);
        }
        
        console.log(`  ${key}: ${type} = ${sampleValue}`);
      });
      console.log('');
    });
    
    // Get field statistics
    console.log('Field Statistics (from sample):');
    const fieldStats = {};
    
    sampleSnapshot.forEach(doc => {
      const data = doc.data();
      Object.keys(data).forEach(key => {
        if (!fieldStats[key]) {
          fieldStats[key] = { count: 0, types: new Set() };
        }
        fieldStats[key].count++;
        
        const value = data[key];
        if (value === null) {
          fieldStats[key].types.add('null');
        } else if (value?.toDate) {
          fieldStats[key].types.add('Timestamp');
        } else if (Array.isArray(value)) {
          fieldStats[key].types.add('Array');
        } else {
          fieldStats[key].types.add(typeof value);
        }
      });
    });
    
    Object.keys(fieldStats).sort().forEach(key => {
      const stat = fieldStats[key];
      const presence = ((stat.count / sampleSnapshot.size) * 100).toFixed(0);
      const types = Array.from(stat.types).join(' | ');
      console.log(`  ${key}: ${presence}% present, types: ${types}`);
    });
    
  } catch (error) {
    console.error(`Error inspecting ${collectionName}:`, error.message);
  }
}

async function inspectFirestore() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('         Firestore Schema Inspector');
  console.log('         Project: farmanossadelivery-76182');
  console.log('════════════════════════════════════════════════════════════');
  
  const collections = [
    'orders',
    'deliverymen',
    'pharmacyUnits',
    'deliveryRuns'
  ];
  
  for (const collectionName of collections) {
    await inspectCollection(collectionName, 5);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('Inspection Complete!');
  console.log('='.repeat(60));
  console.log('\nReady to proceed with migration.\n');
}

// Run inspection
inspectFirestore()
  .then(() => {
    console.log('✓ Schema inspection completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Schema inspection failed:', error);
    process.exit(1);
  });
