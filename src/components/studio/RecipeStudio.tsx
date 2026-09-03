import React, { useState } from 'react';
import {
  Wrench,
  Layers,
  Plus,
  Trash2,
  Save,
  Upload,
  ArrowRight,
  Database,
} from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import type {
  FieldMapping,
  ReferenceLayer,
  SpatialOperationType,
  SpatialRecipe,
} from '../../types/recipe';
import { PreviewMap } from '../map/PreviewMap';

export const RecipeStudio: React.FC = () => {
  const {
    recipes,
    referenceLayers,
    addRecipe,
    deleteRecipe,
    addReferenceLayer,
  } = useGeoBridgeStore();

  // New Recipe State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SpatialRecipe['category']>('Sales & Ops');
  const [operation, setOperation] = useState<SpatialOperationType>('point_in_polygon');
  const [selectedLayerId, setSelectedLayerId] = useState<string>(referenceLayers[0]?.id || '');
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { sourceField: '', targetField: '', fallbackValue: 'Unassigned' },
  ]);
  const [bufferRadiusKm, setBufferRadiusKm] = useState<number>(5);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('miles');
  const [includeDistanceField, setIncludeDistanceField] = useState<boolean>(true);
  const [distanceFieldName, setDistanceFieldName] = useState<string>('distance_to_nearest_facility');

  // Layer Upload State
  const [layerName, setLayerName] = useState('');
  const [layerDesc, setLayerDesc] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activeLayer = referenceLayers.find((l) => l.id === selectedLayerId);

  const handleLayerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
        throw new Error('Invalid GeoJSON. Must be a FeatureCollection.');
      }

      const firstFeature = parsed.features[0];
      const geomType = firstFeature?.geometry?.type || 'Polygon';
      const availableFields = firstFeature?.properties
        ? Object.keys(firstFeature.properties)
        : [];

      const newLayer: ReferenceLayer = {
        id: 'custom-layer-' + Date.now(),
        name: layerName || file.name.replace(/\.[^/.]+$/, ''),
        description: layerDesc || `Uploaded on ${new Date().toLocaleDateString()}`,
        geometryType: geomType === 'Point' ? 'Point' : 'Polygon',
        geojson: parsed,
        availableFields,
        featureCount: parsed.features.length,
      };

      addReferenceLayer(newLayer);
      setSelectedLayerId(newLayer.id);
      setLayerName('');
      setLayerDesc('');
      alert(`Layer "${newLayer.name}" created with ${newLayer.featureCount} features!`);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse GeoJSON file');
    }
  };

  const handleAddMapping = () => {
    setMappings([
      ...mappings,
      { sourceField: '', targetField: '', fallbackValue: '' },
    ]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleUpdateMapping = (
    index: number,
    field: keyof FieldMapping,
    val: string
  ) => {
    const next = [...mappings];
    next[index] = { ...next[index], [field]: val };
    setMappings(next);
  };

  const handleQuickAddAttribute = (field: string) => {
    // Check if field is already mapped
    if (mappings.some((m) => m.sourceField === field)) return;

    // Replace first empty mapping or append
    const emptyIndex = mappings.findIndex((m) => !m.sourceField);
    const targetName = field
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('_');

    if (emptyIndex !== -1) {
      const next = [...mappings];
      next[emptyIndex] = {
        sourceField: field,
        targetField: targetName,
        fallbackValue: 'Unassigned',
      };
      setMappings(next);
    } else {
      setMappings([
        ...mappings,
        {
          sourceField: field,
          targetField: targetName,
          fallbackValue: 'Unassigned',
        },
      ]);
    }
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedLayerId) {
      alert('Please provide a title and select a reference layer.');
      return;
    }

    const validMappings = mappings.filter(
      (m) => m.sourceField.trim() && m.targetField.trim()
    );

    if (validMappings.length === 0 && operation !== 'nearest_neighbor') {
      alert('Please configure at least one column field mapping.');
      return;
    }

    const newRecipe: SpatialRecipe = {
      id: 'custom-recipe-' + Date.now(),
      title,
      description,
      category,
      operation,
      referenceLayerId: selectedLayerId,
      fieldMappings: validMappings,
      bufferRadiusKm: operation === 'buffer_intersect' ? bufferRadiusKm : undefined,
      distanceUnit: operation === 'nearest_neighbor' ? distanceUnit : undefined,
      includeDistanceField: operation === 'nearest_neighbor' ? includeDistanceField : undefined,
      distanceFieldName: operation === 'nearest_neighbor' ? distanceFieldName : undefined,
      author: 'GIS Specialist',
      createdAt: new Date().toISOString().split('T')[0],
      isPreset: false,
    };

    addRecipe(newRecipe);
    alert(`Recipe "${newRecipe.title}" published successfully!`);
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Studio Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-200/80">
            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
            <span>GIS Specialist Admin Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Build & Publish Reusable Spatial Recipes
          </h1>
          <p className="text-slate-600 text-base sm:text-lg mt-1 max-w-3xl leading-relaxed">
            Upload authoritative boundary or facility datasets, configure spatial join operations, and publish self-service lookup tools for business stakeholders.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-200 text-sm font-bold text-indigo-900 flex items-center space-x-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>{referenceLayers.length} Layers • {recipes.length} Recipes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recipe Builder Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveRecipe} className="bg-white p-7 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-7">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                1. Recipe Parameters & Logic
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Define the user-facing recipe name, operational mode, and target reference layer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Regional Sales Territory & Manager Matcher"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Business Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Sales & Ops">Sales & Ops</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Risk & Compliance">Risk & Compliance</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Spatial Operation Type *
                </label>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="point_in_polygon">Point in Polygon (Territories & Zones)</option>
                  <option value="nearest_neighbor">Nearest Neighbor (Closest Hub & Distance)</option>
                  <option value="buffer_intersect">Proximity Buffer & Intersect</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Description / User Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what this recipe calculates and which columns will be appended to the user spreadsheet..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Target Reference Layer */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800 block">
                Target Reference Layer *
              </label>
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {referenceLayers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.geometryType} • {l.featureCount} features)
                  </option>
                ))}
              </select>
            </div>

            {/* Operation Specific Parameters */}
            {operation === 'buffer_intersect' && (
              <div className="p-5 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-sm space-y-3">
                <label className="font-bold text-indigo-950 block">
                  Buffer Radius (Kilometers)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={bufferRadiusKm}
                    onChange={(e) => setBufferRadiusKm(parseFloat(e.target.value))}
                    className="w-36 bg-white border border-indigo-300 rounded-xl px-4 py-2 font-bold text-indigo-900 text-base"
                  />
                  <span className="text-indigo-800 font-semibold">km radius around reference shapes</span>
                </div>
              </div>
            )}

            {operation === 'nearest_neighbor' && (
              <div className="p-5 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-indigo-950 block">
                      Include Distance Calculation Column
                    </label>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Automatically appends numerical distance to closest facility
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeDistanceField}
                    onChange={(e) => setIncludeDistanceField(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {includeDistanceField && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-indigo-200/80">
                    <div>
                      <label className="text-xs font-bold text-indigo-900 block mb-1">
                        Distance Unit
                      </label>
                      <select
                        value={distanceUnit}
                        onChange={(e) => setDistanceUnit(e.target.value as any)}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-semibold"
                      >
                        <option value="miles">Miles (mi)</option>
                        <option value="km">Kilometers (km)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-indigo-900 block mb-1">
                        Appended Column Name
                      </label>
                      <input
                        type="text"
                        value={distanceFieldName}
                        onChange={(e) => setDistanceFieldName(e.target.value)}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-mono font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Field Mappings Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    2. Output Column Mappings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select attributes from the layer and choose how they should appear in the user spreadsheet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMapping}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold flex items-center space-x-1.5 transition-colors border border-indigo-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Column</span>
                </button>
              </div>

              <div className="space-y-3">
                {mappings.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200"
                  >
                    {/* Source Field from Layer */}
                    <div className="flex-1">
                      <select
                        value={mapping.sourceField}
                        onChange={(e) =>
                          handleUpdateMapping(idx, 'sourceField', e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold"
                      >
                        <option value="">-- Select Source Field --</option>
                        {activeLayer?.availableFields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 self-center hidden sm:block" />

                    {/* Target Field in output */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Output Column Name"
                        value={mapping.targetField}
                        onChange={(e) =>
                          handleUpdateMapping(idx, 'targetField', e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-semibold"
                      />
                    </div>

                    {/* Fallback Value */}
                    <div className="sm:w-36">
                      <input
                        type="text"
                        placeholder="Fallback if unmatched"
                        value={String(mapping.fallbackValue ?? '')}
                        onChange={(e) =>
                          handleUpdateMapping(idx, 'fallbackValue', e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-600"
                        title="Value if coordinates fall outside reference shape"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end sm:self-center"
                      title="Remove column mapping"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-6 rounded-xl text-white font-black text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>Publish Recipe for Business Users</span>
            </button>
          </form>

          {/* Published Recipes Management */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Active Published Recipes ({recipes.length})
              </h3>
              <span className="text-xs text-slate-500 font-medium">Ready in Self-Service Portal</span>
            </div>

            <div className="divide-y divide-slate-100">
              {recipes.map((r) => (
                <div key={r.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-bold text-slate-900">{r.title}</span>
                      {r.isPreset ? (
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                          Preset
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{r.description}</p>
                  </div>

                  {!r.isPreset && (
                    <button
                      onClick={() => deleteRecipe(r.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete recipe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Layer Asset Manager & Map Preview */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upload Custom Reference Layer */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Upload New Reference Layer (GeoJSON)
              </h3>
            </div>

            {uploadError && (
              <p className="text-sm text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
                {uploadError}
              </p>
            )}

            <div className="space-y-4 text-sm">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Layer Display Name</label>
                <input
                  type="text"
                  placeholder="e.g., Enterprise Flood Risk Polygons"
                  value={layerName}
                  onChange={(e) => setLayerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium"
                />
              </div>

              <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 rounded-2xl p-6 text-center cursor-pointer group transition-all">
                <input
                  type="file"
                  accept=".geojson, .json"
                  onChange={handleLayerUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-indigo-950 text-base">Drop GeoJSON File Here</p>
                <p className="text-xs text-indigo-700 mt-1 font-medium">
                  Standard WGS84 (EPSG:4326) Polygon or Point Collection
                </p>
              </div>
            </div>
          </div>

          {/* Layer Map Preview */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Reference Layer
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {activeLayer?.name}
                </h3>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold border border-slate-200">
                {activeLayer?.featureCount} features
              </span>
            </div>

            <PreviewMap referenceLayer={activeLayer} className="h-[400px]" />

            {activeLayer && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Click to add attribute to recipe:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeLayer.availableFields.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleQuickAddAttribute(f)}
                      className="px-3 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 text-slate-800 hover:text-indigo-900 rounded-lg font-mono text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
                      title={`Click to add "${f}" to output mappings`}
                    >
                      <Plus className="w-3 h-3 text-indigo-600" />
                      <span>{f}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
