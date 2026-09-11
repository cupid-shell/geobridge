import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type {
  EnrichmentResult,
  EnrichmentSummary,
  ReferenceLayer,
  SpatialRecipe,
  RecipeStep,
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
  referenceLayer?: ReferenceLayer;
  referenceLayers?: ReferenceLayer[];
  rows: Record<string, any>[];
  latColumn?: string;
  lngColumn?: string;
  zipColumn?: string;
  fileName: string;
  onProgress?: (processed: number, total: number) => void;
}

interface PreparedStep {
  id: string;
  name: string;
  operation: SpatialRecipe['operation'];
  referenceLayer: ReferenceLayer;
  fieldMappings: SpatialRecipe['fieldMappings'];
  bufferRadiusKm?: number;
  distanceUnit?: 'km' | 'miles';
  includeDistanceField?: boolean;
  distanceFieldName?: string;
  polygonIndex: ReturnType<typeof buildPolygonSpatialIndex> | null;
  centroidIndex: ReturnType<typeof buildCentroidIndex> | null;
  addedColumns: string[];
}

export async function executeSpatialRecipe(
  params: ExecuteRecipeParams
): Promise<EnrichmentResult> {
  const {
    recipe,
    referenceLayer,
    referenceLayers = [],
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

  // Pool of available reference layers
  const layerPool = new Map<string, ReferenceLayer>();
  if (referenceLayer) {
    layerPool.set(referenceLayer.id, referenceLayer);
  }
  for (const l of referenceLayers) {
    layerPool.set(l.id, l);
  }

  // Synthesize pipeline steps (either from recipe.steps if chained, or single recipe)
  const rawSteps: RecipeStep[] =
    recipe.isChained && recipe.steps && recipe.steps.length > 0
      ? recipe.steps
      : [
          {
            id: recipe.id,
            name: recipe.title,
            operation: recipe.operation,
            referenceLayerId: recipe.referenceLayerId,
            fieldMappings: recipe.fieldMappings,
            bufferRadiusKm: recipe.bufferRadiusKm,
            distanceUnit: recipe.distanceUnit,
            includeDistanceField: recipe.includeDistanceField,
            distanceFieldName: recipe.distanceFieldName,
          },
        ];

  // Prepare and index each step
  const preparedSteps: PreparedStep[] = [];
  const allAddedColumns: string[] = [];

  for (const step of rawSteps) {
    const layer = layerPool.get(step.referenceLayerId) || referenceLayer || referenceLayers[0];
    if (!layer) {
      throw new Error(`Reference layer "${step.referenceLayerId}" not found for step "${step.name}".`);
    }

    const stepAddedColumns: string[] = [];
    for (const m of step.fieldMappings) {
      if (!stepAddedColumns.includes(m.targetField)) {
        stepAddedColumns.push(m.targetField);
      }
      if (!allAddedColumns.includes(m.targetField)) {
        allAddedColumns.push(m.targetField);
      }
    }

    let distanceFieldName: string | undefined = undefined;
    if (step.operation === 'nearest_neighbor' && step.includeDistanceField) {
      distanceFieldName =
        step.distanceFieldName ||
        `distance_to_${layer.name.toLowerCase().replace(/\s+/g, '_')}_${step.distanceUnit || 'km'}`;
      if (!stepAddedColumns.includes(distanceFieldName)) {
        stepAddedColumns.push(distanceFieldName);
      }
      if (!allAddedColumns.includes(distanceFieldName)) {
        allAddedColumns.push(distanceFieldName);
      }
    }

    // Pre-process geometry for buffers if needed
    let operationalGeoJSON = layer.geojson;
    if (step.operation === 'buffer_intersect' && step.bufferRadiusKm) {
      operationalGeoJSON = turf.buffer(layer.geojson, step.bufferRadiusKm, {
        units: 'kilometers',
      }) as FeatureCollection;
    }

    // Build spatial indices
    const isPolygonOp = step.operation === 'point_in_polygon' || step.operation === 'buffer_intersect';
    const polygonIndex = isPolygonOp ? buildPolygonSpatialIndex(operationalGeoJSON) : null;
    const centroidIndex = step.operation === 'nearest_neighbor' ? buildCentroidIndex(operationalGeoJSON) : null;

    preparedSteps.push({
      id: step.id,
      name: step.name,
      operation: step.operation,
      referenceLayer: layer,
      fieldMappings: step.fieldMappings,
      bufferRadiusKm: step.bufferRadiusKm,
      distanceUnit: step.distanceUnit,
      includeDistanceField: step.includeDistanceField,
      distanceFieldName,
      polygonIndex,
      centroidIndex,
      addedColumns: stepAddedColumns,
    });
  }

  if (!allAddedColumns.includes('match_confidence')) {
    allAddedColumns.push('match_confidence');
  }

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
      for (const step of preparedSteps) {
        for (const mapping of step.fieldMappings) {
          row[mapping.targetField] = 'Invalid Coordinates';
        }
        if (step.distanceFieldName) {
          row[step.distanceFieldName] = null;
        }
      }
      row['match_confidence'] = 'UNMATCHED';
      enrichedData.push(row);
      continue;
    }

    const stepConfidences: ConfidenceTier[] = [];
    let rowMatchedAnyStep = false;

    // Execute each pipeline step sequentially
    for (const step of preparedSteps) {
      if (step.polygonIndex) {
        // Broad-Phase: Query Flatbush R-Tree in O(log M) time
        const candidatePolygons = step.polygonIndex.queryCandidates(lng, lat);
        const matchingPolygons: Feature[] = [];

        // Narrow-Phase: Ray-casting test only on the few candidates
        for (const candidate of candidatePolygons) {
          if (turf.booleanPointInPolygon([lng, lat], candidate as any)) {
            matchingPolygons.push(candidate);
          }
        }

        if (matchingPolygons.length > 0) {
          rowMatchedAnyStep = true;
          const primaryMatch = matchingPolygons[0];

          for (const mapping of step.fieldMappings) {
            const srcVal = primaryMatch.properties?.[mapping.sourceField];
            row[mapping.targetField] = srcVal !== undefined ? srcVal : (mapping.fallbackValue ?? null);
          }

          if (matchingPolygons.length > 1) {
            stepConfidences.push('AMBIGUOUS_OVERLAP');
          } else if (isCentroidFallback) {
            stepConfidences.push('CENTROID_FALLBACK');
          } else {
            stepConfidences.push('HIGH_EXACT');
          }
        } else {
          for (const mapping of step.fieldMappings) {
            row[mapping.targetField] = mapping.fallbackValue ?? 'Unmatched';
          }
          stepConfidences.push('UNMATCHED');
        }
      } else if (step.centroidIndex) {
        // Fast Nearest Neighbor using precomputed centroids
        let minDistance = Infinity;
        let closestItem: (typeof step.centroidIndex.centroids)[0] | null = null;
        const unit = step.distanceUnit === 'miles' ? 'miles' : 'km';

        for (const item of step.centroidIndex.centroids) {
          const d = fastHaversineDistance(lat, lng, item.lat, item.lng, unit);
          if (d < minDistance) {
            minDistance = d;
            closestItem = item;
          }
        }

        if (closestItem) {
          rowMatchedAnyStep = true;

          for (const mapping of step.fieldMappings) {
            const srcVal = closestItem.properties[mapping.sourceField];
            row[mapping.targetField] = srcVal !== undefined ? srcVal : (mapping.fallbackValue ?? null);
          }

          if (step.includeDistanceField && step.distanceFieldName) {
            row[step.distanceFieldName] = Math.round(minDistance * 100) / 100;
          }

          stepConfidences.push(isCentroidFallback ? 'CENTROID_FALLBACK' : 'HIGH_EXACT');
        } else {
          for (const mapping of step.fieldMappings) {
            row[mapping.targetField] = mapping.fallbackValue ?? 'No Facilities Found';
          }
          if (step.distanceFieldName) {
            row[step.distanceFieldName] = null;
          }
          stepConfidences.push('UNMATCHED');
        }
      }
    }

    // Overall Confidence Scoring across pipeline
    let overallConfidence: ConfidenceTier = 'UNMATCHED';
    const hasOverlap = stepConfidences.includes('AMBIGUOUS_OVERLAP');
    const hasFallback = stepConfidences.includes('CENTROID_FALLBACK');
    const allHighExact = stepConfidences.length > 0 && stepConfidences.every((c) => c === 'HIGH_EXACT');
    const allUnmatched = stepConfidences.length > 0 && stepConfidences.every((c) => c === 'UNMATCHED');
    const someMatched = stepConfidences.some((c) => c !== 'UNMATCHED');

    if (allHighExact) {
      overallConfidence = 'HIGH_EXACT';
      confidenceBreakdown.highExact++;
    } else if (hasOverlap) {
      overallConfidence = 'AMBIGUOUS_OVERLAP';
      confidenceBreakdown.ambiguousOverlap++;
    } else if (hasFallback) {
      overallConfidence = 'CENTROID_FALLBACK';
      confidenceBreakdown.centroidFallback++;
    } else if (someMatched && !allUnmatched) {
      overallConfidence = 'BORDERLINE_REVIEW';
      confidenceBreakdown.borderline++;
    } else {
      overallConfidence = 'UNMATCHED';
      confidenceBreakdown.unmatched++;
    }

    if (rowMatchedAnyStep) {
      matchedRows++;
    } else {
      unmatchedRows++;
    }

    row['match_confidence'] = overallConfidence;
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
          _matched: rowMatchedAnyStep,
          _confidence: overallConfidence,
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
    addedColumns: allAddedColumns,
    recipeTitle: recipe.title,
    referenceLayerName: preparedSteps.map((s) => s.referenceLayer.name).join(' + '),
    timestamp: new Date().toISOString(),
    isChained: recipe.isChained,
    stepCount: preparedSteps.length,
    stepsDetail: preparedSteps.map((s) => `${s.name} (${s.operation})`),
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
