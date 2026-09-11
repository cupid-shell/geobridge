import type { FeatureCollection } from 'geojson';

export type SpatialOperationType = 
  | 'point_in_polygon' 
  | 'nearest_neighbor' 
  | 'buffer_intersect';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  fallbackValue?: string | number | null;
}

export interface ReferenceLayer {
  id: string;
  name: string;
  description: string;
  geometryType: 'Polygon' | 'MultiPolygon' | 'Point';
  geojson: FeatureCollection;
  availableFields: string[];
  featureCount: number;
}

export interface SpatialRecipe {
  id: string;
  title: string;
  description: string;
  category: 'Sales & Ops' | 'Risk & Compliance' | 'Logistics' | 'Custom';
  operation: SpatialOperationType;
  referenceLayerId: string;
  fieldMappings: FieldMapping[];
  // Parameters for buffer operations
  bufferRadiusKm?: number;
  // Parameters for nearest neighbor
  distanceUnit?: 'km' | 'miles';
  includeDistanceField?: boolean;
  distanceFieldName?: string;
  // Metadata
  author?: string;
  createdAt: string;
  isPreset?: boolean;
}

export type ConfidenceTier = 
  | 'HIGH_EXACT' 
  | 'BORDERLINE_REVIEW' 
  | 'AMBIGUOUS_OVERLAP' 
  | 'CENTROID_FALLBACK' 
  | 'UNMATCHED';

export interface ColumnDetectionResult {
  latColumn: string | null;
  lngColumn: string | null;
  zipColumn: string | null;
  allColumns: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  sampleValues: {
    latSample?: number;
    lngSample?: number;
    zipSample?: string;
  };
  warnings: string[];
}

export interface EnrichmentSummary {
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  invalidCoordinates: number;
  executionTimeMs: number;
  addedColumns: string[];
  recipeTitle?: string;
  referenceLayerName?: string;
  timestamp?: string;
  confidenceBreakdown?: {
    highExact: number;
    borderline: number;
    ambiguousOverlap: number;
    centroidFallback: number;
    unmatched: number;
  };
}

export interface EnrichmentResult {
  data: Record<string, any>[];
  summary: EnrichmentSummary;
  previewGeoJSON: FeatureCollection;
  fileName: string;
}
