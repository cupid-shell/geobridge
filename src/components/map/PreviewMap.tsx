import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { Layers, Maximize2, Compass } from 'lucide-react';
import type { ReferenceLayer } from '../../types/recipe';

interface PreviewMapProps {
  referenceLayer?: ReferenceLayer;
  enrichedPointsGeoJSON?: FeatureCollection | null;
  className?: string;
  onPointSelect?: (properties: Record<string, any>) => void;
}

export const PreviewMap: React.FC<PreviewMapProps> = ({
  referenceLayer,
  enrichedPointsGeoJSON,
  className = 'h-96',
  onPointSelect,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(3.5);

  // Initialize Map with high-contrast, clean analytical Positron tiles
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-positron': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap, © CARTO',
          },
        },
        layers: [
          {
            id: 'carto-positron-layer',
            type: 'raster',
            source: 'carto-positron',
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

    map.on('mousemove', (e) => {
      setCursorCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('zoom', () => {
      setZoomLevel(map.getZoom());
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
          'fill-color': '#1d4ed8',
          'fill-opacity': 0.1,
        },
      });

      map.addLayer({
        id: 'ref-polygons-stroke',
        type: 'line',
        source: 'ref-source',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 1.5,
          'line-opacity': 0.8,
        },
      });
    } else if (referenceLayer.geometryType === 'Point') {
      map.addLayer({
        id: 'ref-points-circle',
        type: 'circle',
        source: 'ref-source',
        paint: {
          'circle-radius': 6,
          'circle-color': '#0284c7',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!enrichedPointsGeoJSON && referenceLayer.geojson.features.length > 0) {
      fitToGeoJSON(map, referenceLayer.geojson);
    }
  }, [referenceLayer, mapLoaded]);

  // Update Enriched User Points Layer with Clustering
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('clusters-circle')) map.removeLayer('clusters-circle');
    if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
    if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
    if (map.getSource('user-points')) map.removeSource('user-points');

    if (!enrichedPointsGeoJSON || enrichedPointsGeoJSON.features.length === 0) return;

    map.addSource('user-points', {
      type: 'geojson',
      data: enrichedPointsGeoJSON,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40,
    });

    // Clustered circles
    map.addLayer({
      id: 'clusters-circle',
      type: 'circle',
      source: 'user-points',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#1e293b', // default slate-800
          25,
          '#0f172a',
          100,
          '#020617',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16,
          25,
          20,
          100,
          26,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Cluster count label
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'user-points',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold'],
        'text-size': 11,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Unclustered individual points
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'user-points',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 5.5,
        'circle-color': [
          'case',
          ['==', ['get', 'match_confidence'], 'HIGH_EXACT'],
          '#16a34a',
          ['==', ['get', 'match_confidence'], 'CENTROID_FALLBACK'],
          '#0284c7',
          ['==', ['get', 'match_confidence'], 'AMBIGUOUS_OVERLAP'],
          '#d97706',
          ['==', ['get', 'match_confidence'], 'BORDERLINE_REVIEW'],
          '#d97706',
          '#dc2626', // unmatched
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Inspect individual point on click
    map.on('click', 'unclustered-point', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];
      const coords = (feature.geometry as any).coordinates.slice();
      const props = feature.properties || {};

      if (onPointSelect) {
        onPointSelect(props);
      }

      const rowsHtml = Object.entries(props)
        .filter(([k]) => !k.startsWith('_'))
        .slice(0, 8)
        .map(
          ([k, v]) =>
            `<div class="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
              <span class="text-slate-500 font-medium">${k}</span>
              <span class="font-mono text-slate-900 font-medium">${v ?? '-'}</span>
            </div>`
        )
        .join('');

      new maplibregl.Popup({ offset: 12, maxWidth: '280px' })
        .setLngLat(coords)
        .setHTML(
          `<div class="font-sans space-y-1.5 p-1">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200">
              Record Inspection
            </div>
            <div class="space-y-0.5">
              ${rowsHtml}
            </div>
          </div>`
        )
        .addTo(map);
    });

    // Zoom on cluster click
    map.on('click', 'clusters-circle', (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters-circle'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source: any = map.getSource('user-points');
      if (source && clusterId) {
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom + 0.5,
          });
        });
      }
    });

    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'clusters-circle', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters-circle', () => {
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
        map.fitBounds(bounds, { padding: 45, maxZoom: 13 });
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
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100 ${className}`}
    >
      <div ref={mapContainer} className="w-full h-full min-h-[380px]" />

      {/* Top-Left: Active Layer Overlay Card */}
      <div className="absolute top-3 left-3 z-10 flex flex-col space-y-1.5 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-xs border border-slate-200/80 text-xs pointer-events-auto space-y-1.5 min-w-[170px]">
          <div className="flex items-center space-x-1.5 text-slate-800 font-semibold text-[11px] uppercase tracking-wider pb-1 border-b border-slate-100">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Map Layers</span>
          </div>

          <div className="space-y-1 text-xs">
            {referenceLayer && (
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500/30 border border-blue-600 shrink-0" />
                  <span className="text-slate-700 truncate font-medium max-w-[130px]" title={referenceLayer.name}>
                    {referenceLayer.name}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {referenceLayer.featureCount}
                </span>
              </div>
            )}

            {enrichedPointsGeoJSON && (
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-emerald-300 shrink-0" />
                  <span className="text-slate-700 font-medium">Points</span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {enrichedPointsGeoJSON.features.length.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top-Right: Map Utilities */}
      <div className="absolute top-3 right-12 z-10">
        <button
          type="button"
          onClick={handleResetZoom}
          title="Zoom to data extent"
          className="p-1.5 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/80 shadow-xs text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left: Real-Time Coordinate Telemetry Readout */}
      <div className="absolute bottom-2 left-3 z-10 pointer-events-none">
        <div className="backdrop-blur-sm bg-white/90 border border-slate-200/70 rounded-md px-2.5 py-1 text-xs font-mono text-slate-600 tabular-nums flex items-center space-x-2 shadow-2xs">
          <Compass className="w-3 h-3 text-slate-400" />
          <span>
            {cursorCoords
              ? `${cursorCoords.lat.toFixed(4)}°, ${cursorCoords.lng.toFixed(4)}°`
              : 'Hover to inspect'}
          </span>
          <span className="text-slate-300">|</span>
          <span>Zoom: {zoomLevel.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};
