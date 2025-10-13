/**
 * Quick script to count cancelled orders in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://farmanossadelivery-76182.firebaseio.com'
});

const db = admin.firestore();

async function countCancelledOrders() {
  console.log('Counting cancelled orders...\n');
  
  const snapshot = await db.collection('orders')
    .where('status', '==', 'Cancelado')
    .count()
    .get();
  
  const count = snapshot.data().count;
  
  console.log(`Total Cancelled Orders: ${count}\n`);
  
  // Get sample
  const sampleSnapshot = await db.collection('orders')
    .where('status', '==', 'Cancelado')
    .limit(3)
    .get();
  
  console.log('Sample cancelled orders:');
  sampleSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ${doc.id}: ${data.customerName} | ${data.pharmacyUnitId} | ${data.createdAt?.toDate()}`);
  });
  
  process.exit(0);
}

countCancelledOrders().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
