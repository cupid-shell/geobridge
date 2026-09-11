import { detectCoordinates } from '../src/lib/spatial/column-detector';
import { executeSpatialRecipe } from '../src/lib/spatial/engine';
import { sanitizeCoordinate, sanitizePostalCode } from '../src/lib/spatial/data-sanitizer';
import { resolveZipToCoordinates } from '../src/lib/spatial/zip-resolver';
import {
  PRESET_RECIPES,
  PRESET_REFERENCE_LAYERS,
  SAMPLE_CUSTOMER_LEADS,
} from '../src/lib/data/presets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('\n--- TEST 1: Coordinate Detection & Data Sanitization ---');
  
  // Test standard names
  const testData1 = [{ latitude: 37.77, longitude: -122.41 }];
  const det1 = detectCoordinates(testData1);
  assert(det1.latColumn === 'latitude', 'Identified "latitude" correctly');
  assert(det1.lngColumn === 'longitude', 'Identified "longitude" correctly');
  assert(det1.confidence === 'high', 'Confidence is high');

  // Test European decimal comma normalization
  const commaLat = sanitizeCoordinate('37,7749', true);
  const commaLng = sanitizeCoordinate('-122,4194', false);
  assert(commaLat === 37.7749, 'Normalized European decimal comma latitude (37,7749 -> 37.7749)');
  assert(commaLng === -122.4194, 'Normalized European decimal comma longitude (-122,4194 -> -122.4194)');

  // Test compass direction letter suffix
  const dirLat = sanitizeCoordinate('47.6062 N', true);
  const dirLng = sanitizeCoordinate('122.3321 W', false);
  assert(dirLat === 47.6062, 'Handled cardinal direction "N"');
  assert(dirLng === -122.3321, 'Converted "W" to negative longitude (-122.3321)');

  console.log('\n--- TEST 2: Excel Leading Zero Restoration & Postal Codes ---');
  assert(sanitizePostalCode('2138') === '02138', 'Restored 4-digit truncated postal code (2138 -> "02138")');
  assert(sanitizePostalCode(7030) === '07030', 'Restored numeric integer postal code (7030 -> "07030")');
  assert(sanitizePostalCode('02138-1234') === '02138', 'Normalized ZIP+4 to 5-digit base ("02138-1234" -> "02138")');

  console.log('\n--- TEST 3: Offline US Postal Centroid Resolver ---');
  const bostonCoords = resolveZipToCoordinates('02138');
  assert(bostonCoords !== null, 'Resolved Boston ZIP 02138 offline');
  assert(bostonCoords![0] < -70 && bostonCoords![1] > 40, 'Boston centroid within expected coordinates');

  const seattleCoords = resolveZipToCoordinates('98101');
  assert(seattleCoords !== null, 'Resolved Seattle ZIP 98101 offline');
  assert(seattleCoords![0] < -120 && seattleCoords![1] > 45, 'Seattle centroid within expected coordinates');

  console.log('\n--- TEST 4: Flatbush R-Tree Point-in-Polygon (Territory Matcher) ---');
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
  assert(result1.summary.matchedRows > 0, `Matched ${result1.summary.matchedRows} rows to territories via Flatbush R-Tree`);
  assert(result1.summary.addedColumns.includes('Assigned_Territory'), 'Added "Assigned_Territory" column');
  assert(result1.summary.confidenceBreakdown !== undefined, 'Generated confidence breakdown');
  assert(result1.summary.confidenceBreakdown!.highExact > 0, `Recorded ${result1.summary.confidenceBreakdown!.highExact} high exact matches`);

  // Verify specific city matches
  const seattleLead = result1.data.find((r) => r.city === 'Seattle');
  assert(seattleLead?.Assigned_Territory === 'Western Region', 'Seattle correctly matched to Western Region');

  const chicagoLead = result1.data.find((r) => r.city === 'Chicago');
  assert(chicagoLead?.Assigned_Territory === 'Midwest Region', 'Chicago correctly matched to Midwest Region');

  const houstonLead = result1.data.find((r) => r.city === 'Houston');
  assert(houstonLead?.Assigned_Territory === 'Southern Region', 'Houston correctly matched to Southern Region');

  const bostonLead = result1.data.find((r) => r.city === 'Boston');
  assert(bostonLead?.Assigned_Territory === 'Northeast Region', 'Boston correctly matched to Northeast Region');

  console.log('\n--- TEST 5: Nearest Neighbor (Precomputed Centroid Distance) ---');
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
  const distField = hubRecipe.distanceFieldName!;
  const firstLead = result2.data[0];
  assert(typeof firstLead[distField] === 'number' && firstLead[distField] > 0, `Computed valid distance: ${firstLead[distField]} miles`);

  console.log('\n--- TEST 6: Postal-Code Only Enrichment (Fallback Mode) ---');
  const postalOnlyRows = [
    { company: 'Boston Bio', postal_code: '02138' },
    { company: 'Seattle Cloud', postal_code: '98101' },
    { company: 'Austin Solar', postal_code: '78701' },
  ];

  const postalResult = await executeSpatialRecipe({
    recipe: territoryRecipe,
    referenceLayer: territoryLayer,
    rows: postalOnlyRows,
    zipColumn: 'postal_code',
    fileName: 'postal_leads.csv',
  });

  assert(postalResult.summary.matchedRows === 3, 'Enriched 100% of postal-only rows using offline centroids');
  assert(postalResult.data[0].match_confidence === 'CENTROID_FALLBACK', 'Tagged rows with CENTROID_FALLBACK confidence');
  assert(postalResult.data[0].Assigned_Territory === 'Northeast Region', 'Boston postal code correctly mapped to Northeast Region');

  console.log('\n--- TEST 7: Invalid Coordinates Handling ---');
  const dirtyData = [
    { city: 'Nowhere', latitude: 999, longitude: -122.0 },
    { city: 'Nullville', latitude: null, longitude: null },
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

  console.log('\n--- TEST 8: Portable .georecipe Bundle (Export, Validate, Parse) ---');
  const { createRecipeBundle, validateRecipeBundle, parseRecipeBundle } = await import('../src/lib/data/recipe-bundle');
  const bundle = createRecipeBundle(territoryRecipe, PRESET_REFERENCE_LAYERS, {
    author: 'Lead GIS Specialist',
    notes: 'Q3 Enterprise Sales Territory Handover Package',
  });

  assert(bundle.format === 'geobridge-bundle', 'Bundle format is "geobridge-bundle"');
  assert(bundle.version === '1.0.0', 'Bundle version is 1.0.0');
  assert(bundle.bundledLayers.length === 1, 'Correctly bundled 1 referenced layer');
  assert(bundle.bundledLayers[0].id === 'layer-us-sales-territories', 'Bundled target territory layer GeoJSON');

  const bundleJson = JSON.stringify(bundle);
  const parsedBundle = parseRecipeBundle(bundleJson);
  assert(parsedBundle.recipe.id === territoryRecipe.id, 'Parsed recipe matches original recipe ID');
  assert(parsedBundle.bundledLayers[0].geojson.type === 'FeatureCollection', 'Parsed layer has valid FeatureCollection');

  const invalidValidation = validateRecipeBundle({ invalid: true });
  assert(!invalidValidation.isValid, 'Correctly rejected invalid bundle structure');

  console.log('\n--- TEST 9: Multi-Step Recipe Chaining (2-Stage Pipeline) ---');
  const chainedRecipe = PRESET_RECIPES.find((r) => r.id === 'recipe-enterprise-pipeline')!;
  assert(chainedRecipe !== undefined, 'Found chained recipe preset in PRESET_RECIPES');
  assert(chainedRecipe.isChained === true, 'Chained recipe flag is true');
  assert(chainedRecipe.steps?.length === 2, 'Chained recipe contains 2 steps');

  const chainedResult = await executeSpatialRecipe({
    recipe: chainedRecipe,
    referenceLayers: PRESET_REFERENCE_LAYERS,
    rows: SAMPLE_CUSTOMER_LEADS,
    latColumn: 'latitude',
    lngColumn: 'longitude',
    fileName: 'sample_leads.csv',
  });

  assert(chainedResult.summary.totalRows === SAMPLE_CUSTOMER_LEADS.length, `Chained pipeline processed all ${SAMPLE_CUSTOMER_LEADS.length} rows`);
  assert(chainedResult.summary.isChained === true, 'Summary reflects isChained = true');
  assert(chainedResult.summary.stepCount === 2, 'Summary records stepCount = 2');
  
  // Verify Stage 1 columns exist (from Territory PIP)
  assert(chainedResult.summary.addedColumns.includes('Assigned_Territory'), 'Pipeline appended Stage 1 column "Assigned_Territory"');
  assert(chainedResult.summary.addedColumns.includes('Regional_Director'), 'Pipeline appended Stage 1 column "Regional_Director"');
  
  // Verify Stage 2 columns exist (from Nearest Hub)
  assert(chainedResult.summary.addedColumns.includes('Closest_Distribution_Hub'), 'Pipeline appended Stage 2 column "Closest_Distribution_Hub"');
  assert(chainedResult.summary.addedColumns.includes('distance_to_nearest_hub_miles'), 'Pipeline appended Stage 2 distance column');

  // Verify row values from BOTH stages simultaneously on the same record
  const seattleRecord = chainedResult.data.find((r) => r.city === 'Seattle');
  assert(seattleRecord?.Assigned_Territory === 'Western Region', 'Seattle matched Stage 1 (Western Region)');
  assert(typeof seattleRecord?.distance_to_nearest_hub_miles === 'number', 'Seattle calculated Stage 2 distance');
  assert(seattleRecord?.Closest_Distribution_Hub !== 'None', `Seattle identified closest hub: ${seattleRecord?.Closest_Distribution_Hub}`);

  console.log('\n--- TEST 10: Chained Pipeline Audit & Confidence Breakdown ---');
  assert(chainedResult.summary.confidenceBreakdown !== undefined, 'Pipeline generated confidence breakdown');
  assert(chainedResult.summary.confidenceBreakdown!.highExact > 0, `Recorded ${chainedResult.summary.confidenceBreakdown!.highExact} high exact pipeline matches`);
  assert(chainedResult.summary.referenceLayerName.includes('US Regional Sales Territories'), 'Audit references Stage 1 layer');
  assert(chainedResult.summary.referenceLayerName.includes('US Logistics Distribution Hubs'), 'Audit references Stage 2 layer');

  console.log('\nALL 10 TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
