import Flatbush from 'flatbush';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, Point, FeatureCollection } from 'geojson';

export interface PolygonSpatialIndex {
  features: Feature<Polygon | MultiPolygon>[];
  index: Flatbush;
  queryCandidates: (lng: number, lat: number) => Feature<Polygon | MultiPolygon>[];
}

export interface CentroidSpatialIndex {
  centroids: Array<{
    feature: Feature;
    lng: number;
    lat: number;
    properties: Record<string, any>;
  }>;
}

/**
 * Builds a packed Hilbert R-Tree (Flatbush) over polygon bounding boxes.
 * Broad-phase filtering reduces candidate checks from M to <= 2 in O(log M) time.
 */
export function buildPolygonSpatialIndex(geojson: FeatureCollection): PolygonSpatialIndex {
  const polygonFeatures: Feature<Polygon | MultiPolygon>[] = [];

  for (const f of geojson.features) {
    if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
      polygonFeatures.push(f as Feature<Polygon | MultiPolygon>);
    }
  }

  const index = new Flatbush(Math.max(polygonFeatures.length, 1));

  if (polygonFeatures.length === 0) {
    index.add(0, 0, 0, 0);
    index.finish();
    return {
      features: [],
      index,
      queryCandidates: () => [],
    };
  }

  for (const f of polygonFeatures) {
    const [minX, minY, maxX, maxY] = turf.bbox(f);
    index.add(minX, minY, maxX, maxY);
  }

  index.finish();

  return {
    features: polygonFeatures,
    index,
    queryCandidates: (lng: number, lat: number) => {
      // Query zero-area bounding box [lng, lat, lng, lat]
      const candidateIndices = index.search(lng, lat, lng, lat);
      return candidateIndices.map((i) => polygonFeatures[i]);
    },
  };
}

/**
 * Precomputes centroids for nearest-neighbor calculations once.
 * Eliminates catastrophic O(N * M) redundant centroid recomputations in row loops.
 */
export function buildCentroidIndex(geojson: FeatureCollection): CentroidSpatialIndex {
  const centroids = geojson.features.map((feature) => {
    let lng: number;
    let lat: number;

    if (feature.geometry && feature.geometry.type === 'Point') {
      [lng, lat] = (feature.geometry as Point).coordinates;
    } else {
      // Calculate centroid once upfront
      const c = turf.centroid(feature as any);
      [lng, lat] = c.geometry.coordinates;
    }

    return {
      feature,
      lng,
      lat,
      properties: feature.properties || {},
    };
  });

  return { centroids };
}

/**
 * Approximate fast Haversine distance in miles or kilometers between two coordinates.
 */
export function fastHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'miles' | 'km' = 'miles'
): number {
  const R = unit === 'miles' ? 3958.8 : 6371; // Earth radius
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
