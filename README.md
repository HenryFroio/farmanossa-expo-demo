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

The platform implements a **Kappa-inspired hybrid architecture** optimizing for both operational real-time needs and analytical performance:

```
┌────────────────────────────────────────────────────────┐
│  KAPPA ARCHITECTURE - DUAL PROCESSING PATHS            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────┐                                      │
│  │  FIRESTORE  │  (Real-Time Operational Layer)       │
│  │ Operational │  • Live order updates                │
│  │    Store    │  • GPS tracking streams              │
│  └──────┬──────┘  • Status changes                    │
│         │         • Push notifications                │
│         │                                              │
│         ├─────────────┐                               │
│         │             │                               │
│         ▼             ▼                               │
│  ┌─────────┐   ┌──────────────┐                      │
│  │ Mobile  │   │   Cloud      │                       │
│  │  Apps   │   │  Functions   │                       │
│  └─────────┘   │ (batchSync)  │                       │
│                 └──────┬───────┘                       │
│                        │ Every 5 min                  │
│                        ▼                               │
│                 ┌──────────────┐                       │
│                 │   BIGQUERY   │ (Analytics Layer)    │
│                 │   Dataset    │ • Historical data    │
│                 │ farmanossa_  │ • Pre-aggregations   │
│                 │  analytics   │ • Business intel     │
│                 └──────┬───────┘ • Reporting          │
│                        │                               │
│                        ▼                               │
│                 ┌──────────────┐                       │
│                 │  BigQuery    │                       │
│                 │    APIs      │                       │
│                 │(Cloud Funcs) │                       │
│                 └──────┬───────┘                       │
│                        │                               │
│                        ▼                               │
│                 ┌──────────────┐                       │
│                 │  3-Layer     │                       │
│                 │    Cache     │                       │
│                 │ (MMKV/Async) │                       │
│                 └──────────────┘                       │
└────────────────────────────────────────────────────────┘
```

### **Performance Transformation**

| Metric | Before (Firestore Only) | After (Kappa + BigQuery) | Improvement |
|--------|-------------------------|---------------------------|-------------|
| **Dashboard Load Time** | 90+ seconds | 2-3 seconds (cache miss)<br>50ms (cache hit) | **95% faster** |
| **Data Processing** | Client-side O(n²) | Server-side pre-aggregated | **98% CPU reduction** |
| **Monthly Cost** | R$ 80 | R$ 73 | **9% cost reduction** |
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
  - `batchSync`: Firestore → BigQuery sync every 5 minutes
  - `bigqueryApi`: REST APIs with pre-aggregated queries using master query pattern
  - `syncReferenceData`: Master data synchronization
- **Cloud Scheduler** - Cron-based pipeline orchestration

### Data Ingestion Layer
- **Real-time event streaming** from mobile applications and OCR systems
- **Multi-source data ingestion** (GPS coordinates, order events, delivery status)
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

**TTL Configuration:**
- `today`: 5 min (high data volatility)
- `week`: 15 min
- `month`: 30 min
- `all`: 1 hour (historical data stability)

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
  -- ... 30+ pre-aggregated metrics
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
    • Region extraction (40+ Brasília regions)
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

### **Pipeline 4: Reference Data Sync**
```
Firestore Collections
  • deliverymen (74 active drivers)
  • pharmacy_units (6 locations)
  ↓ (Manual trigger or scheduled)
syncReferenceData Function
  ↓ (Full table replacement strategy)
BigQuery Reference Tables
  ↓ (Used in JOINs for name resolution)
Dashboard with Human-Readable Data
```

**Benefit:** Eliminates 60% of Firestore reads per dashboard load  
**Frequency:** On-demand or daily sync

---

## Data Engineering Overview

**Farmanossa** is a **production-grade delivery management platform** implementing modern data engineering patterns with **Kappa Architecture**:

### Core Data Engineering Capabilities
- **Hybrid data architecture** with Firestore (operational) + BigQuery (analytical)
- **Real-time event streaming** with Firebase listeners processing delivery events
- **Serverless ETL pipelines** for batch data synchronization every 5 minutes
- **Pre-aggregated analytics** with BigQuery CTEs eliminating client-side processing
- **3-layer intelligent caching** with Stale-While-Revalidate pattern
- **Geospatial data processing** for route optimization and location intelligence  
- **Intelligent Document Processing (IDP)** with OCR-to-database pipelines
- **Real-time operational dashboards** with <100ms response times

### **Production Performance Metrics**
- **Historical Data**: 68,000+ orders in BigQuery warehouse
- **Delivery Runs Tracked**: 67,000+ GPS-tracked delivery runs
- **Daily Throughput**: 1,000+ orders processed
- **Concurrent Users**: 74 delivery drivers + 6 pharmacy units
- **Peak Capacity**: Ready for 10,000 orders/day (10x current volume)

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
- **Cost per Order**: R$ 0.0024 (highly cost-efficient)
- **Query Scan Reduction**: 90% via partitioning/clustering
- **Cache Hit Ratio**: 80%+ after warm-up

#### **Scalability**
- **Current Load**: 1,000 orders/day, 74 active users
- **Tested Capacity**: 10,000 orders/day with same infrastructure
- **Auto-scaling**: Serverless functions scale automatically
- **Zero Downtime**: 99.9% platform availability

## Data Stack & Architecture

### **Modern Data Stack**

#### **Data Warehousing Layer**
- **Google BigQuery** - Columnar data warehouse
  - Serverless, auto-scaling analytics engine
  - Partitioned by date for optimal query performance
  - Clustered by business dimensions (unit, driver, region)
  - Handles 100K+ rows with sub-second queries

#### **Operational Data Layer**
- **Firebase Firestore** - Real-time NoSQL database
  - Document-based data model for flexible schemas
  - Real-time synchronization across all clients
  - Offline-first with automatic conflict resolution
  - ACID compliance for critical transactions

#### **Processing Layer**
- **Cloud Functions** - Serverless ETL/ELT processing
  - Event-driven execution (no idle costs)
  - Auto-scaling based on load
  - Integrated with Cloud Scheduler for batch jobs

#### **Caching Layer**
- **MMKV** - High-performance in-memory cache
- **AsyncStorage** - Persistent local cache
- **Stale-While-Revalidate** - Progressive enhancement strategy

### Data Collection Layer
- **Mobile data streams** with real-time GPS coordinates and delivery events
- **Offline-first data collection** with automatic synchronization
- **Schema-validated data ingestion** with TypeScript type safety
- **Event-driven data capture** from user interactions and system events

### Data Storage & Warehousing
- **BigQuery Dataset** (`farmanossa_analytics`) for analytical workloads
  - **orders** table: 68K+ delivery orders with full history
  - **deliverymen** table: 74 active drivers with aggregated stats
  - **pharmacy_units** table: 6 locations with performance metrics
  - **delivery_runs** table: 67K+ GPS-tracked delivery runs
- **Firestore Collections** for operational workloads
  - Real-time data synchronization across all connected systems
  - Automatic data replication across multiple regions
  - Optimized for low-latency reads/writes (<100ms)

### Data Pipeline Architecture
- **Event-driven ETL processes** with Cloud Scheduler triggers
- **Near real-time sync** (5-minute batch windows)
- **Data validation pipelines** with automatic error handling
- **Stream processing** for location and order events
- **Pre-aggregation strategy** for analytics (server-side processing)
- **Idempotent operations** for safe retry logic

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

## Data Engineering Architecture & Processing Flow

### **Kappa Architecture - Event-Driven Processing**
```
                        ┌─────────────────┐
                        │   OCR Pipeline  │
                        │ (Azure + Custom)│
                        └─────────────────┘
                                 │
                                 ▼
┌─────────────────┐              │              ┌─────────────────┐
│  Operational    │              │              │  Analytics      │
│  Data Store     │◄─────────────┼─────────────►│  Warehouse      │
│  (Firestore)    │    5-min     │              │  (BigQuery)     │
└─────────────────┘    Sync      │              └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         └──────────────│ Geospatial APIs │─────────────┘
                        │ (Google Maps)   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │ Data Collection │
                        │  (Mobile Apps)  │
                        │  + 3-Layer      │
                        │     Cache       │
                        └─────────────────┘
```

### **End-to-End Data Processing Pipeline**
1. **OCR Data Ingestion**: Sales screen screenshots processed through Azure OCR pipeline
2. **Real-time Distribution**: Events published to Firestore for operational systems
3. **Batch ETL**: 5-minute sync windows move data to BigQuery for analytics
4. **Pre-aggregation**: Server-side computations with CTEs and window functions
5. **Intelligent Caching**: 3-layer cache (Memory → AsyncStorage → API)
6. **Data Serving**: Sub-100ms response times for 80%+ of requests

### **Data Quality & Monitoring**
- **Automated schema validation** with TypeScript types and Firestore security rules
- **Business rule enforcement** in ETL layer (data quality checks)
- **Real-time monitoring dashboards** for pipeline health and performance metrics
- **Cost tracking** with BigQuery scan metrics and daily budget alerts
- **Performance optimization** with automatic scaling and resource management
- **Cache performance metrics** (hit ratio, memory usage, TTL effectiveness)

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
- **10x growth capacity** with no infrastructure changes

### **6. Performance Engineering**
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

## Complete Ecosystem Overview

### End-to-End Data Pipeline:
```
Sales Screen → OCR Processing → Data Extraction → Order Creation → 
Delivery Assignment → Mobile App → GPS Tracking → Customer Delivery
```

### Integrated Platform Components:
1. **OCR Processing System** (React Web) - **ENTRY POINT:** Sales screen digitization 
2. **Mobile Delivery App** (React Native) - Core delivery management
3. **Firebase Backend** - Unified data layer and real-time sync
4. **Analytics Dashboard** - Business intelligence and reporting
5. **Location Services** - GPS tracking and route optimization

### **Complete Data Flow Across Systems:**
```
Sales Screen Screenshot → OCR System → Extracted Order Data → 
Firebase Firestore → Mobile App (Order Available) → 
Delivery Person Selection → GPS Tracking → Customer Notification → 
Delivery Completion → Analytics & Reporting
```

#### Pipeline Stages:
1. **Data Ingestion:** OCR processes sales screen screenshots
2. **Data Processing:** Extract customer info, products, prices
3. **Data Validation:** Real-time validation and normalization
4. **Order Creation:** Automatic order creation in Firebase
5. **Delivery Management:** Orders appear in mobile app
6. **Assignment:** Delivery personnel select available orders
7. **Tracking:** Real-time GPS tracking and customer updates
8. **Completion:** Delivery confirmation and analytics

## Portfolio & Technical Expertise

### **This is a Professional Portfolio Project demonstrating:**
- **Full-stack mobile development** with React Native/Expo
- **Real-time data engineering** with Firebase and custom hooks ETL processing
- **Cloud architecture** design and implementation
- **OCR and data processing** pipeline development
- **Enterprise-level authentication** and security
- **Clean Architecture** principles and SOLID design patterns
- **Geospatial data processing** and location intelligence
- **Scalable microservices** architecture

### **Business Impact & Performance:**
- **+1,000 daily deliveries** processed with 99.9% system uptime
- **<2 second** average app load time with optimized data fetching
- **Real-time synchronization** across all user devices and roles
- **95% GPS accuracy** for delivery tracking and route optimization
- **Sub-second** Firebase query response times
- **Operational efficiency** improvements through automation and real-time fleet management

### For Professional Evaluation:
- **Code Review:** Available for technical assessment
- **Employer Evaluation:** Full documentation provided for hiring review
- **Architecture Discussion:** Open to discussing Kappa implementation, BigQuery optimization, and caching strategies
- **Technical Questions:** Contact for details on data engineering, ETL pipelines, or performance optimization

---

This is a **proprietary software project** owned by **CSP COMERCIO DE MEDICAMENTOS LTDA** and developed for portfolio demonstration purposes.

**Ownership & Development:**
- **Owner:** CSP COMERCIO DE MEDICAMENTOS LTDA
- **Developer:** Henry Froio
- **Copyright:** 2025

**Usage Rights:**
- **Portfolio Viewing:** Free to view and evaluate for hiring purposes
- **Code Review:** Available for technical assessment by employers
- **Commercial Use:** Not licensed for commercial deployment
- **Redistribution:** Code may not be copied or redistributed

For licensing inquiries or collaboration opportunities, please contact directly.

## Professional Contact

**Henry Froio**  
*Data Engineer & Software Engineer*

Experienced in building **data-driven mobile applications**, **data warehousing solutions**, and **intelligent document processing systems** for healthcare and logistics industries. Specialized in **Kappa Architecture**, **BigQuery optimization**, and **high-performance data pipelines**.

- **Email:** henry.froio@outlook.com
- **LinkedIn:** https://www.linkedin.com/in/henry-froio-827816238/
- **Portfolio:** https://henryfroio.com
- **GitHub:** https://github.com/HenryFroio

### Project Information:
- **Farmanossa Delivery App:** Proprietary system owned by CSP COMERCIO DE MEDICAMENTOS LTDA
- **Pharmacy OCR System:** Integrated document processing solution
- **Company:** CSP COMERCIO DE MEDICAMENTOS LTDA
- **Lead Developer:** Henry Froio

---

## License & Usage

This is a **proprietary software project** owned by **CSP COMERCIO DE MEDICAMENTOS LTDA** and developed for portfolio demonstration purposes.

**© 2025 CSP COMERCIO DE MEDICAMENTOS LTDA. All rights reserved.**

This software is **proprietary and confidential**. Developed by **Henry Froio** for CSP COMERCIO DE MEDICAMENTOS LTDA.

- **License:** Proprietary - Not for public use, modification, or distribution
- **Purpose:** Portfolio demonstration and technical showcase
- **Contact:** henry.froio@outlook.com for licensing inquiries

**Confidential Information:** This repository contains proprietary business logic and technical implementations owned by CSP COMERCIO DE MEDICAMENTOS LTDA.

---

⭐ **If this project demonstrates valuable technical skills for your team, please star the repository!**

**Keywords:** Kappa Architecture, BigQuery, Data Warehousing, ETL Pipelines, React Native, Firebase, OCR, Data Engineering, Real-time Processing, Serverless, Healthcare Tech, Mobile Development, TypeScript, Cloud Architecture, Performance Optimization
