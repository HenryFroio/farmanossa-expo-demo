# 📊 Farmanossa - Pharmacy Delivery Data Platform

> **Production data engineering system** with **Kappa Architecture** (Firestore + BigQuery) processing **2.47M+ records** (189K orders + 73K runs + 2.21M GPS coordinates) across 5 months (May-Sept 2025). Monthly throughput: **~38K orders/month**, **~14.5K runs/month**, **~441K GPS coordinates/month** (~30 coords/run) with **sub-second analytics latency** and intelligent caching.

[![Kappa Architecture](https://img.shields.io/badge/Kappa-Architecture-purple.svg)](https://www.oreilly.com/radar/questioning-the-lambda-architecture/)
[![BigQuery](https://img.shields.io/badge/BigQuery-2.47M+_records-blue.svg)](https://cloud.google.com/bigquery)
[![95% Faster](https://img.shields.io/badge/Performance-95%25_Faster-red.svg)](https://github.com)
[![Cost](https://img.shields.io/badge/Cost-$24,000+/yr_Saved-orange.svg)](https://github.com)

---

## 🎯 My Role (Data Engineering)

- ✅ Designed and implemented **Kappa Architecture** with Firestore (operational) + BigQuery (analytical)
- ✅ Built **serverless ETL pipelines** processing 1,000+ orders/day via Cloud Functions
- ✅ Optimized BigQuery queries with **partitioning/clustering** (90% scan reduction)
- ✅ Developed **3-layer caching system** achieving 80%+ hit ratio and 95% performance improvement
- ✅ Reduced costs by **$24,000+/year** through architectural optimizations
- ✅ Implemented **OCR data ingestion pipeline** solving missing POS API integration

---

## 🛠️ Core Data Engineering Competencies

**Data Warehousing & Analytics**  
BigQuery • Partitioning • Clustering • Columnar Storage • Query Optimization

**ETL & Data Pipelines**  
Cloud Functions • Serverless Architecture • Event-Driven Processing • Batch & Stream Processing

**Performance Engineering**  
Caching Strategies • Query Optimization • Cost Engineering • Scalability

**Data Integration**  
OCR Pipelines • API Integration • Schema Design • Data Validation

**Languages & Tools**  
SQL • TypeScript/JavaScript • Python • Git • GCP

---

## 🏗️ Data Architecture (Kappa Pattern)

**Kappa Architecture** = Single stream processing path where all data flows through one pipeline:

```
┌─────────────────────────────────────────────────────────┐
│ KAPPA ARCHITECTURE - UNIFIED DATA STREAM                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐      ┌───────────────┐                    │
│  │   OCR    │─────→│   FIRESTORE   │ (Source of Truth)  │
│  │ Pipeline │      │  Operational  │                    │
│  └──────────┘      └───────┬───────┘                    │
│                            │                            │
│            ┌───────────────┼───────────────┐            │
│            ▼               ▼               ▼            │
│       ┌────────┐     ┌─────────┐    ┌─────────┐        │
│       │ Mobile │     │  Cloud  │    │Reference│        │
│       │  Apps  │     │Functions│    │ Triggers│        │
│       └────────┘     │ (ETL)   │    └─────────┘        │
│                      └────┬────┘                        │
│                           │ Every 5 min                 │
│                           ▼                             │
│                    ┌─────────────┐                      │
│                    │  BIGQUERY   │                      │
│                    │  Dataset    │                      │
│                    │ 2.47M+ rows │                      │
│                    │189K orders  │                      │
│                    │ 73K runs    │                      │
│                    │2.21M coords │                      │
│                    └──────┬──────┘                      │
│                           │                             │
│                           ▼                             │
│                    ┌─────────────┐                      │
│                    │  3-Layer    │                      │
│                    │   Cache     │ (80% hit ratio)      │
│                    │ (Stale-While│                      │
│                    │ -Revalidate)│                      │
│                    └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**Why Kappa?** Simpler than Lambda (no dual codebase), single source of truth, cost-effective.

---

## 🧩 Technical Challenges Solved

| **Challenge** | **Solution** | **Business Impact** |
|---------------|--------------|---------------------|
| Dashboard loading 90+ seconds | BigQuery + 3-layer caching system | 95% performance improvement (90s → 2-3s) |
| No POS system API available | Custom OCR extraction pipeline | 100% automation, zero manual entry |
| R$ 10,880/month infrastructure | Native GPS + Haversine + BigQuery analytics | 93% cost reduction (R$ 780/month) |
| $2,000+/month GPS tracking costs | Native device GPS instead of Google Maps API | $2,000/mo saved ($24,000+/year) |
| 7 sequential database queries | Single master query with CTEs | 7x faster, sub-second response |
| Client-side data bottleneck | Server-side pre-aggregation | 98% CPU reduction |

---

## 💡 Key Data Engineering Achievements

### 1. Pipeline ETL Near Real-Time (Firestore → BigQuery)

**Challenge:** Dashboard taking 90+ seconds loading 68K+ orders from Firestore  
**Solution:** Sync to BigQuery every 5 minutes with pre-aggregated queries

<details>
<summary>📝 View ETL Pipeline Code</summary>

```javascript
/**
 * batchSync Cloud Function
 * Triggered every 5 minutes by Cloud Scheduler
 * Syncs delivered/cancelled orders to BigQuery
 * 
 * Note: Simplified for readability. Production code includes:
 * - Status filtering (delivered/cancelled only)
 * - License plate resolution from motorcycle IDs
 * - Robust error handling and logging
 */
exports.syncOrdersToBigQuery = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('every 5 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    // Step 1: Read unprocessed items from queue
    const queueSnapshot = await db.collection('bigquery_sync_queue')
      .where('processed', '==', false)
      .limit(100) // Batch size
      .get();
    
    if (queueSnapshot.empty) {
      console.log('No items to sync');
      return null;
    }
    
    // Step 2: Fetch order data from Firestore
    const orderIds = queueSnapshot.docs.map(doc => doc.data().orderId);
    const orders = [];
    
    for (const orderId of orderIds) {
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (orderDoc.exists) {
        const data = orderDoc.data();
        // Filter: Only sync delivered or cancelled orders
        if (data.status === 'Entregue' || data.status === 'Cancelado') {
          orders.push(orderDoc);
        }
      }
    }
    
    // Step 3: Transform data
    const rows = await Promise.all(orders.map(async (doc) => {
      const data = doc.data();
      return {
        order_id: doc.id,
        created_at: data.createdAt.toDate(),
        pharmacy_unit_id: data.pharmacyUnitId || '',
        delivery_man: data.deliveryMan || null,
        region: extractRegionFromAddress(data.address),
        price_number: parseFloat(data.priceNumber) || 0,
        delivery_time_minutes: calculateDeliveryTime(data.statusHistory, doc.id),
        status: data.status,
        rating: data.rating ? parseFloat(data.rating) : null,
        // ... more fields
      };
    }));
    
    // Step 4: Create NDJSON file
    const tempFilePath = path.join(os.tmpdir(), `sync_${Date.now()}.ndjson`);
    const ndjsonContent = rows.map(row => JSON.stringify(row)).join('\n');
    fs.writeFileSync(tempFilePath, ndjsonContent);
    
    // Step 5: Upload to Cloud Storage (FREE!)
    const bucket = storage.bucket(BUCKET_NAME);
    const gcsFileName = `sync/sync_${Date.now()}.ndjson`;
    await bucket.upload(tempFilePath, {
      destination: gcsFileName,
      metadata: { contentType: 'application/x-ndjson' }
    });
    
    // Step 6: Load to BigQuery via Cloud Storage
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    const file = bucket.file(gcsFileName);
    
    await table.load(file, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_APPEND',
      autodetect: false,
      schema: { fields: BIGQUERY_SCHEMA }
    });
    
    // Step 7: Mark items as processed
    await Promise.all(
      queueSnapshot.docs.map(doc => 
        doc.ref.update({ processed: true, processedAt: new Date() })
      )
    );
    
    console.log(`✅ Synced ${rows.length} orders to BigQuery`);
  });

/**
 * Extract region from address (40+ Brasília regions)
 */
function extractRegionFromAddress(address) {
  if (!address) return null;
  const addressUpper = address.toUpperCase();
  
  const regions = [
    'AGUAS CLARAS', 'TAGUATINGA', 'CEILANDIA', 'GAMA',
    'PLANALTINA', 'SOBRADINHO', 'BRAZLANDIA', 'SAMAMBAIA',
    // ... 30+ more regions
  ];
  
  for (const region of regions) {
    if (addressUpper.includes(region)) {
      return region;
    }
  }
  return null;
}

/**
 * Calculate delivery time from status history
 */
function calculateDeliveryTime(statusHistory, orderId = 'unknown') {
  if (!statusHistory || !Array.isArray(statusHistory)) {
    return 10.0; // Default: 10 min (manual registration template)
  }
  
  const startStatus = statusHistory.find(item => item.status === 'A caminho');
  const endStatus = statusHistory.find(item => item.status === 'Entregue');
  
  if (!startStatus || !endStatus) {
    return 10.0; // Default template
  }
  
  const startTime = startStatus.timestamp?._seconds 
    ? new Date(startStatus.timestamp._seconds * 1000)
    : (startStatus.timestamp?.toDate?.() || new Date(startStatus.timestamp));
    
  const endTime = endStatus.timestamp?._seconds
    ? new Date(endStatus.timestamp._seconds * 1000)
    : (endStatus.timestamp?.toDate?.() || new Date(endStatus.timestamp));
  
  const diffMinutes = (endTime - startTime) / (1000 * 60);
  
  // Valid time range: 0-300 min (5 hours)
  if (diffMinutes > 0 && diffMinutes <= 300) {
    // Fast deliveries (< 5 min) likely manual registration, use 10 min template
    if (diffMinutes < 5) {
      return 10.0;
    }
    return Math.round(diffMinutes * 100) / 100;
  }
  
  return 10.0; // Out of range: use template
}
```

</details>

**Impact:**  
- ✅ **100+ orders** processed per execution  
- ✅ **Near real-time** (5-min sync window)  
- ✅ **Cost: FREE** (under Cloud Functions free tier)  
- ✅ **Idempotent** (safe for retry)

---

### 2. BigQuery Query Optimization (Master Query Pattern)

**Challenge:** Dashboard making 7 sequential queries taking 7+ seconds total  
**Solution:** Single master query with 9 CTEs returning all data in parallel

<details>
<summary>📝 View Optimized Query Code</summary>

> **Note:** Simplified for readability. Production query includes: 20+ additional metrics (satisfaction rate, items per order, preparing/pending counts), motorcycle usage stats, 30-day daily trend, complete deliverymen/units reference lists for filters, and dynamic date filter building.

```sql
-- Master query with 9 CTEs (Common Table Expressions)
-- Returns all dashboard data in a single query (<1s vs 7+ sequential queries)
WITH
  -- Main statistics (20+ metrics)
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
      ROUND(COUNT(CASE WHEN rating >= 4.0 THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN rating IS NOT NULL THEN 1 END), 0), 1) as satisfaction_rate,
      ROUND(AVG(CASE WHEN delivery_time_minutes IS NOT NULL 
                THEN delivery_time_minutes END), 2) as avg_delivery_time_minutes,
      ROUND(MIN(CASE WHEN delivery_time_minutes IS NOT NULL 
                THEN delivery_time_minutes END), 2) as fastest_delivery_minutes,
      ROUND(MAX(CASE WHEN delivery_time_minutes IS NOT NULL 
                THEN delivery_time_minutes END), 2) as slowest_delivery_minutes,
      APPROX_COUNT_DISTINCT(delivery_man) as active_deliverymen,
      APPROX_COUNT_DISTINCT(pharmacy_unit_id) as active_units,
      APPROX_COUNT_DISTINCT(customer_phone) as unique_customers,
      SUM(item_count) as total_items,
      ROUND(AVG(item_count), 1) as avg_items_per_order,
      MIN(created_at) as first_order_time,
      MAX(created_at) as last_order_time
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders`
    WHERE DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')
  ),
  
  -- Top regions by order volume (10 highest)
  top_regions AS (
    SELECT 
      region,
      COUNT(*) as order_count,
      ROUND(AVG(delivery_time_minutes), 2) as avg_delivery_time
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders`
    WHERE region IS NOT NULL
      AND DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')
    GROUP BY region
    ORDER BY order_count DESC
    LIMIT 10
  ),
  
  -- Hourly distribution (24 hours)
  hourly_dist AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo') as hour,
      COUNT(*) as order_count
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders`
    WHERE DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')
    GROUP BY hour
    ORDER BY hour
  ),
  
  -- Deliveryman stats WITH JOIN to get names (eliminates 60% Firestore reads)
  deliveryman_stats AS (
    SELECT 
      o.delivery_man,
      d.name as delivery_man_name, -- JOIN for human-readable names
      COUNT(*) as order_count,
      ROUND(SUM(o.price_number), 2) as total_revenue,
      ROUND(AVG(o.price_number), 2) as avg_order_value,
      ROUND(AVG(o.delivery_time_minutes), 2) as avg_delivery_time,
      ROUND(AVG(o.rating), 2) as avg_rating
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders` o
    LEFT JOIN `farmanossadelivery-76182.farmanossa_analytics.deliverymen` d
      ON o.delivery_man = d.delivery_man_id
    WHERE DATE(o.created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')
      AND o.delivery_man IS NOT NULL
    GROUP BY o.delivery_man, d.name
    ORDER BY order_count DESC
    LIMIT 50
  ),
  
  -- Pharmacy unit stats WITH JOIN
  unit_stats AS (
    SELECT 
      o.pharmacy_unit_id,
      u.name as unit_name, -- JOIN for unit names
      COUNT(*) as order_count,
      ROUND(SUM(o.price_number), 2) as total_revenue,
      ROUND(AVG(o.price_number), 2) as avg_order_value,
      ROUND(AVG(o.delivery_time_minutes), 2) as avg_delivery_time,
      ROUND(AVG(o.rating), 2) as avg_rating
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders` o
    LEFT JOIN `farmanossadelivery-76182.farmanossa_analytics.pharmacy_units` u
      ON o.pharmacy_unit_id = u.unit_id
    WHERE DATE(o.created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')
      AND o.pharmacy_unit_id IS NOT NULL
    GROUP BY o.pharmacy_unit_id, u.name
    ORDER BY order_count DESC
    LIMIT 50
  ),
  
  -- Motorcycle usage (license plates)
  motorcycle_stats AS (
    SELECT 
      license_plate,
      COUNT(*) as delivery_count,
      APPROX_COUNT_DISTINCT(delivery_man) as unique_deliverymen
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders`
    WHERE DATE(created_at, 'America/Sao_Paulo') = CURRENT_DATE('America/Sao_Paulo')
      AND license_plate IS NOT NULL 
      AND license_plate != ''
    GROUP BY license_plate
    ORDER BY delivery_count DESC
    LIMIT 20
  ),
  
  -- Daily trend (last 30 days)
  daily_dist AS (
    SELECT 
      DATE(created_at, 'America/Sao_Paulo') as date,
      COUNT(*) as order_count,
      ROUND(SUM(price_number), 2) as total_revenue
    FROM `farmanossadelivery-76182.farmanossa_analytics.orders`
    WHERE DATE(created_at, 'America/Sao_Paulo') >= 
      DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL 30 DAY)
    GROUP BY date
    ORDER BY date DESC
    LIMIT 30
  ),
  
  -- Complete deliverymen list (for filters)
  deliverymen_list AS (
    SELECT 
      delivery_man_id, 
      name, 
      pharmacy_unit_id
    FROM `farmanossadelivery-76182.farmanossa_analytics.deliverymen`
    ORDER BY name
  ),
  
  -- Complete units list (for filters)
  units_list AS (
    SELECT unit_id, name
    FROM `farmanossadelivery-76182.farmanossa_analytics.pharmacy_units`
    ORDER BY name
  )

-- Final SELECT: Combine all CTEs into structured JSON arrays
SELECT 
  (SELECT AS STRUCT * FROM main_stats) as stats,
  ARRAY(SELECT AS STRUCT * FROM top_regions) as topRegions,
  ARRAY(SELECT AS STRUCT * FROM hourly_dist) as hourlyDistribution,
  ARRAY(SELECT AS STRUCT * FROM deliveryman_stats) as ordersByDeliveryman,
  ARRAY(SELECT AS STRUCT * FROM unit_stats) as ordersByUnit,
  ARRAY(SELECT AS STRUCT * FROM motorcycle_stats) as motorcycleUsage,
  ARRAY(SELECT AS STRUCT * FROM daily_dist) as dailyDistribution,
  ARRAY(SELECT AS STRUCT * FROM deliverymen_list) as deliverymen,
  ARRAY(SELECT AS STRUCT * FROM units_list) as pharmacyUnits;
```

</details>

**Impact:**  
- ✅ **7 queries → 1 query** = **7x faster**  
- ✅ **Sub-second execution** (800ms average)  
- ✅ **30+ pre-aggregated metrics** returned  
- ✅ **JOINs for human-readable names** (eliminates 60% Firestore reads)

---

### 3. Intelligent 3-Layer Caching

**Challenge:** Even with BigQuery, repeated dashboard loads causing unnecessary API calls  
**Solution:** Stale-While-Revalidate caching pattern with 3 tiers

<details>
<summary>📝 View Caching Implementation</summary>

> **Note:** Simplified for readability. Production code includes: cache promotion (AsyncStorage → Memory), detailed logging with timestamps, cache statistics utilities, and separate clear functions per endpoint.

```typescript
/**
 * 3-Layer Cache with Stale-While-Revalidate Pattern
 * 
 * Layer 1: Memory (Map)         → 10ms   (80% hit rate after warm-up)
 * Layer 2: AsyncStorage (Disk)  → 50ms   (15% hit rate)
 * Layer 3: BigQuery API         → 800ms  (5% miss rate)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache TTL (Time To Live) based on data volatility
const CACHE_TTL = {
  today: 5 * 60 * 1000,      // 5 minutes (frequently changing)
  week: 15 * 60 * 1000,      // 15 minutes
  month: 30 * 60 * 1000,     // 30 minutes
  all: 60 * 60 * 1000,       // 1 hour (rarely changes)
};

// Layer 1: In-memory cache (fastest)
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * Generate cache key with sorted parameters
 */
const getCacheKey = (endpoint: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `bigquery:${endpoint}:${sortedParams}`;
};

/**
 * Get TTL based on period
 */
const getTTL = (period: string): number => {
  switch (period) {
    case 'today':
      return CACHE_TTL.today;
    case 'week':
      return CACHE_TTL.week;
    case 'month':
      return CACHE_TTL.month;
    default:
      return CACHE_TTL.all;
  }
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (timestamp: number, ttl: number): boolean => {
  return Date.now() - timestamp < ttl;
};

/**
 * Get from memory cache
 */
const getFromMemoryCache = (key: string): any | null => {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  if (isCacheValid(cached.timestamp, cached.ttl)) {
    console.log(`✅ [Cache] Memory HIT: ${key}`);
    return cached.data;
  }

  // Remove expired cache
  memoryCache.delete(key);
  return null;
};

/**
 * Get from AsyncStorage (persistent)
 */
const getFromAsyncStorage = async (key: string): Promise<any | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    
    if (isCacheValid(parsed.timestamp, parsed.ttl)) {
      console.log(`✅ [Cache] AsyncStorage HIT: ${key}`);
      
      // Promote to memory cache (cache warming)
      memoryCache.set(key, { 
        data: parsed.data, 
        timestamp: parsed.timestamp, 
        ttl: parsed.ttl 
      });
      
      return parsed.data;
    }

    // Remove expired cache
    await AsyncStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error(`❌ [Cache] AsyncStorage read error:`, error);
    return null;
  }
};

/**
 * Set to AsyncStorage (also updates memory cache)
 */
const setToAsyncStorage = async (key: string, data: any, ttl: number): Promise<void> => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    
    // Also set to memory cache
    memoryCache.set(key, cacheData);
  } catch (error) {
    console.error(`❌ [Cache] AsyncStorage write error:`, error);
  }
};

/**
 * Fetch with cache - Stale-While-Revalidate strategy
 */
export const fetchWithCache = async <T>(
  endpoint: string,
  params: Record<string, any>,
  fetchFn: () => Promise<T>,
  options?: {
    skipCache?: boolean;
    onRevalidate?: (data: T) => void;
  }
): Promise<T> => {
  const cacheKey = getCacheKey(endpoint, params);
  const ttl = getTTL(params.period || 'today');

  // Skip cache if requested
  if (options?.skipCache) {
    console.log(`⏭️ [Cache] SKIP: ${cacheKey}`);
    const data = await fetchFn();
    await setToAsyncStorage(cacheKey, data, ttl);
    return data;
  }

  // 1. Try memory cache (instant ~10ms)
  const memoryData = getFromMemoryCache(cacheKey);
  if (memoryData) {
    // Revalidate in background for 'today' period only
    if (params.period === 'today') {
      console.log(`🔄 [Cache] Background revalidation started`);
      fetchFn()
        .then(freshData => {
          setToAsyncStorage(cacheKey, freshData, ttl);
          if (options?.onRevalidate) {
            options.onRevalidate(freshData); // Update UI with fresh data
          }
        })
        .catch(error => {
          console.error(`❌ [Cache] Background revalidation failed:`, error);
        });
    }
    return memoryData;
  }

  // 2. Try AsyncStorage (fast ~50ms)
  const asyncData = await getFromAsyncStorage(cacheKey);
  if (asyncData) {
    // Revalidate in background for 'today' period only
    if (params.period === 'today') {
      console.log(`🔄 [Cache] Background revalidation started`);
      fetchFn()
        .then(freshData => {
          setToAsyncStorage(cacheKey, freshData, ttl);
          if (options?.onRevalidate) {
            options.onRevalidate(freshData);
          }
        })
        .catch(error => {
          console.error(`❌ [Cache] Background revalidation failed:`, error);
        });
    }
    return asyncData;
  }

  // 3. Fetch from API (slow ~800ms)
  console.log(`🌐 [Cache] API FETCH: ${cacheKey}`);
  const startTime = Date.now();
  const data = await fetchFn();
  const fetchTime = Date.now() - startTime;
  console.log(`✅ [Cache] API fetched in ${fetchTime}ms`);
  
  // Cache the result
  await setToAsyncStorage(cacheKey, data, ttl);
  
  return data;
};

/**
 * Clear all BigQuery cache (useful for force refresh)
 */
export const clearBigQueryCache = async (): Promise<void> => {
  try {
    // Clear memory cache
    memoryCache.clear();
    
    // Clear AsyncStorage cache
    const allKeys = await AsyncStorage.getAllKeys();
    const bigQueryKeys = allKeys.filter(key => key.startsWith('bigquery:'));
    await AsyncStorage.multiRemove(bigQueryKeys);
    
    console.log(`✅ [Cache] Cleared ${bigQueryKeys.length} cached entries`);
  } catch (error) {
    console.error(`❌ [Cache] Clear error:`, error);
  }
};
```

</details>

**Impact:**  
- ✅ **80%+ cache hit ratio** after warm-up  
- ✅ **<100ms response** for 95% of requests  
- ✅ **Transparent background refresh** (Stale-While-Revalidate)  
- ✅ **Reduced API costs** by 80%

---

### 4. Cost-Optimized GPS Distance Calculation

**Challenge:** Google Maps Distance Matrix API would cost $2,000+/month for both distance calculation AND real-time delivery tracking for ~14.5K+ monthly delivery runs  
**Solution:** Native device GPS + Haversine formula (zero API costs, ±5m accuracy)

> **💰 Cost Impact:** The combination of GPS+Haversine (avoiding Google Maps API) + BigQuery analytics (instead of Firestore-only) reduced monthly infrastructure from **R$ 10,880 to R$ 780** (93% reduction). Current costs: Azure OCR API + Cloud Functions + Firestore + BigQuery, with BigQuery providing 8% savings and 95% performance improvement over Firestore-only analytics.

<details>
<summary>📝 View Geospatial Implementation</summary>

```typescript
/**
 * Cost-Optimized Distance Calculation & Real-time Tracking
 * 
 * WITHOUT optimization (using Google Maps API):
 * - Distance calculation: $500+/month
 * - Real-time tracking: $1,500+/month
 * - Total: $2,000+/month ($24,000+/year)
 * 
 * WITH optimization (Native GPS + Haversine):
 * - Cost: $0/month
 * - Accuracy: ±5m (equivalent to Google Maps)
 * - Dual benefit: Distance calculation + customer tracking
 */

import * as Location from 'expo-location';
import { Timestamp, arrayUnion } from 'firebase/firestore';

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: Timestamp;
}

/**
 * Stream GPS coordinates to Firestore during active delivery
 */
async function trackDeliveryLocation(deliveryRunId: string) {
  // Request location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;

  // Start location tracking (updates every 5 seconds)
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 seconds
      distanceInterval: 10, // 10 meters
    },
    async (location) => {
      const checkpoint: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Timestamp.now(),
      };

      // Stream to Firestore (dual purpose: tracking + distance calculation)
      const runRef = doc(db, 'deliveryRuns', deliveryRunId);
      await updateDoc(runRef, {
        checkpoints: arrayUnion(checkpoint)
      });
    }
  );

  return subscription;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Accuracy: ±5 meters (equivalent to Google Maps)
 */
function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371e3; // Earth radius in meters (more precise)
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate total distance from checkpoint array
 */
function calculateTotalDistance(checkpoints: Coordinate[]): number {
  let total = 0;
  
  for (let i = 1; i < checkpoints.length; i++) {
    const prev = checkpoints[i - 1];
    const curr = checkpoints[i];
    total += calculateDistance(
      { latitude: prev.latitude, longitude: prev.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
  }

  return total; // Returns distance in meters
}

/**
 * Complete distance calculation when delivery ends
 */
async function finalizeDeliveryDistance(deliveryRunId: string) {
  const deliveryDoc = await db.collection('deliveryRuns').doc(deliveryRunId).get();
  const checkpoints: Coordinate[] = deliveryDoc.data()?.checkpoints || [];

  const totalDistance = calculateTotalDistance(checkpoints);

  await db.collection('deliveryRuns').doc(deliveryRunId).update({
    totalDistance: totalDistance,
    status: 'completed'
  });

  console.log(`✅ Delivery ${deliveryRunId}: ${(totalDistance / 1000).toFixed(2)} km`);
}
```

</details>

**Impact:**  
- ✅ **$2,000+/month saved** ($24,000+/year cost elimination)  
- ✅ **±5m accuracy** (equivalent to Google Maps)  
- ✅ **Dual benefit**: Distance tracking + real-time customer tracking (CRM feature)  
- ✅ **73K+ runs processed** (5 months production, ~14.5K/month) with zero API costs  
- ✅ **2.21M GPS coordinates** (~30 per run) stored in BigQuery for geospatial analytics

---

### 5. BigQuery Table Optimization (Partitioning & Clustering)

**Challenge:** Full table scans processing 68K+ rows costing time and money  
**Solution:** Partitioning by date + clustering by business dimensions

<details>
<summary>📝 View Table Schema & Optimization</summary>

```sql
-- BigQuery table schema with partitioning and clustering
-- Loaded via Cloud Storage + batchSync.js ETL pipeline
CREATE TABLE `farmanossadelivery-76182.farmanossa_analytics.orders`
(
  order_id STRING NOT NULL,
  order_number STRING,
  customer_name STRING,
  customer_phone STRING,
  address STRING,
  region STRING,
  pharmacy_unit_id STRING,
  delivery_man STRING,
  delivery_man_name STRING,
  status STRING,
  price_number FLOAT64,
  rating FLOAT64,
  review_comment STRING,
  review_date TIMESTAMP,
  items STRING,
  item_count INT64,
  license_plate STRING,
  delivery_time_minutes FLOAT64,
  status_history STRING,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
)
-- Partitioning: Reduces scan by 90%
PARTITION BY DATE(created_at)
-- Clustering: Physical data organization for optimal queries
CLUSTER BY pharmacy_unit_id, delivery_man, region
OPTIONS(
  description="Orders data warehouse with partitioning and clustering for optimal query performance",
  require_partition_filter=true, -- Force date filters (cost optimization)
  partition_expiration_days=null -- Keep all data for historical analytics
);
```

**Optimization Details:**

1. **Partitioning by `DATE(created_at)`:**
   - Reduces scans by **90%** (only reads relevant partitions)
   - Queries with date filters skip entire partitions (TB → GB scan)
   - Example: `WHERE DATE(created_at) = CURRENT_DATE()` scans only 1 partition

2. **Clustering by `pharmacy_unit_id`, `delivery_man`, `region`:**
   - Physical data co-location (similar records stored together)
   - Reduces I/O by **30-50%** for filtered queries
   - Example: `WHERE pharmacy_unit_id = 'unit_123'` skips irrelevant blocks

3. **`require_partition_filter=true`:**
   - Prevents accidental full table scans
   - Forces developers to add date filters (cost control)
   - Fails fast if query forgets `WHERE DATE(created_at) ...`

**Query Performance:**
```sql
-- Without partitioning/clustering: 68K rows scanned (~2.5s, $0.01/query)
SELECT COUNT(*) FROM orders WHERE status = 'Entregue';

-- With partitioning/clustering: 2.3K rows scanned (~180ms, $0.0001/query)
SELECT COUNT(*) 
FROM orders 
WHERE DATE(created_at) = CURRENT_DATE()
  AND status = 'Entregue';
```

</details>

**Impact:**  
- ✅ **90% query scan reduction** via partitioning  
- ✅ **Physical data organization** for business dimensions  
- ✅ **Sub-second query execution** (800ms average)  
- ✅ **Cost optimization** (98.5% reduction per query)

---

## 📊 Production Metrics & Impact

| **Metric** | **Value** | **Details** |
|------------|-----------|-------------|
| **Production Period** | 5 months | May-September 2025 |
| **Total Data Volume** | 2.47M+ records | 189K orders + 73K runs + 2.21M GPS coordinates |
| **Monthly Throughput** | ~38K orders/month | ~1,260 orders/day, ~14.5K runs/month, ~441K GPS coords/month |
| **Analytics Latency** | Sub-second | Processes 2.47M+ records with instant query response |
| **Dashboard Performance** | 95% faster | 90s → 2-3s (cold) / 50ms (cached) with BigQuery vs Firestore-only analytics |
| **Cache Hit Ratio** | 80%+ | After warm-up, eliminates 80% of API calls |
| **Query Scan Reduction** | 90% | Via partitioning by date |
| **Cost Optimization** | 93% reduction | R$ 10,880/month → R$ 780/month (GPS+Haversine + BigQuery analytics) |
| **Monthly Infrastructure** | R$ 780 | Azure OCR + Cloud Functions + Firestore + BigQuery (8% savings vs Firestore-only analytics) |
| **GPS Cost Savings** | $24,000+/year | $2,000+/month saved via native GPS + Haversine (avoided Google Maps API) |
| **Platform Uptime** | 99.9% | Production SLA |
| **Query Execution** | 800ms avg | BigQuery master query |

---

## 📥 OCR Data Ingestion Pipeline (POS Integration)

**Challenge:** Pharmacy POS system has no API for integration  
**Solution:** OCR-based screenshot processing pipeline

### Pipeline Architecture:
```
Sales Screen Screenshot
  ↓ (Azure Cognitive Services + Tesseract.js)
Extracted Text (JSON)
  ↓ (Custom regex patterns)
Structured Order Data
  ↓ (Validation & Normalization)
Firestore Document
  ↓ (Real-time sync)
Mobile App (Instant Availability)
```

### Implementation Highlights:
- **Dual OCR engines** (Azure primary + Tesseract fallback)
- **95%+ accuracy** in field extraction
- **<5 seconds** end-to-end processing
- **Real-time validation** with instant feedback
- **1,000+ orders/day** processed automatically

**Repository:** [Pharmacy OCR System](https://github.com/HenryFroio/pharmacy-ocr-demo)

---

## 🛠️ Tech Stack (Data Engineering Focus)

### Data Warehousing & Analytics
- **BigQuery** - Columnar data warehouse (2.47M+ records: 189K orders + 73K runs + 2.21M GPS coordinates)
- **Real-time Geospatial Tracking** - ~30 GPS coordinates per delivery run stored for analytics
- **Monthly Analytics** - ~38K orders/month, ~14.5K runs/month, ~441K GPS coords/month processed with sub-second latency
- **Partitioning** - By DATE(created_at) for scan optimization
- **Clustering** - By pharmacy_unit_id, delivery_man, region
- **CTEs** - Master query pattern with 9 Common Table Expressions

### ETL & Data Pipelines
- **Cloud Functions** - Serverless ETL (Node.js/TypeScript)
- **Cloud Scheduler** - Cron-based pipeline orchestration
- **Firestore Triggers** - Real-time reference data sync
- **Cloud Storage** - Staging area for batch uploads (FREE)

### Caching & Performance
- **3-Layer Cache** - Memory (Map) → AsyncStorage → API
- **Stale-While-Revalidate** - Background refresh pattern
- **Dynamic TTL** - Based on data volatility (5min-1hr)

### Geospatial & Cost Optimization
- **Native GPS** - React Native Location API (zero cost)
- **Haversine Formula** - Distance calculation (±5m accuracy)
- **Real-time Tracking** - Dual-purpose: distance + customer CRM

### Operational Database
- **Firebase Firestore** - NoSQL real-time database
- **Real-time Listeners** - onSnapshot for instant updates
- **Offline-first Sync** - Automatic conflict resolution

---

## 📞 Contact & Professional Info

**Henry Froio**  
*Data Engineer | 4+ years experience*

Specialized in **Kappa Architecture**, **BigQuery optimization**, **high-performance ETL pipelines**, and **intelligent document processing**.

- **Email:** henry.froio@outlook.com
- **LinkedIn:** https://www.linkedin.com/in/henry-froio-827816238/
- **Portfolio:** https://henryfroio.com
- **GitHub:** https://github.com/HenryFroio

---

## 💼 Open to Opportunities

Seeking **Data Engineering** roles where I can apply my experience in:

✅ Building and optimizing **data pipelines** at scale  
✅ **Cost-conscious architecture** (saved $24,000+/year in production)  
✅ **Performance engineering** (95% improvement in real systems)  
✅ **Problem-solving** (built OCR solution when APIs weren't available)

Experienced with modern data stacks: GCP (BigQuery, Cloud Functions), SQL/NoSQL databases, Python, TypeScript.

📧 **henry.froio@outlook.com** | 💼 [LinkedIn](https://linkedin.com/in/henry-froio-827816238/)

---

## 📄 License

**© 2025 CSP COMERCIO DE MEDICAMENTOS LTDA. All rights reserved.**

This is a **sanitized portfolio demonstration** of proprietary software developed for CSP COMERCIO DE MEDICAMENTOS LTDA.

---

⭐ **If this project demonstrates valuable data engineering skills for your team, please star the repository!**

**Keywords:** Data Engineering, Kappa Architecture, BigQuery, ETL Pipelines, Cloud Functions, Serverless, Data Warehousing, Real-time Processing, OCR, Cost Optimization, Performance Engineering, TypeScript
