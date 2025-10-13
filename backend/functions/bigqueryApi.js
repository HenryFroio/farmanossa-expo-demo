/**
 * BigQuery REST APIs
 * 
 * High-performance APIs that query pre-aggregated BigQuery tables
 * Replaces expensive Firestore queries with sub-second BigQuery responses
 * 
 * Target: <1s response time vs 60s with Firestore
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const express = require('express');
const cors = require('cors');

const bigquery = new BigQuery();
const DATASET_ID = 'farmanossa_analytics';

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Helper: Execute BigQuery query with caching
 */
async function queryBigQuery(query, cacheTTL = 300) {
  const options = {
    query: query,
    location: 'southamerica-east1',
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

/**
 * GET /api/bigquery/admin-dashboard
 * 
 * Returns aggregated dashboard stats for admin panel
 * Replaces useAdminData hook (60s → <1s)
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'today')
 * - unitId: filter by pharmacy unit (optional)
 * - deliverymanId: filter by deliveryman (optional)
 */
app.get('/admin-dashboard', async (req, res) => {
  try {
    const startTime = Date.now();
    const { period = 'today', unitId, deliverymanId } = req.query;
    
    // Determine date filter
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
        break;
      case 'week':
        // Semana atual (domingo a sábado)
        dateFilter = `
          DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      case 'month':
        // Mês atual (dia 1 até hoje)
        dateFilter = `
          DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      default:
        dateFilter = "TRUE"; // All time
    }
    
    // Build filters
    const filters = [dateFilter];
    if (unitId) filters.push(`pharmacy_unit_id = '${unitId}'`);
    if (deliverymanId) filters.push(`delivery_man = '${deliverymanId}'`);
    const whereClause = filters.join(' AND ');
    
    // Build filters for queries WITH JOINs (prefix with 'o.')
    const joinFilters = [dateFilter.replace(/created_at/g, 'o.created_at')];
    if (unitId) joinFilters.push(`o.pharmacy_unit_id = '${unitId}'`);
    if (deliverymanId) joinFilters.push(`o.delivery_man = '${deliverymanId}'`);
    const joinWhereClause = joinFilters.join(' AND ');
    
    // OTIMIZAÇÃO: Uma única query massiva com subqueries para tudo
    // Em vez de 7 queries sequenciais (7s), uma única query otimizada (<1s)
    const masterQuery = `
      WITH
      -- Stats principais
      main_stats AS (
        SELECT
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as canceled_orders,
          COUNT(CASE WHEN status = 'Em Preparação' THEN 1 END) as preparing_orders,
          COUNT(CASE WHEN status = 'A caminho' THEN 1 END) as in_delivery_orders,
          COUNT(CASE WHEN status = 'Pendente' THEN 1 END) as pending_orders,
          ROUND(SUM(price_number), 2) as total_revenue,
          ROUND(AVG(price_number), 2) as avg_order_value,
          ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number END), 2) as delivered_revenue,
          ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2) as avg_rating,
          COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as total_ratings,
          COUNT(CASE WHEN rating >= 4.0 THEN 1 END) as positive_ratings,
          ROUND(COUNT(CASE WHEN rating >= 4.0 THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN rating IS NOT NULL THEN 1 END), 0), 1) as satisfaction_rate,
          ROUND(AVG(CASE WHEN delivery_time_minutes IS NOT NULL THEN delivery_time_minutes END), 2) as avg_delivery_time_minutes,
          ROUND(MIN(CASE WHEN delivery_time_minutes IS NOT NULL THEN delivery_time_minutes END), 2) as fastest_delivery_minutes,
          ROUND(MAX(CASE WHEN delivery_time_minutes IS NOT NULL THEN delivery_time_minutes END), 2) as slowest_delivery_minutes,
          APPROX_COUNT_DISTINCT(delivery_man) as active_deliverymen,
          APPROX_COUNT_DISTINCT(pharmacy_unit_id) as active_units,
          APPROX_COUNT_DISTINCT(customer_phone) as unique_customers,
          SUM(item_count) as total_items,
          ROUND(AVG(item_count), 1) as avg_items_per_order,
          MIN(created_at) as first_order_time,
          MAX(created_at) as last_order_time
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE ${whereClause}
      ),
      -- Top regions
      top_regions AS (
        SELECT 
          region,
          COUNT(*) as order_count,
          ROUND(AVG(delivery_time_minutes), 2) as avg_delivery_time
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE ${whereClause} AND region IS NOT NULL
        GROUP BY region
        ORDER BY order_count DESC
        LIMIT 10
      ),
      -- Hourly distribution
      hourly_dist AS (
        SELECT 
          EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo') as hour,
          COUNT(*) as order_count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE ${whereClause}
        GROUP BY hour
        ORDER BY hour
      ),
      -- Orders by deliveryman (COM NOME via JOIN)
      deliveryman_stats AS (
        SELECT 
          o.delivery_man,
          d.name as delivery_man_name,
          COUNT(*) as order_count,
          ROUND(SUM(o.price_number), 2) as total_revenue,
          ROUND(AVG(o.price_number), 2) as avg_order_value,
          ROUND(AVG(o.delivery_time_minutes), 2) as avg_delivery_time,
          ROUND(AVG(o.rating), 2) as avg_rating
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o
        LEFT JOIN \`farmanossadelivery-76182.${DATASET_ID}.deliverymen\` d
          ON o.delivery_man = d.delivery_man_id
        WHERE ${joinWhereClause} AND o.delivery_man IS NOT NULL
        GROUP BY o.delivery_man, d.name
        ORDER BY order_count DESC
        LIMIT 50
      ),
      -- Orders by unit (COM NOME via JOIN)
      unit_stats AS (
        SELECT 
          o.pharmacy_unit_id,
          u.name as unit_name,
          COUNT(*) as order_count,
          ROUND(SUM(o.price_number), 2) as total_revenue,
          ROUND(AVG(o.price_number), 2) as avg_order_value,
          ROUND(AVG(o.delivery_time_minutes), 2) as avg_delivery_time,
          ROUND(AVG(o.rating), 2) as avg_rating
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\` o
        LEFT JOIN \`farmanossadelivery-76182.${DATASET_ID}.pharmacy_units\` u
          ON o.pharmacy_unit_id = u.unit_id
        WHERE ${joinWhereClause} AND o.pharmacy_unit_id IS NOT NULL
        GROUP BY o.pharmacy_unit_id, u.name
        ORDER BY order_count DESC
        LIMIT 50
      ),
      -- Motorcycle usage
      motorcycle_stats AS (
        SELECT 
          license_plate,
          COUNT(*) as delivery_count,
          APPROX_COUNT_DISTINCT(delivery_man) as unique_deliverymen
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE ${whereClause} AND license_plate IS NOT NULL AND license_plate != ''
        GROUP BY license_plate
        ORDER BY delivery_count DESC
        LIMIT 20
      ),
      -- Daily distribution
      daily_dist AS (
        SELECT 
          DATE(created_at, 'America/Sao_Paulo') as date,
          COUNT(*) as order_count,
          ROUND(SUM(price_number), 2) as total_revenue
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE ${whereClause}
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
      ),
      -- Lista completa de entregadores (ID + Nome + Unidade)
      deliverymen_list AS (
        SELECT 
          delivery_man_id, 
          name, 
          pharmacy_unit_id
        FROM \`farmanossadelivery-76182.${DATASET_ID}.deliverymen\`
        ${unitId ? `WHERE pharmacy_unit_id = '${unitId}'` : ''}
        ORDER BY name
      ),
      -- Lista completa de unidades (ID + Nome)
      units_list AS (
        SELECT unit_id, name
        FROM \`farmanossadelivery-76182.${DATASET_ID}.pharmacy_units\`
        ${unitId ? `WHERE unit_id = '${unitId}'` : ''}
        ORDER BY name
      )
      
      -- Retornar tudo em arrays separados
      SELECT
        (SELECT AS STRUCT * FROM main_stats) as stats,
        ARRAY(SELECT AS STRUCT * FROM top_regions) as topRegions,
        ARRAY(SELECT AS STRUCT * FROM hourly_dist) as hourlyDistribution,
        ARRAY(SELECT AS STRUCT * FROM deliveryman_stats) as ordersByDeliveryman,
        ARRAY(SELECT AS STRUCT * FROM unit_stats) as ordersByUnit,
        ARRAY(SELECT AS STRUCT * FROM motorcycle_stats) as motorcycleUsage,
        ARRAY(SELECT AS STRUCT * FROM daily_dist) as dailyDistribution,
        ARRAY(SELECT AS STRUCT * FROM deliverymen_list) as deliverymen,
        ARRAY(SELECT AS STRUCT * FROM units_list) as pharmacyUnits
    `;
    
    const queryStartTime = Date.now();
    const [result] = await queryBigQuery(masterQuery);
    const queryEndTime = Date.now();
    
    console.log(`✅ [BigQuery] Master query executed in ${queryEndTime - queryStartTime}ms`);
    
    res.json({
      success: true,
      period,
      filters: { unitId, deliverymanId },
      stats: result.stats || {},
      topRegions: result.topRegions || [],
      hourlyDistribution: result.hourlyDistribution || [],
      ordersByDeliveryman: result.ordersByDeliveryman || [],
      ordersByUnit: result.ordersByUnit || [],
      motorcycleUsage: result.motorcycleUsage || [],
      dailyDistribution: result.dailyDistribution || [],
      deliverymen: result.deliverymen || [],
      pharmacyUnits: result.pharmacyUnits || [],
      queryTime: new Date().toISOString(),
      performanceMs: queryEndTime - queryStartTime,
      totalMs: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Admin dashboard API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/deliveryman/:id
 * 
 * Returns performance stats for a specific deliveryman
 * Replaces calculateDetailedStats processing
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'month')
 */
app.get('/deliveryman/:id', async (req, res) => {
  try {
    const deliverymanId = req.params.id;
    const { period = 'month' } = req.query;
    
    // Determine date filter
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
        break;
      case 'week':
        // Semana atual (domingo a sábado)
        dateFilter = `
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      case 'month':
        // Mês atual (dia 1 até hoje)
        dateFilter = `
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      default:
        dateFilter = ""; // All time
    }
    
    const query = `
      WITH
      -- Main stats
      main_stats AS (
        SELECT
          delivery_man,
          
          -- Delivery counts
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as completed_deliveries,
          COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as canceled_deliveries,
          ROUND(COUNT(CASE WHEN status = 'Entregue' THEN 1 END) * 100.0 / COUNT(*), 1) as completion_rate,
          
          -- Earnings (15% commission)
          ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number * 0.15 END), 2) as total_earnings,
          ROUND(AVG(CASE WHEN status = 'Entregue' THEN price_number * 0.15 END), 2) as avg_earnings_per_delivery,
          
          -- Rating metrics
          ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2) as avg_rating,
          COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as total_ratings,
          COUNT(CASE WHEN rating >= 4.0 THEN 1 END) as positive_ratings,
          ROUND(COUNT(CASE WHEN rating >= 4.0 THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN rating IS NOT NULL THEN 1 END), 0), 1) as satisfaction_rate,
          
          -- Delivery time analysis
          ROUND(AVG(delivery_time_minutes), 2) as avg_delivery_time,
          ROUND(MIN(CASE WHEN delivery_time_minutes > 0 THEN delivery_time_minutes END), 2) as fastest_delivery,
          ROUND(MAX(delivery_time_minutes), 2) as slowest_delivery,
          
          -- Delivery time distribution
          COUNT(CASE WHEN delivery_time_minutes <= 15 THEN 1 END) as deliveries_0_15_min,
          COUNT(CASE WHEN delivery_time_minutes > 15 AND delivery_time_minutes <= 30 THEN 1 END) as deliveries_15_30_min,
          COUNT(CASE WHEN delivery_time_minutes > 30 AND delivery_time_minutes <= 45 THEN 1 END) as deliveries_30_45_min,
          COUNT(CASE WHEN delivery_time_minutes > 45 THEN 1 END) as deliveries_over_45_min,
          
          -- Active coverage
          APPROX_COUNT_DISTINCT(pharmacy_unit_id) as active_units,
          APPROX_COUNT_DISTINCT(region) as regions_covered,
          
          -- Date range
          MIN(created_at) as first_delivery,
          MAX(created_at) as last_delivery
          
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter}
        GROUP BY delivery_man
      ),
      
      -- Hourly distribution
      hourly_dist AS (
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter}
        GROUP BY hour
        ORDER BY hour
      ),
      
      -- Daily distribution (day of week for weekly period)
      daily_dist AS (
        SELECT EXTRACT(DAYOFWEEK FROM created_at) - 1 as day, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter}
        GROUP BY day
        ORDER BY day
      ),
      
      -- Daily distribution (day of month for monthly period)
      monthly_dist AS (
        SELECT EXTRACT(DAY FROM created_at) as day, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter}
        GROUP BY day
        ORDER BY day
      ),
      
      -- Top regions
      top_regions AS (
        SELECT region, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter} AND region IS NOT NULL
        GROUP BY region
        ORDER BY count DESC
        LIMIT 5
      ),
      
      -- Top motorcycles
      top_motorcycles AS (
        SELECT license_plate, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter} AND license_plate IS NOT NULL
        GROUP BY license_plate
        ORDER BY count DESC
        LIMIT 10
      ),
      
      -- Top items (parse JSON string and unnest)
      top_items AS (
        SELECT 
          JSON_VALUE(item_json) as item,
          COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`,
        UNNEST(JSON_EXTRACT_ARRAY(items)) as item_json
        WHERE delivery_man = @deliverymanId ${dateFilter}
          AND status = 'Entregue'
          AND items IS NOT NULL
          AND items != '[]'
        GROUP BY item
        ORDER BY count DESC
        LIMIT 10
      ),
      
      -- Top customers
      top_customers AS (
        SELECT 
          customer_name,
          customer_phone,
          COUNT(*) as order_count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId ${dateFilter} AND customer_name IS NOT NULL
        GROUP BY customer_name, customer_phone
        ORDER BY order_count DESC
        LIMIT 10
      ),
      
      -- Revenue trend (last 7 days) - earnings for deliveryman (15% commission)
      revenue_trend AS (
        SELECT 
          FORMAT_DATE('%Y-%m-%d', DATE(created_at, 'America/Sao_Paulo')) as date,
          ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number * 0.15 ELSE 0 END), 2) as revenue
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = @deliverymanId 
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL 7 DAY)
        GROUP BY date
        ORDER BY date
      )
      
      SELECT
        (SELECT AS STRUCT * FROM main_stats) as stats,
        ARRAY(SELECT AS STRUCT hour, count FROM hourly_dist) as hourlyDistribution,
        ARRAY(SELECT AS STRUCT day, count FROM daily_dist) as performanceByDay,
        ARRAY(SELECT AS STRUCT day, count FROM monthly_dist) as performanceByMonth,
        ARRAY(SELECT AS STRUCT region, count FROM top_regions) as topRegions,
        ARRAY(SELECT AS STRUCT license_plate, count FROM top_motorcycles) as topMotorcycles,
        ARRAY(SELECT AS STRUCT item, count FROM top_items) as topItems,
        ARRAY(SELECT AS STRUCT customer_name as name, customer_phone as phone, order_count as count FROM top_customers) as topCustomers,
        ARRAY(SELECT AS STRUCT date, revenue FROM revenue_trend) as revenueTrend
    `;
    
    const options = {
      query: query,
      location: 'southamerica-east1',
      params: { deliverymanId }
    };
    
    const [rows] = await bigquery.query(options);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deliveryman not found or no deliveries in selected period'
      });
    }
    
    // Get total distance from delivery_runs
    const distanceQuery = `
      SELECT
        ROUND(SUM(total_distance), 2) as total_distance_meters
      FROM \`farmanossadelivery-76182.${DATASET_ID}.delivery_runs\`
      WHERE deliveryman_id = @deliverymanId 
        AND status = 'completed'
        ${period === 'today' ? "AND DATE(start_time, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')" : 
          period === 'week' ? "AND DATE(start_time, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY)) AND DATE(start_time, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')" :
          period === 'month' ? "AND DATE(start_time, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH) AND DATE(start_time, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')" : 
          ""}
    `;
    
    const distanceOptions = {
      query: distanceQuery,
      location: 'southamerica-east1',
      params: { deliverymanId }
    };
    
    const [distanceRows] = await bigquery.query(distanceOptions);
    const totalDistanceMeters = distanceRows.length > 0 && distanceRows[0].total_distance_meters 
      ? parseFloat(distanceRows[0].total_distance_meters) 
      : 0;
    
    // Get daily performance trend
    const trendQuery = `
      SELECT
        DATE(created_at, 'America/Sao_Paulo') as date,
        COUNT(*) as deliveries,
        COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as completed,
        ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number * 0.15 END), 2) as earnings,
        ROUND(AVG(delivery_time_minutes), 2) as avg_time
      FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
      WHERE delivery_man = @deliverymanId ${dateFilter}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const trendOptions = {
      query: trendQuery,
      location: 'southamerica-east1',
      params: { deliverymanId }
    };
    
    const [trend] = await bigquery.query(trendOptions);
    
    // Add distance to stats object
    const statsWithDistance = {
      ...rows[0].stats,
      total_distance_meters: totalDistanceMeters
    };
    
    res.json({
      success: true,
      deliverymanId,
      period,
      ...rows[0], // Spread all data (hourlyDistribution, performanceByDay, etc.)
      stats: statsWithDistance, // Override stats with distance included
      dailyTrend: trend,
      queryTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Deliveryman API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/unit/:id/cancelled-orders
 * 
 * Returns list of cancelled orders for a specific pharmacy unit
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'week')
 */
app.get('/unit/:id/cancelled-orders', async (req, res) => {
  try {
    const unitId = req.params.id;
    const { period = 'week' } = req.query;
    
    // Determine date filter
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
        break;
      case 'week':
        dateFilter = `
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      case 'month':
        dateFilter = `
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      default:
        dateFilter = "";
    }
    
    const query = `
      SELECT
        order_id,
        order_number,
        customer_name,
        customer_phone,
        address,
        created_at,
        status_history,
        review_comment
      FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
      WHERE pharmacy_unit_id = @unitId 
        AND status = 'Cancelado'
        ${dateFilter}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const options = {
      query: query,
      location: 'southamerica-east1',
      params: { unitId }
    };
    
    const [rows] = await bigquery.query(options);
    
    // Extract cancel reason from status_history if available
    const orders = rows.map(row => {
      let cancelReason = null;
      
      if (row.status_history) {
        try {
          const history = JSON.parse(row.status_history);
          const cancelEvent = history.find(h => h.status === 'Cancelado');
          if (cancelEvent && cancelEvent.reason) {
            cancelReason = cancelEvent.reason;
          }
        } catch (e) {
          console.error('Error parsing status_history:', e);
        }
      }
      
      // If no cancel reason in status_history, check review_comment
      if (!cancelReason && row.review_comment) {
        cancelReason = row.review_comment;
      }
      
      return {
        orderId: row.order_id,
        orderNumber: row.order_number || row.order_id.substring(0, 8),
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        address: row.address,
        createdAt: row.created_at,
        cancelReason: cancelReason
      };
    });
    
    res.json({
      success: true,
      unitId,
      period,
      total: orders.length,
      orders,
      queryTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cancelled orders API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/unit/:id
 * 
 * Returns stats for a specific pharmacy unit
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'week')
 */
app.get('/unit/:id', async (req, res) => {
  try {
    const startTime = Date.now();
    const unitId = req.params.id;
    const { period = 'week' } = req.query;
    
    // Determine date filter
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
        break;
      case 'week':
        // Semana atual (domingo a sábado)
        dateFilter = `
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      case 'month':
        // Mês atual (dia 1 até hoje)
        dateFilter = `
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
          AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
        `;
        break;
      default:
        dateFilter = ""; // All time
    }
    
    const query = `
      WITH
      -- Main stats
      main_stats AS (
        SELECT
          pharmacy_unit_id,
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as canceled_orders,
          ROUND(COUNT(CASE WHEN status = 'Entregue' THEN 1 END) * 100.0 / COUNT(*), 1) as delivery_rate,
          ROUND(SUM(price_number), 2) as total_revenue,
          ROUND(AVG(price_number), 2) as avg_order_value,
          ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number END), 2) as delivered_revenue,
          ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2) as avg_rating,
          ROUND(AVG(delivery_time_minutes), 2) as avg_delivery_time,
          ROUND(MIN(CASE WHEN delivery_time_minutes > 0 THEN delivery_time_minutes END), 2) as fastest_delivery,
          ROUND(MAX(delivery_time_minutes), 2) as slowest_delivery,
          APPROX_COUNT_DISTINCT(delivery_man) as active_deliverymen,
          APPROX_COUNT_DISTINCT(region) as regions_served,
          APPROX_COUNT_DISTINCT(customer_phone) as unique_customers
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter}
        GROUP BY pharmacy_unit_id
      ),
      
      -- Top regions
      top_regions AS (
        SELECT region, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter} AND region IS NOT NULL
        GROUP BY region
        ORDER BY count DESC
        LIMIT 5
      ),
      
      -- Hourly distribution
      hourly_dist AS (
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter}
        GROUP BY hour
        ORDER BY hour
      ),
      
      -- Daily distribution (day of week for weekly period)
      daily_dist AS (
        SELECT EXTRACT(DAYOFWEEK FROM created_at) - 1 as day, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter}
        GROUP BY day
        ORDER BY day
      ),
      
      -- Daily distribution (day of month for monthly period)
      monthly_dist AS (
        SELECT EXTRACT(DAY FROM created_at) as day, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter}
        GROUP BY day
        ORDER BY day
      ),
      
      -- Top deliverymen for this unit
      top_deliverymen AS (
        SELECT 
          delivery_man,
          delivery_man_name,
          COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as deliveries,
          ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2) as avg_rating
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter} AND delivery_man IS NOT NULL
        GROUP BY delivery_man, delivery_man_name
        ORDER BY deliveries DESC
        LIMIT 10
      ),
      
      -- Top motorcycles
      top_motorcycles AS (
        SELECT license_plate, COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter} AND license_plate IS NOT NULL
        GROUP BY license_plate
        ORDER BY count DESC
        LIMIT 10
      ),
      
      -- Top items (parse JSON string and unnest)
      top_items AS (
        SELECT 
          JSON_VALUE(item_json) as item,
          COUNT(*) as count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`,
        UNNEST(JSON_EXTRACT_ARRAY(items)) as item_json
        WHERE pharmacy_unit_id = @unitId ${dateFilter} 
          AND status = 'Entregue'
          AND items IS NOT NULL
          AND items != '[]'
        GROUP BY item
        ORDER BY count DESC
        LIMIT 10
      ),
      
      -- Top customers
      top_customers AS (
        SELECT 
          customer_name,
          customer_phone,
          COUNT(*) as order_count
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId ${dateFilter} AND customer_name IS NOT NULL
        GROUP BY customer_name, customer_phone
        ORDER BY order_count DESC
        LIMIT 10
      ),
      
      -- Revenue trend (last 7 days)
      revenue_trend AS (
        SELECT 
          FORMAT_DATE('%Y-%m-%d', DATE(created_at, 'America/Sao_Paulo')) as date,
          ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number ELSE 0 END), 2) as revenue
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = @unitId 
          AND DATE(created_at, 'America/Sao_Paulo') >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL 7 DAY)
        GROUP BY date
        ORDER BY date
      )
      
      SELECT
        (SELECT AS STRUCT * FROM main_stats) as stats,
        ARRAY(SELECT AS STRUCT region, count FROM top_regions) as topRegions,
        ARRAY(SELECT AS STRUCT hour, count FROM hourly_dist) as hourlyDistribution,
        ARRAY(SELECT AS STRUCT day, count FROM daily_dist) as performanceByDay,
        ARRAY(SELECT AS STRUCT day, count FROM monthly_dist) as performanceByMonth,
        ARRAY(SELECT AS STRUCT COALESCE(delivery_man_name, delivery_man) as name, deliveries, avg_rating as averageRating FROM top_deliverymen) as topDeliverymen,
        ARRAY(SELECT AS STRUCT license_plate, count FROM top_motorcycles) as topMotorcycles,
        ARRAY(SELECT AS STRUCT item, count FROM top_items) as topItems,
        ARRAY(SELECT AS STRUCT customer_name as name, customer_phone as phone, order_count as count FROM top_customers) as topCustomers,
        ARRAY(SELECT AS STRUCT date, revenue FROM revenue_trend) as revenueTrend
    `;
    
    const options = {
      query: query,
      location: 'southamerica-east1',
      params: { unitId }
    };
    
    const [rows] = await bigquery.query(options);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Unit not found or no orders in selected period'
      });
    }
    
    // Get total distance from delivery_runs for this unit
    const distanceQuery = `
      SELECT
        ROUND(SUM(total_distance), 2) as total_distance_meters
      FROM \`farmanossadelivery-76182.${DATASET_ID}.delivery_runs\`
      WHERE pharmacy_unit_id = @unitId 
        AND status = 'completed'
        ${period === 'today' ? "AND DATE(start_time, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')" : 
          period === 'week' ? "AND DATE(start_time, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY)) AND DATE(start_time, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')" :
          period === 'month' ? "AND DATE(start_time, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH) AND DATE(start_time, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')" : 
          ""}
    `;
    
    const distanceOptions = {
      query: distanceQuery,
      location: 'southamerica-east1',
      params: { unitId }
    };
    
    const [distanceRows] = await bigquery.query(distanceOptions);
    const totalDistanceMeters = distanceRows.length > 0 && distanceRows[0].total_distance_meters 
      ? parseFloat(distanceRows[0].total_distance_meters) 
      : 0;
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    console.log(`✅ [BigQuery] Unit ${unitId} query completed in ${queryTime}ms`);
    
    // Add distance to stats object
    const statsWithDistance = {
      ...rows[0].stats,
      total_distance_meters: totalDistanceMeters
    };
    
    res.json({
      success: true,
      unitId,
      period,
      ...rows[0], // Spread all data (topRegions, hourlyDistribution, etc.)
      stats: statsWithDistance, // Override stats with distance included
      queryTime: new Date().toISOString(),
      performanceMs: queryTime
    });
    
  } catch (error) {
    console.error('Unit API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/rankings
 * 
 * Returns top performers and trends
 * Cache: 30 minutes
 */
app.get('/rankings', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
        break;
      case 'week':
        dateFilter = "DATE(created_at, 'America/Sao_Paulo') >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL 7 DAY)";
        break;
      case 'month':
        dateFilter = "DATE(created_at, 'America/Sao_Paulo') >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL 30 DAY)";
        break;
      default:
        dateFilter = "TRUE";
    }
    
    // Top deliverymen by completed deliveries
    const topDeliverymenQuery = `
      SELECT
        delivery_man,
        COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as completed_deliveries,
        ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2) as avg_rating,
        ROUND(AVG(delivery_time_minutes), 2) as avg_delivery_time,
        ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number * 0.15 END), 2) as total_earnings
      FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
      WHERE ${dateFilter} AND delivery_man IS NOT NULL
      GROUP BY delivery_man
      ORDER BY completed_deliveries DESC
      LIMIT 10
    `;
    const topDeliverymen = await queryBigQuery(topDeliverymenQuery);
    
    // Top regions by order count
    const topRegionsQuery = `
      SELECT
        region,
        COUNT(*) as order_count,
        COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as delivered_count,
        ROUND(AVG(delivery_time_minutes), 2) as avg_delivery_time
      FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
      WHERE ${dateFilter} AND region IS NOT NULL
      GROUP BY region
      ORDER BY order_count DESC
      LIMIT 10
    `;
    const topRegions = await queryBigQuery(topRegionsQuery);
    
    // Top units by revenue
    const topUnitsQuery = `
      SELECT
        pharmacy_unit_id,
        COUNT(*) as total_orders,
        ROUND(SUM(CASE WHEN status = 'Entregue' THEN price_number END), 2) as revenue,
        ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2) as avg_rating
      FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
      WHERE ${dateFilter}
      GROUP BY pharmacy_unit_id
      ORDER BY revenue DESC
      LIMIT 10
    `;
    const topUnits = await queryBigQuery(topUnitsQuery);
    
    // Peak hours
    const peakHoursQuery = `
      SELECT
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo') as hour,
        COUNT(*) as order_count
      FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
      WHERE ${dateFilter}
      GROUP BY hour
      ORDER BY order_count DESC
      LIMIT 5
    `;
    const peakHours = await queryBigQuery(peakHoursQuery);
    
    res.json({
      success: true,
      period,
      rankings: {
        topDeliverymen,
        topRegions,
        topUnits,
        peakHours
      },
      queryTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Rankings API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/bigquery/deliveryman/:id
 * 
 * Removes a deliveryman from BigQuery analytics table
 * Called when a deliveryman is deactivated in Firestore
 * Maintains data consistency between operational DB and analytics warehouse
 * 
 * Path params:
 * - id: deliveryman ID (DM001, DM002, etc)
 */
app.delete('/deliveryman/:id', async (req, res) => {
  try {
    const deliverymanId = req.params.id;

    if (!deliverymanId) {
      return res.status(400).json({
        success: false,
        error: 'deliverymanId is required'
      });
    }

    // Delete from BigQuery
    const query = `
      DELETE FROM \`farmanossadelivery-76182.${DATASET_ID}.deliverymen\`
      WHERE delivery_man_id = @deliverymanId
    `;

    const options = {
      query: query,
      location: 'southamerica-east1',
      params: { deliverymanId }
    };

    await bigquery.query(options);

    console.log(`✅ Deleted deliveryman ${deliverymanId} from BigQuery`);

    res.json({
      success: true,
      message: `Deliveryman ${deliverymanId} removed from analytics`,
      deletedId: deliverymanId
    });

  } catch (error) {
    console.error('Delete deliveryman API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/unit/:id/export
 * 
 * Returns COMPLETE data for unit export (PDF/Excel)
 * No LIMIT on items, customers, motorcycles, regions
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month'
 * - start: ISO date string (optional, overrides period)
 * - end: ISO date string (optional, overrides period)
 */
app.get('/unit/:id/export', async (req, res) => {
  try {
    const unitId = req.params.id;
    const { period = 'today', start, end, skip_deliverymen = 'false' } = req.query;
    
    // Parse boolean parameter
    const shouldSkipDeliverymen = skip_deliverymen === 'true';

    console.log(`📊 [Export API] Unit ${unitId}, Period: ${period}, Skip Deliverymen: ${shouldSkipDeliverymen}`);

    // Determine date filter
    let dateFilter = '';
    if (start && end) {
      dateFilter = `created_at BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`;
    } else {
      switch (period) {
        case 'today':
          dateFilter = "DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
          break;
        case 'week':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
        case 'month':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
      }
    }

    // Build dynamic query based on what data is needed
    let ctes = `
      WITH delivered_orders AS (
        SELECT *
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = '${unitId}'
          AND status = 'Entregue'
          AND ${dateFilter}
      ),
    `;
    
    // Conditionally add deliverymen CTE
    if (!shouldSkipDeliverymen) {
      ctes += `
      -- Pre-aggregate deliverymen
      deliverymen_stats AS (
        SELECT
          delivery_man as id,
          delivery_man as name,
          COUNT(*) as deliveries,
          ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 1) as average_rating
        FROM delivered_orders
        WHERE delivery_man IS NOT NULL
        GROUP BY delivery_man
      ),
      `;
    }
    
    ctes += `
      -- Pre-aggregate items
      items_stats AS (
        SELECT 
          JSON_VALUE(item_json) as item,
          COUNT(*) as item_count
        FROM delivered_orders,
        UNNEST(JSON_EXTRACT_ARRAY(items)) as item_json
        WHERE items IS NOT NULL AND items != '[]'
        GROUP BY item
      ),
      
      -- Pre-aggregate customers
      customers_stats AS (
        SELECT customer_name, COUNT(*) as order_count
        FROM delivered_orders
        WHERE customer_name IS NOT NULL
        GROUP BY customer_name
      ),
      
      -- Pre-aggregate motorcycles
      motorcycles_stats AS (
        SELECT license_plate, COUNT(*) as delivery_count
        FROM delivered_orders
        WHERE license_plate IS NOT NULL
        GROUP BY license_plate
      ),
      
      -- Pre-aggregate regions
      regions_stats AS (
        SELECT region, COUNT(*) as delivery_count
        FROM delivered_orders
        WHERE region IS NOT NULL AND region != ''
        GROUP BY region
      )
    `;
    
    // Build SELECT based on what data is needed
    let selectClauses = [];
    
    if (!shouldSkipDeliverymen) {
      selectClauses.push(`
        -- All deliverymen
        (
          SELECT ARRAY_AGG(
            STRUCT(id, name, deliveries, average_rating)
            ORDER BY deliveries DESC
          )
          FROM deliverymen_stats
        ) as all_deliverymen,
        
        -- Deliverymen totals
        (SELECT COUNT(*) FROM deliverymen_stats) as total_deliverymen,
        (SELECT SUM(deliveries) FROM deliverymen_stats) as total_deliveries_by_all
      `);
    }
    
    selectClauses.push(`
        -- All items
        (
          SELECT ARRAY_AGG(
            STRUCT(item, item_count)
            ORDER BY item_count DESC
          )
          FROM items_stats
        ) as all_items,
        
        -- Items totals
        (SELECT COUNT(*) FROM items_stats) as total_item_types,
        (SELECT SUM(item_count) FROM items_stats) as total_items_sold,
        
        -- All customers
        (
          SELECT ARRAY_AGG(
            STRUCT(customer_name, order_count)
            ORDER BY order_count DESC
          )
          FROM customers_stats
        ) as all_customers,
        
        -- Customers totals
        (SELECT COUNT(*) FROM customers_stats) as total_unique_customers,
        (SELECT SUM(order_count) FROM customers_stats) as total_orders_by_customers,
        
        -- All motorcycles
        (
          SELECT ARRAY_AGG(
            STRUCT(license_plate, delivery_count)
            ORDER BY delivery_count DESC
          )
          FROM motorcycles_stats
        ) as all_motorcycles,
        
        -- Motorcycles totals
        (SELECT COUNT(*) FROM motorcycles_stats) as total_motorcycles,
        (SELECT SUM(delivery_count) FROM motorcycles_stats) as total_deliveries_by_motorcycles,
        
        -- All regions
        (
          SELECT ARRAY_AGG(
            STRUCT(region, delivery_count)
            ORDER BY delivery_count DESC
          )
          FROM regions_stats
        ) as all_regions,
        
        -- Regions totals
        (SELECT COUNT(*) FROM regions_stats) as total_regions,
        (SELECT SUM(delivery_count) FROM regions_stats) as total_deliveries_by_regions
    `);
    
    const exportQuery = ctes + '\nSELECT\n' + selectClauses.join(',\n');

    const rows = await queryBigQuery(exportQuery);
    
    if (!rows || rows.length === 0) {
      return res.json({
        all_deliverymen: [],
        all_items: [],
        all_customers: [],
        all_motorcycles: [],
        all_regions: []
      });
    }

    const data = rows[0];
    
    res.json({
      all_deliverymen: data.all_deliverymen || [],
      total_deliverymen: data.total_deliverymen || 0,
      total_deliveries_by_all: data.total_deliveries_by_all || 0,
      
      all_items: data.all_items || [],
      total_item_types: data.total_item_types || 0,
      total_items_sold: data.total_items_sold || 0,
      
      all_customers: data.all_customers || [],
      total_unique_customers: data.total_unique_customers || 0,
      total_orders_by_customers: data.total_orders_by_customers || 0,
      
      all_motorcycles: data.all_motorcycles || [],
      total_motorcycles: data.total_motorcycles || 0,
      total_deliveries_by_motorcycles: data.total_deliveries_by_motorcycles || 0,
      
      all_regions: data.all_regions || [],
      total_regions: data.total_regions || 0,
      total_deliveries_by_regions: data.total_deliveries_by_regions || 0
    });

  } catch (error) {
    console.error('Unit export API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/unit/:id/export-additional
 * 
 * Returns ONLY additional data beyond what's already loaded in StatsDetailsTab
 * Optimized to avoid re-fetching TOP items that are already in the UI
 * 
 * Already available in UI (skip these):
 * - topDeliverymen (via allDeliverymenStats)
 * - topItems (top 5)
 * - topCustomers (top 5)
 * - topMotorcycles (top 5)
 * - topRegions (top 10)
 * 
 * This endpoint returns:
 * - Items AFTER position 5 (6th onwards)
 * - Customers AFTER position 5 (6th onwards)
 * - Motorcycles AFTER position 5 (6th onwards)
 * - Regions AFTER position 10 (11th onwards)
 * - Totals for validation
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month'
 * - start: ISO date string (optional, overrides period)
 * - end: ISO date string (optional, overrides period)
 */
app.get('/unit/:id/export-additional', async (req, res) => {
  try {
    const unitId = req.params.id;
    const { period = 'today', start, end } = req.query;

    // Determine date filter
    let dateFilter = '';
    if (start && end) {
      dateFilter = `created_at BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`;
    } else {
      switch (period) {
        case 'today':
          dateFilter = "DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
          break;
        case 'week':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
        case 'month':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
      }
    }

    // Query for ADDITIONAL data only (skip TOP items already in UI)
    // OTIMIZADO: Busca apenas motorcycles e regions (items e customers removidos)
    const exportQuery = `
      WITH delivered_orders AS (
        SELECT *
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE pharmacy_unit_id = '${unitId}'
          AND status = 'Entregue'
          AND ${dateFilter}
      ),
      
      -- Pre-aggregate motorcycles (ALL motorcycles for ranking)
      motorcycles_stats AS (
        SELECT license_plate, COUNT(*) as delivery_count
        FROM delivered_orders
        WHERE license_plate IS NOT NULL
        GROUP BY license_plate
      ),
      
      -- Pre-aggregate regions (ALL regions for ranking)
      regions_stats AS (
        SELECT region, COUNT(*) as delivery_count
        FROM delivered_orders
        WHERE region IS NOT NULL AND region != ''
        GROUP BY region
      ),
      
      -- Rank motorcycles and get those AFTER position 5
      ranked_motorcycles AS (
        SELECT 
          license_plate,
          delivery_count,
          ROW_NUMBER() OVER (ORDER BY delivery_count DESC) as rank
        FROM motorcycles_stats
      ),
      
      -- Rank regions and get those AFTER position 10
      ranked_regions AS (
        SELECT 
          region,
          delivery_count,
          ROW_NUMBER() OVER (ORDER BY delivery_count DESC) as rank
        FROM regions_stats
      )
      
      SELECT
        -- Additional motorcycles (beyond TOP 5)
        (
          SELECT ARRAY_AGG(
            STRUCT(license_plate, delivery_count)
            ORDER BY delivery_count DESC
          )
          FROM ranked_motorcycles
          WHERE rank > 5
        ) as additional_motorcycles,
        
        -- Additional regions (beyond TOP 10)
        (
          SELECT ARRAY_AGG(
            STRUCT(region, delivery_count)
            ORDER BY delivery_count DESC
          )
          FROM ranked_regions
          WHERE rank > 10
        ) as additional_regions,
        
        -- Totals for validation (apenas motorcycles e regions)
        (SELECT COUNT(*) FROM motorcycles_stats) as total_motorcycles,
        (SELECT SUM(delivery_count) FROM motorcycles_stats) as total_deliveries_by_motorcycles,
        (SELECT COUNT(*) FROM regions_stats) as total_regions,
        (SELECT SUM(delivery_count) FROM regions_stats) as total_deliveries_by_regions
    `;

    const rows = await queryBigQuery(exportQuery);
    
    if (!rows || rows.length === 0) {
      return res.json({
        additional_motorcycles: [],
        additional_regions: [],
        total_motorcycles: 0,
        total_deliveries_by_motorcycles: 0,
        total_regions: 0,
        total_deliveries_by_regions: 0
      });
    }

    const data = rows[0];
    
    res.json({
      additional_motorcycles: data.additional_motorcycles || [],
      additional_regions: data.additional_regions || [],
      
      total_motorcycles: data.total_motorcycles || 0,
      total_deliveries_by_motorcycles: data.total_deliveries_by_motorcycles || 0,
      total_regions: data.total_regions || 0,
      total_deliveries_by_regions: data.total_deliveries_by_regions || 0
    });

  } catch (error) {
    console.error('Unit export-additional API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/deliveryman/:id/export
 * 
 * Returns COMPLETE data for deliveryman export (PDF/Excel)
 * No LIMIT on items, customers, motorcycles
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month'
 * - start: ISO date string (optional, overrides period)
 * - end: ISO date string (optional, overrides period)
 */
app.get('/deliveryman/:id/export', async (req, res) => {
  try {
    const deliverymanId = req.params.id;
    const { period = 'today', start, end } = req.query;

    // Determine date filter
    let dateFilter = '';
    if (start && end) {
      dateFilter = `created_at BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`;
    } else {
      switch (period) {
        case 'today':
          dateFilter = "DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
          break;
        case 'week':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
        case 'month':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
      }
    }

    // Query for COMPLETE export data
    const exportQuery = `
      WITH delivered_orders AS (
        SELECT *
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = '${deliverymanId}'
          AND status = 'Entregue'
          AND ${dateFilter}
      ),
      
      -- Pre-aggregate items
      items_stats AS (
        SELECT 
          JSON_VALUE(item_json) as item,
          COUNT(*) as item_count
        FROM delivered_orders,
        UNNEST(JSON_EXTRACT_ARRAY(items)) as item_json
        WHERE items IS NOT NULL AND items != '[]'
        GROUP BY item
      ),
      
      -- Pre-aggregate customers
      customers_stats AS (
        SELECT customer_name, COUNT(*) as order_count
        FROM delivered_orders
        WHERE customer_name IS NOT NULL
        GROUP BY customer_name
      ),
      
      -- Pre-aggregate motorcycles
      motorcycles_stats AS (
        SELECT license_plate, COUNT(*) as delivery_count
        FROM delivered_orders
        WHERE license_plate IS NOT NULL
        GROUP BY license_plate
      )
      
      SELECT
        -- All items
        (
          SELECT ARRAY_AGG(
            STRUCT(item, item_count)
            ORDER BY item_count DESC
          )
          FROM items_stats
        ) as all_items,
        
        -- Items totals
        (SELECT COUNT(*) FROM items_stats) as total_item_types,
        (SELECT SUM(item_count) FROM items_stats) as total_items_sold,
        
        -- All customers
        (
          SELECT ARRAY_AGG(
            STRUCT(customer_name, order_count)
            ORDER BY order_count DESC
          )
          FROM customers_stats
        ) as all_customers,
        
        -- Customers totals
        (SELECT COUNT(*) FROM customers_stats) as total_unique_customers,
        (SELECT SUM(order_count) FROM customers_stats) as total_orders_by_customers,
        
        -- All motorcycles
        (
          SELECT ARRAY_AGG(
            STRUCT(license_plate, delivery_count)
            ORDER BY delivery_count DESC
          )
          FROM motorcycles_stats
        ) as all_motorcycles,
        
        -- Motorcycles totals
        (SELECT COUNT(*) FROM motorcycles_stats) as total_motorcycles,
        (SELECT SUM(delivery_count) FROM motorcycles_stats) as total_deliveries_by_motorcycles
    `;

    const rows = await queryBigQuery(exportQuery);
    
    if (!rows || rows.length === 0) {
      return res.json({
        all_items: [],
        all_customers: [],
        all_motorcycles: []
      });
    }

    const data = rows[0];
    
    res.json({
      all_items: data.all_items || [],
      total_item_types: data.total_item_types || 0,
      total_items_sold: data.total_items_sold || 0,
      
      all_customers: data.all_customers || [],
      total_unique_customers: data.total_unique_customers || 0,
      total_orders_by_customers: data.total_orders_by_customers || 0,
      
      all_motorcycles: data.all_motorcycles || [],
      total_motorcycles: data.total_motorcycles || 0,
      total_deliveries_by_motorcycles: data.total_deliveries_by_motorcycles || 0
    });

  } catch (error) {
    console.error('Deliveryman export API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bigquery/deliveryman/:id/export-additional
 * 
 * Returns ONLY additional data beyond what's already loaded in StatsDetailsTab
 * For deliveryman type, frontend already has topMotorcycles (5)
 * 
 * OTIMIZADO: Busca apenas motorcycles (items e customers removidos)
 * 
 * This endpoint returns:
 * - Motorcycles AFTER position 5 (6th onwards)
 * - Totals for validation
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month'
 * - start: ISO date string (optional, overrides period)
 * - end: ISO date string (optional, overrides period)
 */
app.get('/deliveryman/:id/export-additional', async (req, res) => {
  try {
    const deliverymanId = req.params.id;
    const { period = 'today', start, end } = req.query;

    // Determine date filter
    let dateFilter = '';
    if (start && end) {
      dateFilter = `created_at BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}')`;
    } else {
      switch (period) {
        case 'today':
          dateFilter = "DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')";
          break;
        case 'week':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), WEEK(SUNDAY))
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
        case 'month':
          dateFilter = `
            DATE(created_at, 'America/Sao_Paulo') >= DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH)
            AND DATE(created_at, 'America/Sao_Paulo') <= CURRENT_DATE('America/Sao_Paulo')
          `;
          break;
      }
    }

    // Query for ADDITIONAL data only (skip TOP items already in UI)
    // OTIMIZADO: Busca apenas motorcycles
    const exportQuery = `
      WITH delivered_orders AS (
        SELECT *
        FROM \`farmanossadelivery-76182.${DATASET_ID}.orders\`
        WHERE delivery_man = '${deliverymanId}'
          AND status = 'Entregue'
          AND ${dateFilter}
      ),
      
      -- Pre-aggregate motorcycles
      motorcycles_stats AS (
        SELECT license_plate, COUNT(*) as delivery_count
        FROM delivered_orders
        WHERE license_plate IS NOT NULL
        GROUP BY license_plate
      ),
      
      -- Rank motorcycles and get those AFTER position 5
      ranked_motorcycles AS (
        SELECT 
          license_plate,
          delivery_count,
          ROW_NUMBER() OVER (ORDER BY delivery_count DESC) as rank
        FROM motorcycles_stats
      )
      
      SELECT
        -- Additional motorcycles (beyond TOP 5)
      SELECT
        -- Additional motorcycles (beyond TOP 5)
        (
          SELECT ARRAY_AGG(
            STRUCT(license_plate, delivery_count)
            ORDER BY delivery_count DESC
          )
          FROM ranked_motorcycles
          WHERE rank > 5
        ) as additional_motorcycles,
        
        -- Totals for validation
        (SELECT COUNT(*) FROM motorcycles_stats) as total_motorcycles,
        (SELECT SUM(delivery_count) FROM motorcycles_stats) as total_deliveries_by_motorcycles
    `;

    const rows = await queryBigQuery(exportQuery);
    
    if (!rows || rows.length === 0) {
      return res.json({
        additional_motorcycles: [],
        total_motorcycles: 0,
        total_motorcycles: 0,
        total_deliveries_by_motorcycles: 0
      });
    }

    const data = rows[0];
    
    res.json({
      additional_motorcycles: data.additional_motorcycles || [],
      
      total_motorcycles: data.total_motorcycles || 0,
      total_deliveries_by_motorcycles: data.total_deliveries_by_motorcycles || 0
    });

  } catch (error) {
    console.error('Deliveryman export-additional API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export Express app as Cloud Function
exports.bigqueryApi = functions.https.onRequest(app);
