import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { Layers, RotateCcw } from 'lucide-react';
import type { ReferenceLayer } from '../../types/recipe';

interface PreviewMapProps {
  referenceLayer?: ReferenceLayer;
  enrichedPointsGeoJSON?: FeatureCollection | null;
  className?: string;
}

export const PreviewMap: React.FC<PreviewMapProps> = ({
  referenceLayer,
  enrichedPointsGeoJSON,
  className = 'h-96',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-98.5795, 39.8283], // Center of US
      zoom: 3.5,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
      mapInstance.current = map;
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update Reference Layer
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapLoaded) return;

    // Clean up old reference layers
    if (map.getLayer('ref-polygons-fill')) map.removeLayer('ref-polygons-fill');
    if (map.getLayer('ref-polygons-stroke')) map.removeLayer('ref-polygons-stroke');
    if (map.getLayer('ref-points-circle')) map.removeLayer('ref-points-circle');
    if (map.getSource('ref-source')) map.removeSource('ref-source');

    if (!referenceLayer || !referenceLayer.geojson) return;

    map.addSource('ref-source', {
      type: 'geojson',
      data: referenceLayer.geojson,
    });

    if (
      referenceLayer.geometryType === 'Polygon' ||
      referenceLayer.geometryType === 'MultiPolygon'
    ) {
      map.addLayer({
        id: 'ref-polygons-fill',
        type: 'fill',
        source: 'ref-source',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: 'ref-polygons-stroke',
        type: 'line',
        source: 'ref-source',
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-dasharray': [2, 1],
        },
      });
    } else if (referenceLayer.geometryType === 'Point') {
      map.addLayer({
        id: 'ref-points-circle',
        type: 'circle',
        source: 'ref-source',
        paint: {
          'circle-radius': 7,
          'circle-color': '#ef4444',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    // Fit map to reference bounds if no points are present
    if (!enrichedPointsGeoJSON && referenceLayer.geojson.features.length > 0) {
      fitToGeoJSON(map, referenceLayer.geojson);
    }
  }, [referenceLayer, mapLoaded]);

  // Update User Points Layer
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('points-layer')) map.removeLayer('points-layer');
    if (map.getSource('user-points')) map.removeSource('user-points');

    if (!enrichedPointsGeoJSON || enrichedPointsGeoJSON.features.length === 0) return;

    map.addSource('user-points', {
      type: 'geojson',
      data: enrichedPointsGeoJSON,
    });

    map.addLayer({
      id: 'points-layer',
      type: 'circle',
      source: 'user-points',
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'case',
          ['boolean', ['get', '_matched'], true],
          '#10b981', // Emerald for matched
          '#f59e0b', // Amber for unmatched
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Add click popup
    map.on('click', 'points-layer', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];
      const coords = (feature.geometry as any).coordinates.slice();
      const props = feature.properties || {};

      const content = Object.entries(props)
        .filter(([k]) => !k.startsWith('_'))
        .slice(0, 8)
        .map(
          ([key, val]) =>
            `<div class="text-sm py-1 flex items-start justify-between border-b border-slate-100 last:border-0"><strong class="text-slate-700 font-semibold pr-2">${key}:</strong> <span class="text-slate-900 font-mono font-medium text-right">${val}</span></div>`
        )
        .join('');

      new maplibregl.Popup({ offset: 12, maxWidth: '320px', className: 'geobridge-map-popup' })
        .setLngLat(coords)
        .setHTML(
          `<div class="p-2 font-sans">
            <div class="text-sm font-bold text-slate-900 pb-1.5 border-b border-slate-200 mb-1.5 flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider ${props._matched ? 'text-emerald-700' : 'text-amber-700'}">${props._matched ? 'Matched Record' : 'Unmatched'}</span>
            </div>
            ${content}
          </div>`
        )
        .addTo(map);
    });

    map.on('mouseenter', 'points-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'points-layer', () => {
      map.getCanvas().style.cursor = '';
    });

    fitToGeoJSON(map, enrichedPointsGeoJSON);
  }, [enrichedPointsGeoJSON, mapLoaded]);

  const fitToGeoJSON = (map: maplibregl.Map, geojson: FeatureCollection) => {
    try {
      const bounds = new maplibregl.LngLatBounds();
      let hasCoords = false;

      for (const feat of geojson.features) {
        if (!feat.geometry) continue;
        if (feat.geometry.type === 'Point') {
          bounds.extend(feat.geometry.coordinates as [number, number]);
          hasCoords = true;
        } else if (
          feat.geometry.type === 'Polygon' ||
          feat.geometry.type === 'MultiPolygon'
        ) {
          const coords =
            feat.geometry.type === 'Polygon'
              ? feat.geometry.coordinates[0]
              : feat.geometry.coordinates.flat(1);
          for (const c of coords) {
            bounds.extend(c as [number, number]);
            hasCoords = true;
          }
        }
      }

      if (hasCoords && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    } catch (e) {
      console.warn('Could not calculate bounds for map', e);
    }
  };

  const handleResetZoom = () => {
    const map = mapInstance.current;
    if (!map) return;
    if (enrichedPointsGeoJSON && enrichedPointsGeoJSON.features.length > 0) {
      fitToGeoJSON(map, enrichedPointsGeoJSON);
    } else if (referenceLayer) {
      fitToGeoJSON(map, referenceLayer.geojson);
    } else {
      map.flyTo({ center: [-98.5795, 39.8283], zoom: 3.5 });
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[420px]" />

      {/* Floating Map Controls & Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-200/90 text-sm">
          <div className="font-bold text-slate-900 flex items-center space-x-2 mb-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Map Layers</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            {referenceLayer && (
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-blue-500/50 border border-blue-600 inline-block" />
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">{referenceLayer.name}</span>
              </div>
            )}
            {enrichedPointsGeoJSON && (
              <>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-200" />
                  <span className="font-semibold text-slate-800">
                    Enriched Points ({enrichedPointsGeoJSON.features.length})
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleResetZoom}
        title="Reset map view"
        className="absolute bottom-4 right-4 z-10 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg text-slate-700 hover:text-emerald-700 hover:bg-white hover:scale-105 transition-all"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  );
};
