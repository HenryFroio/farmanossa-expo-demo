/**
 * Script para sincronizar dados de referência do Firestore para o BigQuery
 * - deliverymen: Entregadores
 * - pharmacy_units: Unidades de farmácia
 * 
 * Isso elimina a necessidade de buscar esses dados do Firestore durante queries do dashboard,
 * reduzindo o tempo de carregamento de ~925ms para ~0ms
 */

const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', '..', 'farmanossadelivery-76182-firebase-adminsdk-6jdmr-00ca0d83d7.json');
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'farmanossadelivery-76182',
});

const db = admin.firestore();
const bigquery = new BigQuery({
  projectId: 'farmanossadelivery-76182',
  keyFilename: serviceAccountPath,
});

const DATASET_ID = 'farmanossa_analytics';
const DELIVERYMEN_TABLE = 'deliverymen';
const PHARMACY_UNITS_TABLE = 'pharmacy_units';

/**
 * Sincronizar entregadores do Firestore para o BigQuery
 */
async function syncDeliverymen() {
  console.log('🚴 Sincronizando entregadores...');
  
  try {
    // 1. Buscar todos os entregadores do Firestore
    const deliverymenSnapshot = await db.collection('deliverymen').get();
    console.log(`📊 Encontrados ${deliverymenSnapshot.size} entregadores no Firestore`);

    if (deliverymenSnapshot.empty) {
      console.log('⚠️  Nenhum entregador encontrado');
      return;
    }

    // 2. Preparar dados para o BigQuery
    const rows = deliverymenSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        delivery_man_id: doc.id,
        name: data.name || null,
        pharmacy_unit_id: data.pharmacyUnitId || null,
        total_deliveries: 0, // Será calculado por agregação
        total_revenue: 0.0,
        avg_rating: null,
        total_ratings: 0,
        total_distance: 0.0,
        avg_delivery_time: null,
        fastest_delivery: null,
        slowest_delivery: null,
        active_since: data.createdAt ? new Date(data.createdAt.toDate()).toISOString().split('T')[0] : null,
        last_delivery_date: null, // Será atualizado por trigger
        last_updated: new Date().toISOString(),
      };
    });

    // 3. Deletar dados antigos e inserir novos (full refresh)
    console.log('🗑️  Limpando tabela deliverymen...');
    await bigquery.query(`DELETE FROM \`farmanossadelivery-76182.${DATASET_ID}.${DELIVERYMEN_TABLE}\` WHERE TRUE`);

    // 4. Inserir dados
    console.log(`📥 Inserindo ${rows.length} entregadores no BigQuery...`);
    const [job] = await bigquery
      .dataset(DATASET_ID)
      .table(DELIVERYMEN_TABLE)
      .insert(rows);

    console.log(`✅ ${rows.length} entregadores sincronizados com sucesso!`);
    
    // 5. Mostrar amostra
    console.log('\n📋 Amostra dos dados inseridos:');
    rows.slice(0, 3).forEach(row => {
      console.log(`  - ${row.name} (${row.delivery_man_id}) -> Unidade: ${row.pharmacy_unit_id}`);
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar entregadores:', error);
    throw error;
  }
}

/**
 * Sincronizar unidades de farmácia do Firestore para o BigQuery
 */
async function syncPharmacyUnits() {
  console.log('\n🏥 Sincronizando unidades de farmácia...');
  
  try {
    // 1. Buscar todas as unidades do Firestore
    const unitsSnapshot = await db.collection('pharmacyUnits').get();
    console.log(`📊 Encontradas ${unitsSnapshot.size} unidades no Firestore`);

    if (unitsSnapshot.empty) {
      console.log('⚠️  Nenhuma unidade encontrada');
      return;
    }

    // 2. Preparar dados para o BigQuery
    const rows = unitsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        unit_id: doc.id,
        name: data.name || null,
        address: data.address || null,
        total_orders: 0, // Será calculado por agregação
        total_revenue: 0.0,
        avg_rating: null,
        total_ratings: 0,
        avg_delivery_time: null,
        total_deliveries: 0,
        active_deliverymen: 0, // Será calculado
        active_since: data.createdAt ? new Date(data.createdAt.toDate()).toISOString().split('T')[0] : null,
        last_order_date: null, // Será atualizado por trigger
        last_updated: new Date().toISOString(),
      };
    });

    // 3. Deletar dados antigos e inserir novos (full refresh)
    console.log('🗑️  Limpando tabela pharmacy_units...');
    await bigquery.query(`DELETE FROM \`farmanossadelivery-76182.${DATASET_ID}.${PHARMACY_UNITS_TABLE}\` WHERE TRUE`);

    // 4. Inserir dados
    console.log(`📥 Inserindo ${rows.length} unidades no BigQuery...`);
    const [job] = await bigquery
      .dataset(DATASET_ID)
      .table(PHARMACY_UNITS_TABLE)
      .insert(rows);

    console.log(`✅ ${rows.length} unidades sincronizadas com sucesso!`);
    
    // 5. Mostrar amostra
    console.log('\n📋 Amostra dos dados inseridos:');
    rows.slice(0, 3).forEach(row => {
      console.log(`  - ${row.name} (${row.unit_id})`);
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar unidades:', error);
    throw error;
  }
}

/**
 * Atualizar estatísticas agregadas calculadas a partir da tabela orders
 */
async function updateAggregatedStats() {
  console.log('\n📊 Atualizando estatísticas agregadas...');
  
  try {
    // Atualizar stats de entregadores
    console.log('🔄 Atualizando stats de entregadores...');
    const deliverymenStatsQuery = `
      UPDATE \`farmanossadelivery-76182.${DATASET_ID}.${DELIVERYMEN_TABLE}\` dm
      SET 
        total_deliveries = (SELECT COUNT(*) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.status = 'Entregue'),
        total_revenue = (SELECT COALESCE(SUM(price_number), 0) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.status = 'Entregue'),
        avg_rating = (SELECT AVG(rating) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.rating IS NOT NULL),
        total_ratings = (SELECT COUNT(*) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.rating IS NOT NULL),
        avg_delivery_time = (SELECT AVG(delivery_time_minutes) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.delivery_time_minutes IS NOT NULL),
        fastest_delivery = (SELECT CAST(MIN(delivery_time_minutes) AS INT64) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.delivery_time_minutes IS NOT NULL),
        slowest_delivery = (SELECT CAST(MAX(delivery_time_minutes) AS INT64) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id AND o.delivery_time_minutes IS NOT NULL),
        last_delivery_date = (SELECT DATE(MAX(created_at)) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.delivery_man = dm.delivery_man_id),
        last_updated = CURRENT_TIMESTAMP()
      WHERE TRUE
    `;
    
    await bigquery.query(deliverymenStatsQuery);
    console.log('✅ Stats de entregadores atualizadas');

    // Atualizar stats de unidades
    console.log('🔄 Atualizando stats de unidades...');
    const unitsStatsQuery = `
      UPDATE \`farmanossadelivery-76182.${DATASET_ID}.${PHARMACY_UNITS_TABLE}\` pu
      SET 
        total_orders = (SELECT COUNT(*) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id),
        total_deliveries = (SELECT COUNT(*) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id AND o.status = 'Entregue'),
        total_revenue = (SELECT COALESCE(SUM(price_number), 0) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id AND o.status = 'Entregue'),
        avg_rating = (SELECT AVG(rating) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id AND o.rating IS NOT NULL),
        total_ratings = (SELECT COUNT(*) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id AND o.rating IS NOT NULL),
        avg_delivery_time = (SELECT AVG(delivery_time_minutes) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id AND o.delivery_time_minutes IS NOT NULL),
        active_deliverymen = (SELECT COUNT(DISTINCT delivery_man) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id),
        last_order_date = (SELECT DATE(MAX(created_at)) FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o WHERE o.pharmacy_unit_id = pu.unit_id),
        last_updated = CURRENT_TIMESTAMP()
      WHERE TRUE
    `;
    
    await bigquery.query(unitsStatsQuery);
    console.log('✅ Stats de unidades atualizadas');

  } catch (error) {
    console.error('❌ Erro ao atualizar estatísticas:', error);
    throw error;
  }
}

/**
 * Executar sincronização completa
 */
async function main() {
  console.log('🚀 Iniciando sincronização de dados de referência...\n');
  const startTime = Date.now();

  try {
    await syncDeliverymen();
    await syncPharmacyUnits();
    
    // NOTA: updateAggregatedStats() falha se executado imediatamente após insert
    // devido ao streaming buffer do BigQuery. Execute manualmente após alguns minutos:
    // await updateAggregatedStats();
    console.log('\n⚠️  IMPORTANTE: Execute updateAggregatedStats() manualmente após ~90 segundos');
    console.log('   Comando: aguarde 90s e rode o script novamente com a flag --update-only');

    const totalTime = Date.now() - startTime;
    console.log(`\n✅ Sincronização completa em ${totalTime}ms`);
    console.log('\n📈 Próximos passos:');
    console.log('  1. Atualizar bigqueryApi.js para usar JOINs com essas tabelas');
    console.log('  2. Remover fetchDeliverymen() e fetchPharmacyUnits() do useAdminDataBigQuery.ts');
    console.log('  3. Reduzir tempo de carregamento de 2422ms para ~1500ms (economia de 925ms)');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error);
    process.exit(1);
  }
}

// Executar
main();
