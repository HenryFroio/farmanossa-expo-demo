# Farmanossa: Multiplatform Pharmacy Delivery Management System - DEMO

> **⚠️ DATA ENGINEERING PORTFOLIO PROJECT**  
> This is a sanitized version of a production delivery management system developed for CSP COMERCIO DE MEDICAMENTOS LTDA.  
> Demonstrates a **multiplatform delivery management system** with **Kappa Architecture**, **real-time + batch processing**, **data warehousing**, and **intelligent caching** for pharmacy logistics.  
> **PURPOSE:** Showcase Data Engineering skills including ETL/ELT, real-time streaming, data warehousing with BigQuery, and cloud-native architecture

[![Kappa Architecture](https://img.shields.io/badge/Kappa-Architecture-purple.svg)](https://www.oreilly.com/radar/questioning-the-lambda-architecture/)
[![BigQuery](https://img.shields.io/badge/BigQuery-Data_Warehouse-blue.svg)](https://cloud.google.com/bigquery)
[![Real-Time Sync](https://img.shields.io/badge/Real--Time-Firestore-yellow.svg)](https://firebase.google.com/docs/firestore)
[![Serverless ETL](https://img.shields.io/badge/Serverless-ETL_Pipeline-green.svg)](https://cloud.google.com/functions)
[![95% Faster](https://img.shields.io/badge/Performance-95%25_Faster-red.svg)](https://github.com)
[![Cost Optimized](https://img.shields.io/badge/Cost-9%25_Reduced-orange.svg)](https://github.com)

> **Production-scale delivery management platform** demonstrating **Kappa Architecture** with **real-time + batch processing**, **BigQuery data warehousing**, **intelligent caching**, and **serverless ETL pipelines** for pharmacy delivery optimization at scale

A comprehensive **data engineering solution** showcasing **hybrid data architecture**, **automated ETL pipelines**, **pre-aggregated analytics**, **3-layer caching system**, and **event-driven data processing** for pharmacy delivery logistics optimization.

---

## 🚀 **Kappa Architecture - Hybrid Real-Time & Batch Processing**

### **Architecture Evolution: Dual-Path Data Processing**

The platform implements **Kappa Architecture** optimizing for both operational real-time needs and analytical performance:

```
┌────────────────────────────────────────────────────────┐
│  KAPPA ARCHITECTURE - DUAL PROCESSING PATHS            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────┐         ┌──────────────┐              │
│  │  OCR System │         │  FIRESTORE   │              │
│  │ (Screenshot │────────►│ Operational  │              │
│  │  Processing)│         │    Store     │              │
│  └─────────────┘         └──────┬───────┘              │
│                                  │                     │
│         ┌────────────────────────┼──────────┐          │
│         │                        │          │          │
│         ▼                        ▼          ▼          │
│  ┌──────────┐           ┌──────────────┐  │            │
│  │  Mobile  │           │   Cloud      │  │            │
│  │   Apps   │           │  Functions   │  │            │
│  │ (Client, │           │ (batchSync)  │  │            │
│  │Deliverer,│           └──────┬───────┘  │            │
│  │  Admin)  │                  │           │           │
│  └──────────┘                  │           │           │
│       │                        │ Every 5min│           │
│       │                        ▼           │           │
│       │                 ┌──────────────┐   │           │
│       │                 │   BIGQUERY   │◄──┘           │
│       │                 │   Dataset    │  (Ref Data    │
│       │                 │ farmanossa_  │   Triggers)   │
│       │                 │  analytics   │               │
│       │                 └──────┬───────┘               │
│       │                        │                       │
│       │                        ▼                       │
│       │                 ┌──────────────┐               │
│       │                 │  BigQuery    │               │
│       │                 │    APIs      │               │
│       │                 │(Cloud Funcs) │               │
│       │                 └──────┬───────┘               │
│       │                        │                       │
│       │                        ▼                       │
│       │                 ┌──────────────┐               │
│       └────────────────►│  3-Layer     │               │
│                         │    Cache     │               │
│                         │ (MMKV/Async) │               │
│                         └──────────────┘               │
└────────────────────────────────────────────────────────┘
```

### **Performance Transformation**

| Metric | Before (Firestore Only) | After (Kappa + BigQuery) | Improvement |
|--------|-------------------------|---------------------------|-------------|
| **Dashboard Load Time** | 90+ seconds | 2-3 seconds (cache miss)<br>50ms (cache hit) | **95% faster** |
| **Data Processing** | Client-side O(n²) | Server-side pre-aggregated | **98% CPU reduction** |
| **Monthly Cost** | R$ 80 + $500 GPS | R$ 73 (GPS: $0) | **$500+/month saved** |
| **Cache Hit Ratio** | 0% | 80%+ | **New capability** |
| **Query Distribution** | 100% Firestore | 60% BigQuery, 40% Firestore | **Optimized for workload** |
| **Scalability** | ~1,000 orders/day | Ready for 10,000+ orders/day | **10x capacity** |

### **Why Kappa Architecture?**

Traditional Lambda architecture requires maintaining two separate codebases (batch + streaming). Kappa simplifies this:

- **Single source of truth** (Firestore events)
- **Near real-time sync** (5-minute batch intervals via Cloud Scheduler)
- **Optimized data stores** for different access patterns:
  - **Firestore**: Low-latency operational data (<1s)
  - **BigQuery**: High-throughput analytics (1-2s, but handles 100K+ rows)
- **Progressive enhancement**: Cache layer provides <100ms response after first load
- **Cost-effective scaling**: 10x capacity increase with no infrastructure changes

---

## Data Engineering Architecture & Stack

### **Dual-Path Data Processing**

#### **Real-Time Path (Operational)**
- **Firebase Firestore** - Operational data store for live updates
- **Real-time listeners** - onSnapshot for instant order/status changes
- **WebSocket connections** - Push notifications via Firebase Cloud Messaging
- **Optimistic UI updates** - Sub-second user experience
- **Offline-first sync** - Automatic retry and conflict resolution

#### **Batch Path (Analytics)**
- **BigQuery Dataset** (`farmanossa_analytics`) - Columnar data warehouse
  - **Tables**: `orders` (68K+ rows), `deliverymen`, `pharmacy_units`, `delivery_runs` (67K+ runs)
  - **Partitioning**: By `DATE(created_at)` - 90% scan reduction
  - **Clustering**: By `pharmacy_unit_id`, `delivery_man`, `region` - Optimized query performance
- **Cloud Functions** (Serverless ETL)
  - `batchSync`: Firestore → BigQuery sync every 5 minutes (cost-optimized batch upload via temp files, **zeroing BigQuery write costs** vs real-time Firestore-BigQuery sync extension)
  - `bigqueryApi`: REST APIs with pre-aggregated queries using master query pattern
  - `syncReferenceData`: Real-time Firestore triggers for reference data sync
- **Cloud Scheduler** - Cron-based pipeline orchestration

### Data Ingestion Layer
- **OCR System** - Intelligent document processing for pharmacy POS screenshots
  - **Purpose**: Solves lack of POS API integration by processing sales screen screenshots
  - **Dual OCR engine**: Azure Cognitive Services + Tesseract.js
  - **95%+ accuracy** in field extraction (customer data, products, prices)
  - **Real-time validation** and normalization pipeline
- **Real-time GPS Tracking & Distance Calculation** - Cost-optimized geospatial data collection
  - **Native device geolocation** (React Native Location API) instead of Google Maps API
  - **Real-time coordinate streaming** during delivery runs stored in Firestore
  - **Haversine formula** for distance calculation (Google Maps-level accuracy, **zero API costs**)
  - **Dual purpose**: Distance tracking (67K+ runs) + live customer delivery tracking (CRM feature)
  - **Cost savings**: $0 vs estimated $500+/month for Google Maps Distance Matrix API
- **Real-time event streaming** from multiplatform mobile apps (client, delivery, admin)
- **Multi-source data ingestion** (GPS coordinates, order events, delivery status, OCR extractions)
- **Schema validation** and data quality checks at ingestion
- **Event-driven data collection** with automatic error handling

### Data Processing Engine (Multi-tier Architecture)
- **Serverless ETL pipelines** with Firebase Functions for batch operations
- **BigQuery pre-aggregations** - Server-side processing with CTEs (Common Table Expressions)
- **Client-side transformations** in mobile app for real-time operational data
- **Event-driven data processing** with automated triggers
- **Geospatial data processing** for location-based analytics
- **Stream processing** for real-time notifications and updates

#### **Advanced Caching Strategy (3-Layer)**
```typescript
// Stale-While-Revalidate Pattern
Layer 1: Memory Cache (Map)         → 10ms   (80% hit rate)
Layer 2: AsyncStorage (Persistent)  → 50ms   (15% hit rate)
Layer 3: BigQuery API (Network)     → 2s     (5% miss rate)
```


#### **Master Query Optimization**
Single BigQuery query with 9 CTEs (Common Table Expressions) returns all dashboard data:
```sql
WITH
  main_stats AS (...),           -- Primary KPIs
  top_regions AS (...),          -- Top 10 delivery zones
  hourly_dist AS (...),          -- Time series distribution
  deliveryman_stats AS (...),    -- Performance per driver (with JOIN)
  unit_stats AS (...),           -- Performance per pharmacy unit
  motorcycle_stats AS (...),     -- Fleet utilization metrics
  daily_dist AS (...),           -- Daily trend analysis
  deliverymen_list AS (...),     -- Reference data
  units_list AS (...)            -- Reference data

SELECT 
  (SELECT * FROM main_stats),
  ARRAY(SELECT * FROM top_regions) as regions,
  ARRAY(SELECT * FROM deliveryman_stats) as deliverymen,
  -- ... pre-aggregated metrics
```

**Result:** 7 sequential queries → 1 master query = **7x faster**

#### Dual Processing Architecture (Development & Production)
The data platform implements **flexible processing deployment** with identical data pipelines:

1. **`/backend/index.js`**: Local data processing server for development
   - Direct Express.js server for rapid ETL testing
   - Perfect for data pipeline development and debugging
   - Enables local data processing and transformation testing

2. **`/backend/functions/index.js`**: Serverless production data processing
   - Same data logic deployed as Google Cloud Functions
   - Auto-scaling serverless data processing
   - Production-grade event-driven data pipelines

> **💡 Data Engineering Benefits:** This architecture enables seamless development-to-production deployment of data pipelines while maintaining consistency in data processing logic and ensuring scalable, cost-effective production data processing.

### Cloud Data Infrastructure
- **Firebase Firestore** for real-time NoSQL operational database
- **Google BigQuery** for columnar data warehousing and analytics
- **Firebase Authentication** with multi-provider support
- **Firebase Functions** for serverless ETL processing
- **Cloud Scheduler** for automated pipeline orchestration
- **Google Maps API** integration for geospatial services
- **Expo Application Services** for build and deployment

---

## 🔄 **Production Data Pipelines**

### **Pipeline 1: Order Ingestion (OCR → Firestore)**
```
Sales Screen Screenshot
  ↓ (Azure OCR + Tesseract)
Extracted Data (JSON)
  ↓ (Validation + Normalization)
Firestore Document
  ↓ (Real-time listener triggers)
Mobile App Update (onSnapshot)
  ↓ (User assignment)
Delivery in Progress
```

**SLA:** <5 seconds end-to-end  
**Volume:** 1,000+ orders/day  
**Accuracy:** 95%+ field extraction

---

### **Pipeline 2: Analytics Sync (Firestore → BigQuery)**
```
Firestore Collection Changes
  ↓ (Cloud Scheduler: every 5 min)
batchSync Cloud Function
  ↓ (ETL transformations)
    • Region extraction (20+ Brasília regions)
    • Delivery time calculations
    • Data quality validations
    • Schema transformations
  ↓ (Batch insert with deduplication)
BigQuery orders Table
  ↓ (Partitioned by date, clustered by unit/driver/region)
Optimized for Analytics Queries
```

**Throughput:** 100 orders per execution  
**Latency:** Near real-time (5-minute sync window)  
**Cost:** FREE (under Cloud Functions free tier)

---

### **Pipeline 3: Dashboard Serving (BigQuery → Mobile)**
```
User Opens Dashboard
  ↓ (Check cache hierarchy)
Memory Cache? → Return in 10ms ✅
  ↓ (Cache miss)
AsyncStorage? → Return in 50ms ✅
  ↓ (Cache miss)
BigQuery API Call
  ↓ (Master query with 9 CTEs + JOINs)
Pre-aggregated Data (30+ metrics)
  ↓ (Transform to application format)
Mobile App Render
  ↓ (Background revalidation)
Cache Update (Stale-While-Revalidate)
```

**User Experience:** 
- First load: 2-3s
- Subsequent loads: <100ms
- Background updates: Transparent to user

---

### **Pipeline 4: Reference Data Sync (Real-Time Triggers)**
```
Firestore Collections
  • deliverymen (74 active drivers)
  • pharmacy_units (6 locations)
  ↓ (onCreate/onUpdate Firestore triggers)
syncReferenceData Cloud Function
  ↓ (Automatic real-time sync)
BigQuery Reference Tables
  ↓ (Used in JOINs for name resolution)
Dashboard with Human-Readable Data
```

**Automation:** Cloud Function triggers on Firestore write/update events  
**Benefit:** Eliminates 60% of Firestore reads per dashboard load  
**Latency:** <1 second from Firestore write to BigQuery sync

---

## Data Engineering Overview

**Farmanossa** is a **production-grade multiplatform delivery management system** implementing modern data engineering patterns with **Kappa Architecture**:

### Core Data Engineering Capabilities
- **Hybrid data architecture** with Firestore (operational) + BigQuery (analytical)
- **Real-time event streaming** with Firebase listeners processing delivery events
- **Serverless ETL pipelines** for batch data synchronization every 5 minutes
- **Pre-aggregated analytics** with BigQuery CTEs eliminating client-side processing
- **3-layer intelligent caching** with Stale-While-Revalidate pattern
- **Geospatial data processing** for route optimization and location intelligence  
- **Intelligent Document Processing (IDP)** with OCR-to-database pipelines
- **Real-time operational dashboards** with <100ms response times


#### **Latency & Response Times**
- **Dashboard Load**: 
  - Cold start: 2-3s (BigQuery master query)
  - Cache hit: 50-100ms (AsyncStorage)
  - Memory hit: <10ms (in-memory cache)
- **Real-time Updates**: <1s (Firestore onSnapshot)
- **OCR Pipeline**: <5s (screenshot → order creation)
- **BigQuery Query Execution**: 800ms average

#### **Cost Optimization & Efficiency**
- **Monthly Infrastructure Cost**: R$ 73
  - Firestore: R$ 72/month (60% read reduction via BigQuery)
  - BigQuery: R$ 0.96/month (queries + storage)
  - Cloud Functions: FREE (under 2M invocations/month)
  - GPS Distance Calculation: FREE (native device API + Haversine vs $500+/month Google Maps API)
- **Cost per Order**: R$ 0.0024 (highly cost-efficient)
- **Query Scan Reduction**: 90% via partitioning/clustering
- **Cache Hit Ratio**: 80%+ after warm-up
- **Geospatial Cost Savings**: $500+/month eliminated by using native GPS + Haversine formula

#### **Scalability**
- **Current Load**: 1,000 orders/day
- **Tested Capacity**: 10,000 orders/day with same infrastructure
- **Auto-scaling**: Serverless functions scale automatically
- **Zero Downtime**: 99.9% platform availability

---

## Data Engineering Capabilities & Use Cases

### Real-Time Delivery Management & Fleet Analytics
- **Live KPI dashboards** with sub-100ms data freshness (via intelligent caching)
- **Real-time order processing** with automated status tracking and performance metrics
- **Digital timesheet system** showing available delivery personnel and working hours
- **Delivery performance analytics** powered by BigQuery pre-aggregations
- **Fleet management optimization** with real-time deliveryman availability and assignment
- **Historical trend analysis** with 68K+ orders in data warehouse

### Advanced Analytics & Business Intelligence
- **Pre-aggregated metrics** computed server-side (30+ KPIs per dashboard load)
- **Master query pattern** with CTEs for complex multi-dimensional analysis
- **Partitioned queries** scanning only relevant date ranges (90% cost reduction)
- **Clustered storage** for optimal query performance on business dimensions
- **Real-time + historical views** combining Firestore (operational) + BigQuery (analytical)

### Geospatial Data Engineering & Location Intelligence
- **Real-time GPS data streams** with geofencing validation and alerts
- **67,000+ tracked delivery runs** stored in BigQuery for pattern analysis
- **Cost-optimized distance calculation** using Haversine formula on device GPS coordinates
  - **Native geolocation API** (React Native) replaces Google Maps Distance Matrix API
  - **Real-time coordinate streaming** to Firestore during active deliveries
  - **Post-delivery distance calculation** with Haversine algorithm (±5m accuracy)
  - **Cost savings**: $0 vs $500+/month for Google Maps API calls
  - **Dual benefit**: Distance metrics + live customer tracking (CRM feature)
- **Spatial data processing** for route optimization and territory analysis
- **Geospatial analytics** for delivery efficiency and coverage optimization
- **Historical location data warehousing** for machine learning and predictive insights
- **Region extraction and clustering** (40+ Brasília neighborhoods mapped)

### Order & Delivery Data Management
- **Event-sourced order state management** with complete audit trails
- **Real-time order processing** with automated status updates and tracking
- **Cross-system data integration** between pharmacy POS and delivery systems
- **Data quality monitoring** with automated validation and cleansing

### Customer Data Platform & Experience Analytics
- **Real-time delivery tracking** with live GPS location sharing to customers
- **Push notification system** for instant order status updates
- **Customer journey mapping** with delivery status visibility and timeline
- **Multi-channel communication** ensuring customers stay informed throughout delivery process

---

## 🏆 **Data Engineering Highlights**

### **1. Kappa Architecture Implementation**
- **Hybrid approach**: Firestore (operational, real-time) + BigQuery (analytical, batch)
- **Single source of truth**: All events originate from Firestore
- **Near real-time sync**: 5-minute batch windows balance cost and freshness
- **Optimized for workload**: Right tool for the right job (NoSQL vs columnar)

### **2. Advanced Caching Strategies**
- **Stale-While-Revalidate Pattern**: Instant UI updates with background refresh
- **3-Layer Cache Hierarchy**: Memory (10ms) → AsyncStorage (50ms) → API (2s)
- **TTL-based Invalidation**: Dynamic TTL based on data volatility (5min to 1hr)
- **80% cache hit ratio**: Eliminates 80% of API calls after warm-up

### **3. Query Optimization Techniques**
- **Master Query with CTEs**: 9 Common Table Expressions in single query
- **Partitioning by date**: 90% query scan reduction
- **Clustering by dimensions**: Physical data organization by unit/driver/region
- **7x performance improvement**: Sequential queries → parallel execution

### **4. Serverless ETL Pipeline Design**
- **Event-driven execution**: Cloud Scheduler triggers Cloud Functions
- **Near real-time sync**: 5-minute intervals (cost-effective)
- **Idempotent processing**: Safe for retry and failure recovery
- **Auto-scaling**: Handles 100+ orders per execution, scales to 10K+ daily

### **5. Cost-Effective Scalability**
- **Current**: R$ 73/month for 1,000 orders/day
- **Projected**: Same cost for 10,000 orders/day (BigQuery scales horizontally)
- **Free tiers maximized**:
  - Cloud Functions: <2M invocations/month = FREE
  - BigQuery: 1TB queries/month = FREE
  - Cloud Scheduler: 3 jobs/month = FREE
  - Native GPS: FREE vs $500+/month Google Maps Distance Matrix API
- **10x growth capacity** with no infrastructure changes

### **6. Intelligent Cost Optimization - GPS Distance Calculation**
- **Problem**: Google Maps Distance Matrix API would cost $500+/month for 67K+ delivery runs
- **Solution**: Native device geolocation (React Native) + Haversine formula
- **Implementation**: 
  - Stream GPS coordinates to Firestore during active deliveries (real-time tracking)
  - Calculate distance post-delivery using Haversine algorithm on coordinate array
  - Accuracy: ±5 meters (equivalent to Google Maps)
- **Benefits**: 
  - **$500+/month saved** (100% cost elimination)
  - Real-time customer tracking (CRM feature, no additional cost)
  - Historical geospatial data for ML/analytics (67K+ runs in BigQuery)
- **Result**: Google Maps-level accuracy with zero API costs

### **7. Performance Engineering**
- **95% dashboard load improvement**: 90s → 2-3s (cold) or 50ms (cached)
- **98% CPU reduction**: Eliminated client-side O(n²) processing
- **Sub-second query execution**: 800ms average BigQuery response
- **Sub-100ms cached responses**: 80% of requests after warm-up

---

## 💼 **Technical Skills Demonstrated**

### **Data Engineering**
- ✅ **Kappa Architecture** design and implementation
- ✅ **Batch & Stream Processing** hybrid patterns
- ✅ **Serverless ETL Pipelines** with Cloud Functions
- ✅ **Data Warehousing** with BigQuery (partitioning, clustering, CTEs)
- ✅ **Query Optimization** (master queries, JOINs, window functions)
- ✅ **Intelligent Caching** (multi-layer, Stale-While-Revalidate)
- ✅ **Performance Engineering** (95% improvement, 98% CPU reduction)
- ✅ **Cost Optimization** (9% reduction, free tier maximization)

### **Cloud & Infrastructure**
- ✅ **Google Cloud Platform** (BigQuery, Cloud Functions, Cloud Scheduler)
- ✅ **Serverless Architecture** (auto-scaling, pay-per-use)
- ✅ **Firebase Ecosystem** (Firestore, Authentication, Cloud Messaging)
- ✅ **Hybrid Database Strategy** (NoSQL + Columnar warehousing)
- ✅ **Geospatial Processing** (Google Maps API, region clustering)

### **Software Engineering**
- ✅ **React Native/Expo** mobile development
- ✅ **TypeScript** type-safe data transformations
- ✅ **Clean Architecture** patterns (separation of concerns)
- ✅ **OCR Integration** (Azure Cognitive Services + Tesseract)
- ✅ **Real-time Systems** (WebSocket, push notifications)

---

## 📱 **Pharmacy OCR Integration - Pipeline Entry Point**

### **Sales Screen Processing System**

The Farmanossa ecosystem **begins** with a sophisticated **OCR-powered data extraction system** that serves as the **primary entry point** for all delivery orders. This system processes screenshots of pharmacy sales screens, transforming visual data into structured delivery orders.

#### **OCR System as Pipeline Initiator:**
- 📱 **Sales Screen Capture** - Screenshots from pharmacy point-of-sale systems
- 🧠 **Dual OCR engine architecture** (Azure Cognitive Services + Tesseract.js)
- 🔍 **Intelligent field extraction** (customer data, products, prices)
- 🔄 **Real-time data validation** and normalization
- 📊 **Instant order creation** - Orders immediately available in delivery app
- 🎯 **95%+ accuracy** in text recognition and data extraction

#### **Complete Data Transformation Pipeline:**
```javascript
Sales Screen Screenshot → OCR Processing → Data Extraction → 
Customer Info Parsing → Product Identification → Price Calculation →
Order Validation → Firebase Integration → Delivery Order Creation
```

#### **Integration Benefits:**
- **100% digital transformation** - No manual data entry required
- **Real-time order availability** - Orders instantly appear in delivery app
- **95% improvement** in data accuracy vs manual entry
- **60% faster** order-to-delivery workflow
- **Seamless automation** from sale to delivery assignment

### **Technical Implementation:**
```typescript
// OCR data flows directly into delivery system
interface ExtractedOrderData {
  orderId: string;
  clientName: string;
  phone: string;
  address: string;
  products: Product[];
  totalValue: number;
  processingMetadata: OCRMetadata;
}
```

**Repository:** [Pharmacy OCR System](https://github.com/HenryFroio/pharmacy-ocr-demo)

---

## 🌐 **Complete Ecosystem Overview**

### **Integrated Platform Components:**
1. **OCR Processing System** (React Web) - Sales screen digitization and order extraction
2. **Mobile Delivery App** (React Native) - Multiplatform delivery management (client, deliverer, admin)
3. **Firebase + BigQuery Backend** - Hybrid operational + analytical data layer
4. **Cloud Functions** - Serverless ETL pipelines and API endpoints
5. **Native GPS Tracking** - Real-time geolocation with Haversine distance calculation (zero API costs)

### **End-to-End Data Flow:**
```
POS Screenshot → OCR Extraction → Firestore (operational) → Mobile Apps
                                          ↓ (5-min sync)    ↓ (GPS stream)
                                    BigQuery (analytics) → Cached Dashboards
                                    delivery_runs (67K+)
```

---

## 💼 **Portfolio & Technical Expertise**

### **Key Capabilities Demonstrated:**
- **Kappa Architecture** - Hybrid real-time + batch processing
- **Data Warehousing** - BigQuery with partitioning, clustering, and CTEs
- **Serverless ETL** - Cost-optimized Cloud Functions pipelines
- **Intelligent Caching** - 3-layer Stale-While-Revalidate strategy (80%+ hit ratio)
- **Cost-Optimized Geospatial** - Native GPS + Haversine formula ($500+/month saved vs Google Maps API)
- **OCR Integration** - Automated POS screenshot processing (95%+ accuracy)
- **Performance Engineering** - 95% dashboard improvement (90s → 2s)
- **Cost Optimization** - $500+/month savings through architectural decisions
- **Full-Stack Mobile** - React Native multiplatform (client, deliverer, admin)

### **Production Metrics:**
- **1,000+ daily orders** | **68K+ historical orders** | **67K+ GPS-tracked runs**
- **99.9% uptime** | **<100ms cached responses** | **R$ 0.0024 cost per order**
- **$0 GPS costs** (saved $500+/month) | **±5m accuracy** (Haversine formula)

### **For Professional Evaluation:**
- **Code Review:** Available for technical assessment
- **Architecture Discussion:** Kappa implementation, BigQuery optimization, caching strategies
- **Contact:** henry.froio@outlook.com for data engineering, ETL pipelines, or performance optimization questions

---

## 📞 **Professional Contact**

**Henry Froio**  
*Data Engineer & Software Engineer*

Specialized in **Kappa Architecture**, **BigQuery data warehousing**, **high-performance ETL pipelines**, and **intelligent document processing** for healthcare and logistics industries.

- **Email:** henry.froio@outlook.com
- **LinkedIn:** https://www.linkedin.com/in/henry-froio-827816238/
- **Portfolio:** https://henryfroio.com
- **GitHub:** https://github.com/HenryFroio

**Project Information:**
- **Farmanossa Delivery System** - Proprietary multiplatform delivery management system
- **Owner:** CSP COMERCIO DE MEDICAMENTOS LTDA
- **Developer:** Henry Froio

---

## 📄 **License & Usage**

**© 2025 CSP COMERCIO DE MEDICAMENTOS LTDA. All rights reserved.**

This software is **proprietary and confidential**. Developed by **Henry Froio** for CSP COMERCIO DE MEDICAMENTOS LTDA.

- **License:** Proprietary - Not for public use, modification, or distribution
- **Purpose:** Portfolio demonstration and technical showcase
- **Contact:** henry.froio@outlook.com for licensing inquiries

---

⭐ **If this project demonstrates valuable technical skills for your team, please star the repository!**

**Keywords:** Kappa Architecture, BigQuery, Data Warehousing, ETL Pipelines, React Native, Firebase, OCR, Data Engineering, Real-time Processing, Serverless, Healthcare Tech, Mobile Development, TypeScript, Cloud Architecture, Performance Optimization
