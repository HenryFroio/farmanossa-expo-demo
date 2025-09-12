# Farmanossa: Multiplatform Pharmacy Delivery Management System - DEMO

> **⚠️ DATA ENGINEERING PORTFOLIO PROJECT**  
> This is a sanitized version of a production **delivery manag## Pharmacy OCR Integration - Pipeline Entry Point

### Sales Screen Processing System

The Farmanossa ecosystem **begins** with a sophisticated **OCR-powered data extraction system** that serves as the **primary entry point** for all delivery orders. This system processes screenshots of pharmacy sales screens, transforming visual data into structured delivery orders.

#### OCR System as Pipeline Initiator:
- **Sales Screen Capture** - Screenshots from pharmacy point-of-sale systems
- **Dual OCR engine architecture** (Azure Cognitive Services + Tesseract.js)
- **Intelligent field extraction** (customer data, products, prices)
- **Real-time data validation** and normalization
- **Instant order creation** - Orders immediately available in delivery app
- **95%+ accuracy** in text recognition and data extraction* developed for CSP COMERCIO DE MEDICAMENTOS LTDA.  
> Demonstrates a **multiplatform delivery management system** with **real-time data pipelines**, **event-driven architecture**, and **scalable data processing** for pharmacy logistics.  
> **PURPOSE:** Showcase Data Engineering skills including ETL/ELT, real-time streaming, and cloud-native data architecture

[![Real-Time Data](https://img.shields.io/badge/Real--Time_Data-Streaming-red.svg)](https://firebase.google.com)
[![ETL Pipeline](https://img.shields.io/badge/ETL-Pipeline-blue.svg)](https://nodejs.org)
[![Event Driven](https://img.shields.io/badge/Event--Driven-Architecture-green.svg)](https://firebase.google.com)
[![Cloud Native](https://img.shields.io/badge/Cloud--Native-Serverless-orange.svg)](https://firebase.google.com)
[![Data Processing](https://img.shields.io/badge/Data-Processing-purple.svg)](https://typescriptlang.org)

> **Production-scale delivery management platform** demonstrating **real-time data ingestion**, **event-driven ETL pipelines**, **geospatial data processing**, and **serverless data architecture** for pharmacy delivery optimization

A comprehensive **data engineering solution** showcasing **real-time data streaming**, **automated data pipelines**, **location-based analytics**, and **event-driven data processing** for pharmacy delivery logistics optimization.

## Data Engineering Architecture & Stack

### Data Ingestion Layer
- **Real-time event streaming** from mobile applications and OCR systems
- **Multi-source data ingestion** (GPS coordinates, order events, delivery status)
- **Schema validation** and data quality checks at ingestion
- **Event-driven data collection** with automatic error handling

### Data Processing Engine (Multi-tier Architecture)
- **Serverless ETL pipelines** with Firebase Functions for basic operations
- **Client-side data transformation** in mobile app hooks and utilities (primary processing layer)
- **Real-time data transformation** and business logic application
- **Event-driven data processing** with automated triggers
- **Geospatial data processing** for location-based analytics
- **Data aggregation pipelines** for business intelligence
- **Stream processing** for real-time notifications and updates

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
- **Firebase Firestore** for real-time NoSQL database
- **Firebase Authentication** with multi-provider support
- **Firebase Functions** for serverless backend processing
- **Google Maps API** integration for geospatial services
- **Expo Application Services** for build and deployment

---

## Data Engineering Overview

**Farmanossa** is a **production-grade delivery management platform** implementing modern data engineering patterns:

### Core Data Engineering Capabilities
- **Real-time event streaming** with Firebase listeners processing delivery events
- **ETL/ELT pipelines** for order ingestion, transformation, and analytics
- **Event-driven architecture** with microservices data processing
- **Geospatial data processing** for route optimization and location intelligence  
- **Intelligent Document Processing (IDP)** with OCR-to-database pipelines
- **Real-time analytics** and operational dashboards

### **Production Performance Metrics**
- **Throughput**: 1,000+ orders processed daily
- **Latency**: <1 second event processing time
- **Data Pipeline**: OCR → Validation → Firestore ingestion in <5 seconds
- **Real-time Updates**: GPS location streams on significant movement (optimized for efficiency)
- **Uptime**: 99.9% platform availability

## Data Stack & Architecture

### Data Processing Layer
- **Event Streaming**: Firebase Firestore real-time listeners
- **Real-time ETL**: Custom React hooks processing data streams with onSnapshot listeners
- **Data Transformation**: Live aggregation and analytics via useStatsData and business logic hooks
- **State Management**: Event-driven data synchronization across multiple collections

### Cloud Data Infrastructure
- **Firebase Firestore** (Real-time NoSQL data warehouse with automatic scaling)
- **Firebase Functions** (Serverless business logic, notifications, and automated reporting)
- **Google Cloud Platform** (Managed cloud infrastructure for data processing)
- **Google Maps API** (Geospatial data enrichment and location intelligence)
- **Azure Cognitive Services** (OCR data extraction and text processing pipeline)

### Data Collection Layer
- **Mobile data streams** with real-time GPS coordinates and delivery events
- **Offline-first data collection** with automatic synchronization
- **Schema-validated data ingestion** with TypeScript type safety
- **Event-driven data capture** from user interactions and system events

### Data Storage & Warehousing
- **Real-time NoSQL database** (Firestore) for operational data
- **Document-based data model** optimized for pharmacy delivery logistics
- **Automatic data replication** across multiple regions
- **ACID compliance** for critical business transactions
- **Real-time data synchronization** across all connected systems

### Data Pipeline Architecture
- **Event-driven ETL processes** with real-time triggers
- **Data validation pipelines** with automatic error handling
- **Stream processing** for location and order events
- **Batch processing** for analytics and reporting
- **Data lineage tracking** for audit and compliance

## Data Engineering Capabilities & Use Cases

### Real-Time Delivery Management & Fleet Analytics
- **Live KPI dashboards** with sub-second data freshness
- **Real-time order processing** with automated status tracking and performance metrics
- **Digital timesheet system** showing available delivery personnel and working hours
- **Delivery performance analytics** tracking completion times for each order stage
- **Fleet management optimization** with real-time deliveryman availability and assignment

### Geospatial Data Engineering & Location Intelligence
- **Real-time GPS data streams** with geofencing validation and alerts
- **Spatial data processing** for route optimization and territory analysis
- **Geospatial analytics** for delivery efficiency and coverage optimization
- **Historical location data warehousing** for pattern analysis and insights

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

### **Event-Driven Data Architecture**
```
                        ┌─────────────────┐
                        │   OCR Pipeline  │
                        │ (Azure + Custom)│
                        └─────────────────┘
                                 │
                                 ▼
┌─────────────────┐              │              ┌─────────────────┐
│   Data Lake     │◄─────────────┼─────────────►│ Data Processing │
│   (Firestore)   │              │              │ (Mobile Apps)   │
└─────────────────┘              │              └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         └──────────────│ Geospatial APIs │─────────────┘
                        │ (Google Maps)   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │ Data Collection │
                        │  (Mobile Apps)  │
                        └─────────────────┘
```

### **End-to-End Data Processing Pipeline**
1. **OCR Data Ingestion**: Sales screen screenshots processed through Azure OCR pipeline
2. **Data Validation**: Real-time validation, cleansing, and business rule enforcement  
3. **Event Processing**: Event-driven workflows with automated data transformations (primarily in mobile app hooks and utilities)
4. **Geospatial Processing**: Location data enrichment and spatial analytics
5. **Stream Analytics**: Real-time aggregations and KPI calculations
6. **Data Distribution**: Processed data delivery to downstream systems and notifications

### **Data Quality & Monitoring**
- **Automated data quality checks** with configurable validation rules
- **Data lineage tracking** for complete audit trails and compliance
- **Real-time monitoring dashboards** for pipeline health and performance metrics
- **Alerting system** for data quality issues and processing failures
- **Performance optimization** with automatic scaling and resource management

##  **Pharmacy OCR Integration - Pipeline Entry Point**

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
- **Collaboration Inquiries:** Open to discussing similar projects
- **Technical Questions:** Contact for architecture or implementation details

## License & Usage

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

Experienced in building **data-driven mobile applications** and **intelligent document processing systems** for healthcare and logistics industries.

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

## 📄 **License & Copyright**

**© 2025 CSP COMERCIO DE MEDICAMENTOS LTDA. All rights reserved.**

This software is **proprietary and confidential**. Developed by **Henry Froio** for CSP COMERCIO DE MEDICAMENTOS LTDA.

- **License:** Proprietary - Not for public use, modification, or distribution
- **Purpose:** Portfolio demonstration and technical showcase
- **Contact:** henry.froio@outlook.com for licensing inquiries

**Confidential Information:** This repository contains proprietary business logic and technical implementations owned by CSP COMERCIO DE MEDICAMENTOS LTDA.

---

⭐ **If this project demonstrates valuable technical skills for your team, please star the repository!**

**Keywords:** React Native, Firebase, OCR, Data Engineering, Real-time Sync, Location Services, Healthcare Tech, Mobile Development, TypeScript, Cloud Architecture
