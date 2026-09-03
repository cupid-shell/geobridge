import { detectCoordinates } from '../src/lib/spatial/column-detector';
import { executeSpatialRecipe } from '../src/lib/spatial/engine';
import {
  PRESET_RECIPES,
  PRESET_REFERENCE_LAYERS,
  SAMPLE_CUSTOMER_LEADS,
} from '../src/lib/data/presets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n--- 🧪 TEST 1: Coordinate Detection Logic ---');
  
  // Test standard names
  const testData1 = [{ latitude: 37.77, longitude: -122.41 }];
  const det1 = detectCoordinates(testData1);
  assert(det1.latColumn === 'latitude', 'Identified "latitude" correctly');
  assert(det1.lngColumn === 'longitude', 'Identified "longitude" correctly');
  assert(det1.confidence === 'high', 'Confidence is high');

  // Test abbreviations
  const testData2 = [{ lat: 40.71, lng: -74.00, store_id: 'A1' }];
  const det2 = detectCoordinates(testData2);
  assert(det2.latColumn === 'lat', 'Identified "lat" correctly');
  assert(det2.lngColumn === 'lng', 'Identified "lng" correctly');

  // Test axis inversion warning
  const invertedData = [{ lat: -122.41, lng: 37.77 }]; // Inverted coords
  const detInv = detectCoordinates(invertedData);
  assert(detInv.warnings.length > 0, 'Detected coordinate axis inversion warning');

  console.log('\n--- 🧪 TEST 2: Point-in-Polygon (Territory Matcher) ---');
  const territoryRecipe = PRESET_RECIPES.find((r) => r.id === 'recipe-territory-assignment')!;
  const territoryLayer = PRESET_REFERENCE_LAYERS.find((l) => l.id === territoryRecipe.referenceLayerId)!;

  const result1 = await executeSpatialRecipe({
    recipe: territoryRecipe,
    referenceLayer: territoryLayer,
    rows: SAMPLE_CUSTOMER_LEADS,
    latColumn: 'latitude',
    lngColumn: 'longitude',
    fileName: 'sample_leads.csv',
  });

  assert(result1.summary.totalRows === SAMPLE_CUSTOMER_LEADS.length, `Processed all ${SAMPLE_CUSTOMER_LEADS.length} rows`);
  assert(result1.summary.matchedRows > 0, `Matched ${result1.summary.matchedRows} rows to territories`);
  assert(result1.summary.addedColumns.includes('Assigned_Territory'), 'Added "Assigned_Territory" column');

  // Verify specific city matches
  const seattleLead = result1.data.find((r) => r.city === 'Seattle');
  assert(seattleLead?.Assigned_Territory === 'Western Region', 'Seattle correctly matched to Western Region');

  const chicagoLead = result1.data.find((r) => r.city === 'Chicago');
  assert(chicagoLead?.Assigned_Territory === 'Midwest Region', 'Chicago correctly matched to Midwest Region');

  const houstonLead = result1.data.find((r) => r.city === 'Houston');
  assert(houstonLead?.Assigned_Territory === 'Southern Region', 'Houston correctly matched to Southern Region');

  const bostonLead = result1.data.find((r) => r.city === 'Boston');
  assert(bostonLead?.Assigned_Territory === 'Northeast Region', 'Boston correctly matched to Northeast Region');

  console.log('\n--- 🧪 TEST 3: Nearest Neighbor (Hub Distance) ---');
  const hubRecipe = PRESET_RECIPES.find((r) => r.id === 'recipe-nearest-hub')!;
  const hubLayer = PRESET_REFERENCE_LAYERS.find((l) => l.id === hubRecipe.referenceLayerId)!;

  const result2 = await executeSpatialRecipe({
    recipe: hubRecipe,
    referenceLayer: hubLayer,
    rows: SAMPLE_CUSTOMER_LEADS,
    latColumn: 'latitude',
    lngColumn: 'longitude',
    fileName: 'sample_leads.csv',
  });

  assert(result2.summary.matchedRows === SAMPLE_CUSTOMER_LEADS.length, 'All rows matched to closest hub');
  
  // Check that Distance field is present and positive
  const distField = hubRecipe.distanceFieldName!;
  const firstLead = result2.data[0];
  assert(typeof firstLead[distField] === 'number' && firstLead[distField] > 0, `Computed valid numeric distance: ${firstLead[distField]} miles`);

  console.log('\n--- 🧪 TEST 4: Invalid & Out-of-Bounds Coordinates ---');
  const dirtyData = [
    { city: 'Nowhere', latitude: 999, longitude: -122.0 }, // Invalid Lat > 90
    { city: 'Nullville', latitude: null, longitude: null }, // Null
  ];

  const dirtyResult = await executeSpatialRecipe({
    recipe: territoryRecipe,
    referenceLayer: territoryLayer,
    rows: dirtyData,
    latColumn: 'latitude',
    lngColumn: 'longitude',
    fileName: 'dirty.csv',
  });

  assert(dirtyResult.summary.invalidCoordinates === 2, 'Identified all invalid coordinates');
  assert(dirtyResult.data[0].Assigned_Territory === 'Invalid Coordinates', 'Applied fallback "Invalid Coordinates"');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
