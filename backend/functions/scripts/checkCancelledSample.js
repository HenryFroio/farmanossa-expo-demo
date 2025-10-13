/**
 * Check sample cancelled order
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://farmanossadelivery-76182.firebaseio.com'
});

const db = admin.firestore();

async function checkCancelledSample() {
  console.log('Checking sample cancelled order...\n');
  
  const snapshot = await db.collection('orders')
    .where('status', '==', 'Cancelado')
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    console.log('No cancelled orders found');
    return;
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  console.log(`Document ID: ${doc.id}`);
  console.log(`Status: ${data.status}`);
  console.log('\nFull document structure:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n\nField list:');
  Object.keys(data).sort().forEach(key => {
    const value = data[key];
    const type = Array.isArray(value) ? 'Array' : typeof value;
    console.log(`  ${key}: ${type}`);
  });
  
  process.exit(0);
}

checkCancelledSample().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
