import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type {
  EnrichmentResult,
  EnrichmentSummary,
  ReferenceLayer,
  SpatialRecipe,
  ConfidenceTier,
} from '../../types/recipe';
import {
  buildPolygonSpatialIndex,
  buildCentroidIndex,
  fastHaversineDistance,
} from './spatial-index';
import { sanitizeCoordinate } from './data-sanitizer';
import { resolveZipToCoordinates } from './zip-resolver';

export interface ExecuteRecipeParams {
  recipe: SpatialRecipe;
  referenceLayer: ReferenceLayer;
  rows: Record<string, any>[];
  latColumn?: string;
  lngColumn?: string;
  zipColumn?: string;
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
    zipColumn,
    fileName,
    onProgress,
  } = params;

  const startTime = performance.now();
  const totalRows = rows.length;
  let matchedRows = 0;
  let unmatchedRows = 0;
  let invalidCoordinates = 0;

  const confidenceBreakdown = {
    highExact: 0,
    borderline: 0,
    ambiguousOverlap: 0,
    centroidFallback: 0,
    unmatched: 0,
  };

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
  if (!addedColumns.includes('match_confidence')) {
    addedColumns.push('match_confidence');
  }

  // Pre-process reference layer for buffer operations if needed
  let operationalGeoJSON = referenceLayer.geojson;
  if (recipe.operation === 'buffer_intersect' && recipe.bufferRadiusKm) {
    operationalGeoJSON = turf.buffer(referenceLayer.geojson, recipe.bufferRadiusKm, {
      units: 'kilometers',
    }) as FeatureCollection;
  }

  // Step 1: Pre-build high performance spatial indices (Flatbush & Centroid Cache)
  const isPolygonOp = recipe.operation === 'point_in_polygon' || recipe.operation === 'buffer_intersect';
  const polygonIndex = isPolygonOp ? buildPolygonSpatialIndex(operationalGeoJSON) : null;
  const centroidIndex = recipe.operation === 'nearest_neighbor' ? buildCentroidIndex(operationalGeoJSON) : null;

  // Chunk processing for responsive UI
  const CHUNK_SIZE = 1000;

  for (let i = 0; i < totalRows; i++) {
    const row = { ...rows[i] };
    let lat: number | null = null;
    let lng: number | null = null;
    let isCentroidFallback = false;

    // Try extracting coordinates
    if (latColumn && lngColumn && row[latColumn] !== undefined && row[lngColumn] !== undefined) {
      lat = sanitizeCoordinate(row[latColumn], true);
      lng = sanitizeCoordinate(row[lngColumn], false);
    }

    // If coordinates are missing or invalid, attempt postal code resolution fallback
    if ((lat === null || lng === null) && zipColumn && row[zipColumn] !== undefined) {
      const resolved = resolveZipToCoordinates(row[zipColumn]);
      if (resolved) {
        [lng, lat] = resolved;
        isCentroidFallback = true;
      }
    }

    // Validate coordinates
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      invalidCoordinates++;
      unmatchedRows++;
      confidenceBreakdown.unmatched++;
      for (const mapping of recipe.fieldMappings) {
        row[mapping.targetField] = 'Invalid Coordinates';
      }
      if (recipe.operation === 'nearest_neighbor' && recipe.includeDistanceField) {
        const distCol =
          recipe.distanceFieldName ||
          `distance_${recipe.distanceUnit || 'km'}`;
        row[distCol] = null;
      }
      row['match_confidence'] = 'UNMATCHED';
      enrichedData.push(row);
      continue;
    }

    let matched = false;
    let confidence: ConfidenceTier = 'UNMATCHED';

    if (isPolygonOp && polygonIndex) {
      // Broad-Phase: Query Flatbush R-Tree in O(log M) time
      const candidatePolygons = polygonIndex.queryCandidates(lng, lat);
      const matchingPolygons: Feature[] = [];

      // Narrow-Phase: Ray-casting test only on the few candidates
      for (const candidate of candidatePolygons) {
        if (turf.booleanPointInPolygon([lng, lat], candidate as any)) {
          matchingPolygons.push(candidate);
        }
      }

      if (matchingPolygons.length > 0) {
        matched = true;
        matchedRows++;
        const primaryMatch = matchingPolygons[0];

        // Map configured fields
        for (const mapping of recipe.fieldMappings) {
          const srcVal = primaryMatch.properties?.[mapping.sourceField];
          row[mapping.targetField] = srcVal !== undefined ? srcVal : (mapping.fallbackValue ?? null);
        }

        if (matchingPolygons.length > 1) {
          confidence = 'AMBIGUOUS_OVERLAP';
          confidenceBreakdown.ambiguousOverlap++;
        } else if (isCentroidFallback) {
          confidence = 'CENTROID_FALLBACK';
          confidenceBreakdown.centroidFallback++;
        } else {
          confidence = 'HIGH_EXACT';
          confidenceBreakdown.highExact++;
        }
      } else {
        unmatchedRows++;
        confidence = 'UNMATCHED';
        confidenceBreakdown.unmatched++;
        for (const mapping of recipe.fieldMappings) {
          row[mapping.targetField] = mapping.fallbackValue ?? 'Unmatched';
        }
      }
    } else if (recipe.operation === 'nearest_neighbor' && centroidIndex) {
      // Fast Nearest Neighbor using precomputed centroids
      let minDistance = Infinity;
      let closestItem: (typeof centroidIndex.centroids)[0] | null = null;
      const unit = recipe.distanceUnit === 'miles' ? 'miles' : 'km';

      for (const item of centroidIndex.centroids) {
        const d = fastHaversineDistance(lat, lng, item.lat, item.lng, unit);
        if (d < minDistance) {
          minDistance = d;
          closestItem = item;
        }
      }

      if (closestItem) {
        matched = true;
        matchedRows++;

        for (const mapping of recipe.fieldMappings) {
          const srcVal = closestItem.properties[mapping.sourceField];
          row[mapping.targetField] = srcVal !== undefined ? srcVal : (mapping.fallbackValue ?? null);
        }

        if (recipe.includeDistanceField) {
          const distCol =
            recipe.distanceFieldName ||
            `distance_to_${referenceLayer.name.toLowerCase().replace(/\s+/g, '_')}_${recipe.distanceUnit || 'km'}`;
          row[distCol] = Math.round(minDistance * 100) / 100;
        }

        confidence = isCentroidFallback ? 'CENTROID_FALLBACK' : 'HIGH_EXACT';
        if (isCentroidFallback) {
          confidenceBreakdown.centroidFallback++;
        } else {
          confidenceBreakdown.highExact++;
        }
      } else {
        unmatchedRows++;
        confidence = 'UNMATCHED';
        confidenceBreakdown.unmatched++;
        for (const mapping of recipe.fieldMappings) {
          row[mapping.targetField] = mapping.fallbackValue ?? 'No Facilities Found';
        }
      }
    }

    row['match_confidence'] = confidence;
    enrichedData.push(row);

    // Limit preview features to first 2,000 for MapLibre rendering performance
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
          _confidence: confidence,
        },
      });
    }

    // Yield control for non-blocking UI ticks every CHUNK_SIZE rows
    if (i % CHUNK_SIZE === 0 && onProgress) {
      onProgress(i, totalRows);
      if (i % (CHUNK_SIZE * 5) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  if (onProgress) {
    onProgress(totalRows, totalRows);
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  const summary: EnrichmentSummary = {
    totalRows,
    matchedRows,
    unmatchedRows,
    invalidCoordinates,
    executionTimeMs,
    addedColumns,
    recipeTitle: recipe.title,
    referenceLayerName: referenceLayer.name,
    timestamp: new Date().toISOString(),
    confidenceBreakdown,
  };

  return {
    data: enrichedData,
    summary,
    previewGeoJSON: {
      type: 'FeatureCollection',
      features: previewFeatures,
    },
    fileName,
  };
}
