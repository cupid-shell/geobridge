# GeoBridge

> **In-Browser Self-Service Spatial Calculator & Multi-Stage GIS Pipeline Engine**  
> Eliminating the spatial bottleneck by enabling GIS specialists to publish high-performance, reproducible spatial calculation recipes and pipelines for sales, operations, marketing, and finance teams — running 100% in-browser with zero server cost and zero data egress.

---

## Executive Overview

In most organizations, GIS specialists spend 30-40% of their time fulfilling repetitive spatial requests:
- *"Which sales territory and regional lead do these 20,000 accounts belong to?"*
- *"Are any of these store addresses inside designated flood or seismic hazard zones?"*
- *"Can you calculate highway mileage and routing codes to the closest logistics fulfillment hub?"*

Business teams typically wait **2 to 5 business days** for simple spatial joins in QGIS/ArcGIS, while GIS specialists are kept from high-value modeling and spatial data science.

GeoBridge provides a **two-sided enterprise platform**:
1. **GIS Recipe Studio (For GIS Specialists):** Upload authoritative reference layers (GeoJSON), build spatial join recipes or chained multi-stage pipelines, map output attributes, configure fallback values, and export self-contained `.georecipe` packages.
2. **Self-Service Analysis Portal (For Business Users):** Drop spreadsheets (`.xlsx`, `.xls`, `.csv`), select a recipe or drop a `.georecipe` package, auto-detect coordinates or use offline postal codes, and download dual-sheet enriched workbooks with executive audit trails and 1-click exception reports.

---

## Key Capabilities

### 1. High-Performance Spatial Engine (Web Worker + Flatbush R-Tree)
- **Packed Hilbert R-Tree Indexing:** Replaced brute-force $O(N \times M)$ ray-casting loops with $O(\log M)$ spatial indexing via `Flatbush`, enabling fast candidate polygon filtering.
- **Centroid Precomputation & Caching:** Precomputes polygon and facility centroids upfront during index construction, eliminating tens of millions of redundant centroid calculations in nearest-neighbor joins.
- **Non-Blocking Background Worker:** All heavy spatial joins and distance calculations execute in an isolated Web Worker (`spatial.worker.ts`), keeping the main UI at 60 FPS without tab freezing or browser unresponsive prompts.

### 2. Modernized Storage Layer (IndexedDB via Dexie.js)
- **No 5MB LocalStorage Ceiling:** All reference layers and custom recipes persist in client-side IndexedDB.
- **Large Dataset Support:** Handles boundary layers up to 500MB+ stored asynchronously in local browser memory.

### 3. Corporate Data Sanitizer & Offline Postal Centroid Resolver
- **Leading-Zero Restoration:** Automatically repairs Excel-truncated US ZIP codes (`2138` -> `02138`).
- **European Decimal Normalization:** Converts comma-separated coordinates (`37,7749` -> `37.7749`) and handles compass direction suffixes (`122.3321 W` -> `-122.3321`).
- **Offline Postal Centroid Resolver:** Built-in 3-digit prefix cluster tree maps US ZIP codes to geographic centroids without requiring external APIs or exposing private addresses.

### 4. Multi-Stage Recipe Chaining (Pipelines)
- **Sequential Spatial Operations:** Orchestrate multiple spatial joins in a single execution pass (e.g., Stage 1: Sales Territory Join -> Stage 2: Nearest Distribution Hub -> Stage 3: Risk Zone Check).
- **Interactive Pipeline Builder:** Configure sequential stages with independent reference layers and custom field mappings directly in the GIS Studio.

### 5. Portable `.georecipe` Bundles
- **Single-File Handover:** Export recipes and their embedded GeoJSON reference layers into a single `.georecipe` JSON package.
- **Zero-Setup Handover:** Business users simply drag and drop the bundle file into the portal; recipes and layers are automatically unpacked into local IndexedDB.

### 6. Executive Audit Defensibility & Exception Reports
- **Dual-Sheet Workbooks:** Enriched spreadsheet downloads produce two sheets:
  1. `Enriched_Data`: Original tabular data appended with newly matched spatial attributes.
  2. `Processing_Audit_Trail`: Defensible record listing recipe title, execution mode, timestamp, engine version, match rate, and confidence score breakdown.
- **One-Click Exceptions Export:** Dedicated download for unmatched or invalid rows (`_exceptions.xlsx`) for fast sales operations review.

---

## Tech Stack

- **Frontend Framework:** React 19, TypeScript, Vite, Tailwind CSS
- **Spatial Indexing & Algorithms:** Flatbush (Hilbert R-Tree), `@turf/turf`
- **Background Execution:** Dedicated Web Worker (`spatial.worker.ts`) with typed client bridge
- **Client Storage:** Dexie.js (IndexedDB) with memory fallback
- **Interactive Vector Maps:** MapLibre GL JS
- **Spreadsheet Processing:** SheetJS (`xlsx`) & `PapaParse`
- **State Management:** Zustand (reactive stores with IndexedDB persistence)

---

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# Clone the repository
git clone https://github.com/cupid-shell/geobridge.git
cd geobridge

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Running Tests
The automated test suite runs 10 end-to-end tests covering data sanitization, postal resolution, Flatbush R-Tree joins, nearest-neighbor caching, bundle serialization, and multi-stage chaining:
```bash
npm test
```

### Production Build
Compile TypeScript and generate the production bundle with dedicated Web Worker assets:
```bash
npm run build
```

---

## Built-in Presets

GeoBridge includes four ready-to-test recipes with pre-bundled reference layers:
1. **Sales Territory & Account Executive Matcher** (Point-in-Polygon): Maps accounts to Western, Midwest, Southern, or Northeast regions.
2. **Nearest Logistics Hub & Distance Estimator** (Nearest Neighbor): Calculates highway mileage and routing codes to the closest distribution center.
3. **Environmental Risk & Insurance Underwriting Tag** (Buffer & Intersect): Flags commercial facilities inside hurricane and seismic corridors.
4. **Enterprise Territory & Logistics Pipeline** (Multi-Stage Chaining): 2-stage pipeline that assigns sales territory and computes closest fulfillment hub in a single pass.

To test immediately, click **"Quick Load"** in the Analysis Portal or download the sample workbook via **"Demo .xlsx"**.

---

## Privacy & Security

- **100% Client-Side Execution:** All calculations execute locally on your machine.
- **Zero Data Egress:** Customer files, coordinates, and corporate addresses are never transmitted to any external server or third-party cloud.
- **Full Compliance:** Safe for confidential corporate data, GDPR, and HIPAA regulated workflows.
