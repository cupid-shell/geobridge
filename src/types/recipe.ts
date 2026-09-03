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

export interface ColumnDetectionResult {
  latColumn: string | null;
  lngColumn: string | null;
  allColumns: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  sampleValues: {
    latSample?: number;
    lngSample?: number;
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
}

export interface EnrichmentResult {
  data: Record<string, any>[];
  summary: EnrichmentSummary;
  previewGeoJSON: FeatureCollection;
  fileName: string;
}
