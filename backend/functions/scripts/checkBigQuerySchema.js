/**
 * Check BigQuery table schema
 */

const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');

const bigquery = new BigQuery({
  projectId: 'farmanossadelivery-76182',
  keyFilename: serviceAccountPath
});

async function checkSchema() {
  console.log('Checking BigQuery orders table schema...\n');
  
  const dataset = bigquery.dataset('farmanossa_analytics');
  const table = dataset.table('orders');
  
  const [metadata] = await table.getMetadata();
  
  console.log('ORDERS TABLE SCHEMA:');
  console.log('════════════════════════════════════════════════════════════\n');
  
  metadata.schema.fields.forEach(field => {
    console.log(`${field.name.padEnd(30)} ${field.type.padEnd(12)} ${field.mode || 'NULLABLE'}`);
  });
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`Total fields: ${metadata.schema.fields.length}\n`);
  
  process.exit(0);
}

checkSchema().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
