import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type {
  EnrichmentResult,
  EnrichmentSummary,
  ReferenceLayer,
  SpatialRecipe,
} from '../../types/recipe';

export interface ExecuteRecipeParams {
  recipe: SpatialRecipe;
  referenceLayer: ReferenceLayer;
  rows: Record<string, any>[];
  latColumn: string;
  lngColumn: string;
  fileName: string;
  onProgress?: (processed: number, total: number) => void;
}

export async function executeSpatialRecipe(
  params: ExecuteRecipeParams
): Promise<EnrichmentResult> {
  const {
    recipe,
    referenceLayer,
    rows,
    latColumn,
    lngColumn,
    fileName,
    onProgress,
  } = params;

  const startTime = performance.now();
  const totalRows = rows.length;
  let matchedRows = 0;
  let unmatchedRows = 0;
  let invalidCoordinates = 0;

  const enrichedData: Record<string, any>[] = [];
  const previewFeatures: Feature<Point>[] = [];

  // Determine output columns
  const addedColumns = recipe.fieldMappings.map((m) => m.targetField);
  if (recipe.operation === 'nearest_neighbor' && recipe.includeDistanceField) {
    const distCol =
      recipe.distanceFieldName ||
      `distance_to_${referenceLayer.name.toLowerCase().replace(/\s+/g, '_')}_${recipe.distanceUnit || 'km'}`;
    if (!addedColumns.includes(distCol)) {
      addedColumns.push(distCol);
    }
  }

  // Pre-process reference layer for buffer operations if needed
  let operationalGeoJSON = referenceLayer.geojson;
  if (recipe.operation === 'buffer_intersect' && recipe.bufferRadiusKm) {
    operationalGeoJSON = turf.buffer(referenceLayer.geojson, recipe.bufferRadiusKm, {
      units: 'kilometers',
    }) as FeatureCollection;
  }

  // Chunk processing for responsive UI
  const CHUNK_SIZE = 500;

  for (let i = 0; i < totalRows; i++) {
    const row = { ...rows[i] };
    const rawLat = row[latColumn];
    const rawLng = row[lngColumn];

    const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat).trim());
    const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng).trim());

    // Validate coordinates
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      invalidCoordinates++;
      // Apply explicit invalid coordinate status
      for (const mapping of recipe.fieldMappings) {
        row[mapping.targetField] = 'Invalid Coordinates';
      }
      if (recipe.operation === 'nearest_neighbor' && recipe.includeDistanceField) {
        const distCol =
          recipe.distanceFieldName ||
          `distance_${recipe.distanceUnit || 'km'}`;
        row[distCol] = null;
      }
      enrichedData.push(row);
      continue;
    }

    const userPt = turf.point([lng, lat]);
    let matched = false;

    if (
      recipe.operation === 'point_in_polygon' ||
      recipe.operation === 'buffer_intersect'
    ) {
      // Check polygon containment
      for (const feature of operationalGeoJSON.features) {
        if (!feature.geometry) continue;

        const geomType = feature.geometry.type;
        if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          const isInside = turf.booleanPointInPolygon(userPt, feature as any);
          if (isInside) {
            matched = true;
            matchedRows++;

            // Map configured fields
            for (const mapping of recipe.fieldMappings) {
              const srcVal = feature.properties?.[mapping.sourceField];
              row[mapping.targetField] = srcVal !== undefined ? srcVal : (mapping.fallbackValue ?? null);
            }
            break;
          }
        }
      }

      if (!matched) {
        unmatchedRows++;
        for (const mapping of recipe.fieldMappings) {
          row[mapping.targetField] = mapping.fallbackValue ?? 'Unmatched';
        }
      }
    } else if (recipe.operation === 'nearest_neighbor') {
      // Find closest feature
      let minDistance = Infinity;
      let closestFeature: Feature | null = null;
      const unit = recipe.distanceUnit === 'miles' ? 'miles' : 'kilometers';

      for (const feature of operationalGeoJSON.features) {
        if (!feature.geometry) continue;

        let targetPoint: Feature<Point> | null = null;
        if (feature.geometry.type === 'Point') {
          targetPoint = feature as Feature<Point>;
        } else {
          // Centroid of polygon/line
          targetPoint = turf.centroid(feature as any);
        }

        if (targetPoint) {
          const d = turf.distance(userPt, targetPoint, { units: unit });
          if (d < minDistance) {
            minDistance = d;
            closestFeature = feature;
          }
        }
      }

      if (closestFeature) {
        matched = true;
        matchedRows++;

        for (const mapping of recipe.fieldMappings) {
          const srcVal = closestFeature.properties?.[mapping.sourceField];
          row[mapping.targetField] = srcVal !== undefined ? srcVal : (mapping.fallbackValue ?? null);
        }

        if (recipe.includeDistanceField) {
          const distCol =
            recipe.distanceFieldName ||
            `distance_to_${referenceLayer.name.toLowerCase().replace(/\s+/g, '_')}_${recipe.distanceUnit || 'km'}`;
          row[distCol] = Math.round(minDistance * 100) / 100;
        }
      } else {
        unmatchedRows++;
        for (const mapping of recipe.fieldMappings) {
          row[mapping.targetField] = mapping.fallbackValue ?? 'No Facilities Found';
        }
      }
    }

    enrichedData.push(row);

    // Add to map preview (sample up to 2,000 points to keep map snappy)
    if (previewFeatures.length < 2000) {
      previewFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {
          ...row,
          _matched: matched,
        },
      });
    }

    // Progress reporting
    if (onProgress && (i % CHUNK_SIZE === 0 || i === totalRows - 1)) {
      onProgress(i + 1, totalRows);
      // Yield to event loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  const summary: EnrichmentSummary = {
    totalRows,
    matchedRows,
    unmatchedRows,
    invalidCoordinates,
    executionTimeMs,
    addedColumns,
  };

  const previewGeoJSON: FeatureCollection = {
    type: 'FeatureCollection',
    features: previewFeatures,
  };

  return {
    data: enrichedData,
    summary,
    previewGeoJSON,
    fileName,
  };
}
