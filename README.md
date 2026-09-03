# GeoBridge 🌍

> **Self-Service Spatial Calculator for Non-GIS Teams**  
> Eliminating the "specialist trap" by allowing GIS analysts to publish zero-code, reproducible spatial calculation recipes for sales, ops, marketing, and finance teams.

---

## 💡 The Problem

In most organizations, GIS specialists spend 30–40% of their week fulfilling repetitive, trivial spatial requests:
- *"Which sales region do these 5,000 customer leads belong to?"*
- *"Are any of these store addresses inside designated flood risk zones?"*
- *"Can you calculate the distance to the closest logistics hub for these addresses?"*

Business teams wait **2 to 5 days** for a simple spatial lookup in QGIS/ArcGIS, while GIS specialists are prevented from doing higher-value modeling and spatial data science.

---

## 🚀 The Solution: GeoBridge

GeoBridge creates a **two-sided platform**:

1. **🛠️ GIS Recipe Studio (For GIS Specialists):**
   - Upload authoritative spatial boundary or facility layers (GeoJSON).
   - Configure spatial operations:
     - **Point-in-Polygon** (Sales regions, tax jurisdictions, boundary tagging).
     - **Nearest Neighbor** (Distance to closest facility, hub routing codes).
     - **Radial Buffer & Zone Matching** (Environmental risk corridors, radius buffers).
   - Map which layer attributes to append to user spreadsheets.
   - Publish turnkey recipes for the entire company.

2. **🚀 Self-Service Portal (For Business Users):**
   - Select a published recipe.
   - Drag & drop any Excel (`.xlsx`, `.xls`) or CSV file.
   - Smart coordinate detection automatically identifies `latitude` and `longitude` columns and warns if axes are swapped.
   - Click **Run Spatial Enrichment** to process thousands of rows in milliseconds.
   - Inspect matches on an interactive vector map (MapLibre GL) and download enriched spreadsheets with newly added columns.

---

## 🔒 100% In-Browser Privacy & Zero Server Cost

- All spatial operations run **100% client-side** using `@turf/turf` and in-memory WebAssembly.
- **Confidential business spreadsheets never touch an external server or cloud database**, ensuring complete GDPR/HIPAA compliance.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Spatial Geometry Engine:** `@turf/turf`
- **Mapping:** MapLibre GL JS
- **Spreadsheet Processing:** SheetJS (`xlsx`) & `PapaParse`
- **State & Persistence:** Zustand with `localStorage` persistence

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 18.0.0

### Installation
```bash
# Clone or navigate to the project directory
cd geobridge

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Running Tests
```bash
# Run the automated spatial engine & coordinate test suite
npm test
```

### Production Build
```bash
npm run build
```

---

## 🧪 Built-in Presets
GeoBridge comes pre-loaded with three ready-to-test recipes and sample customer lead data:
1. **Sales Territory & Account Executive Matcher** (Point-in-Polygon)
2. **Nearest Logistics Hub & Distance Estimator** (Nearest Neighbor)
3. **Environmental Risk & Insurance Underwriting Tag** (Hazard Zones)

Simply click **"Load Sample Leads"** in the Self-Service Portal to test with one click!

