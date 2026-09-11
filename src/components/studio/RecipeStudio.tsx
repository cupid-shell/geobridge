import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Save,
  Upload,
  ArrowRight,
  Database,
  Download,
  PackageOpen,
  GitMerge,
} from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import type {
  FieldMapping,
  ReferenceLayer,
  SpatialOperationType,
  SpatialRecipe,
  RecipeStep,
} from '../../types/recipe';
import {
  createRecipeBundle,
  exportRecipeBundleFile,
  parseRecipeBundle,
} from '../../lib/data/recipe-bundle';
import { PreviewMap } from '../map/PreviewMap';
import { Tooltip } from '../common/Tooltip';

export const RecipeStudio: React.FC = () => {
  const {
    recipes,
    referenceLayers,
    addRecipe,
    deleteRecipe,
    addReferenceLayer,
    importBundle,
  } = useGeoBridgeStore();

  // Workflow Architecture Mode: Single Spatial Join vs Multi-Stage Pipeline
  const [workflowMode, setWorkflowMode] = useState<'single' | 'pipeline'>('single');

  // Shared Recipe Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SpatialRecipe['category']>('Sales & Ops');

  // Single Recipe State
  const [operation, setOperation] = useState<SpatialOperationType>('point_in_polygon');
  const [selectedLayerId, setSelectedLayerId] = useState<string>(referenceLayers[0]?.id || '');
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { sourceField: '', targetField: '', fallbackValue: 'Unassigned' },
  ]);
  const [bufferRadiusKm, setBufferRadiusKm] = useState<number>(5);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('miles');
  const [includeDistanceField, setIncludeDistanceField] = useState<boolean>(true);
  const [distanceFieldName, setDistanceFieldName] = useState<string>('distance_to_nearest_facility');

  // Multi-Stage Pipeline State
  const [pipelineSteps, setPipelineSteps] = useState<RecipeStep[]>([
    {
      id: 'step-1',
      name: 'Stage 1: Sales Territory Assignment',
      operation: 'point_in_polygon',
      referenceLayerId: referenceLayers[0]?.id || '',
      fieldMappings: [
        { sourceField: 'territory_name', targetField: 'Assigned_Territory', fallbackValue: 'Unassigned' },
      ],
    },
    {
      id: 'step-2',
      name: 'Stage 2: Nearest Fulfillment Hub & Distance',
      operation: 'nearest_neighbor',
      referenceLayerId: referenceLayers[1]?.id || referenceLayers[0]?.id || '',
      fieldMappings: [
        { sourceField: 'hub_name', targetField: 'Closest_Distribution_Hub', fallbackValue: 'None' },
      ],
      distanceUnit: 'miles',
      includeDistanceField: true,
      distanceFieldName: 'distance_to_nearest_hub_miles',
    },
  ]);

  // Notifications
  const [bundleNotification, setBundleNotification] = useState<string | null>(null);

  // Layer Upload State
  const [layerName, setLayerName] = useState('');
  const [layerDesc, setLayerDesc] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activeLayer = referenceLayers.find((l) => l.id === selectedLayerId);

  // Bundle Handlers
  const handleExportBundle = (r: SpatialRecipe) => {
    try {
      const bundle = createRecipeBundle(r, referenceLayers);
      exportRecipeBundleFile(bundle);
    } catch (err: any) {
      alert('Failed to export bundle: ' + err.message);
    }
  };

  const handleImportBundle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const bundle = parseRecipeBundle(text);
      const res = await importBundle(bundle);
      setBundleNotification(
        `Imported package "${bundle.recipe.title}" with ${res.layersImported} layer(s) into IndexedDB!`
      );
      setTimeout(() => setBundleNotification(null), 6000);
    } catch (err: any) {
      alert('Failed to import bundle: ' + err.message);
    }
  };

  // Layer Upload Handler
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

      await addReferenceLayer(newLayer);
      setSelectedLayerId(newLayer.id);
      setLayerName('');
      setLayerDesc('');
      alert(`Layer "${newLayer.name}" created with ${newLayer.featureCount} features!`);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse GeoJSON file');
    }
  };

  // Single Recipe Mapping Handlers
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
    if (mappings.some((m) => m.sourceField === field)) return;

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

  // Pipeline Step Handlers
  const handleAddPipelineStep = () => {
    const newStep: RecipeStep = {
      id: 'step-' + Date.now(),
      name: `Stage ${pipelineSteps.length + 1}: Spatial Join`,
      operation: 'point_in_polygon',
      referenceLayerId: referenceLayers[0]?.id || '',
      fieldMappings: [{ sourceField: '', targetField: '', fallbackValue: 'Unassigned' }],
    };
    setPipelineSteps([...pipelineSteps, newStep]);
  };

  const handleRemovePipelineStep = (index: number) => {
    if (pipelineSteps.length <= 1) {
      alert('A pipeline must have at least one stage.');
      return;
    }
    setPipelineSteps(pipelineSteps.filter((_, i) => i !== index));
  };

  const handleUpdatePipelineStep = (index: number, updates: Partial<RecipeStep>) => {
    const updated = [...pipelineSteps];
    updated[index] = { ...updated[index], ...updates };
    setPipelineSteps(updated);
  };

  const handleAddStepMapping = (stepIndex: number) => {
    const updated = [...pipelineSteps];
    updated[stepIndex].fieldMappings.push({
      sourceField: '',
      targetField: '',
      fallbackValue: 'Unassigned',
    });
    setPipelineSteps(updated);
  };

  const handleRemoveStepMapping = (stepIndex: number, mapIndex: number) => {
    const updated = [...pipelineSteps];
    updated[stepIndex].fieldMappings = updated[stepIndex].fieldMappings.filter(
      (_, i) => i !== mapIndex
    );
    setPipelineSteps(updated);
  };

  const handleUpdateStepMapping = (
    stepIndex: number,
    mapIndex: number,
    field: keyof FieldMapping,
    value: string
  ) => {
    const updated = [...pipelineSteps];
    updated[stepIndex].fieldMappings[mapIndex] = {
      ...updated[stepIndex].fieldMappings[mapIndex],
      [field]: value,
    };
    setPipelineSteps(updated);
  };

  // Recipe Publishing Form Submission
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please provide a recipe title.');
      return;
    }

    if (workflowMode === 'pipeline') {
      // Validate pipeline steps
      for (let i = 0; i < pipelineSteps.length; i++) {
        const step = pipelineSteps[i];
        if (!step.referenceLayerId) {
          alert(`Please select a reference layer for Stage ${i + 1}.`);
          return;
        }
        const validMaps = step.fieldMappings.filter(
          (m) => m.sourceField.trim() && m.targetField.trim()
        );
        if (validMaps.length === 0 && step.operation !== 'nearest_neighbor') {
          alert(`Please configure at least one column field mapping for Stage ${i + 1}.`);
          return;
        }
        step.fieldMappings = validMaps;
      }

      const chainedRecipe: SpatialRecipe = {
        id: 'custom-pipeline-' + Date.now(),
        title,
        description,
        category,
        operation: pipelineSteps[0].operation,
        referenceLayerId: pipelineSteps[0].referenceLayerId,
        fieldMappings: [],
        isChained: true,
        steps: pipelineSteps,
        author: 'GIS Specialist',
        createdAt: new Date().toISOString().split('T')[0],
        isPreset: false,
      };

      await addRecipe(chainedRecipe);
      alert(`Chained pipeline "${chainedRecipe.title}" published successfully!`);
    } else {
      // Single operation validation
      if (!selectedLayerId) {
        alert('Please select a reference layer.');
        return;
      }

      const validMappings = mappings.filter(
        (m) => m.sourceField.trim() && m.targetField.trim()
      );

      if (validMappings.length === 0 && operation !== 'nearest_neighbor') {
        alert('Please configure at least one column field mapping.');
        return;
      }

      const singleRecipe: SpatialRecipe = {
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

      await addRecipe(singleRecipe);
      alert(`Recipe "${singleRecipe.title}" published successfully!`);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Clean Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            GIS Recipe Studio
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Configure reference layers, spatial join logic, and output column mappings.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 text-xs font-bold transition-all cursor-pointer shadow-xs">
            <PackageOpen className="w-4 h-4 text-indigo-600" />
            <span>Import .georecipe</span>
            <input
              type="file"
              accept=".georecipe,.json"
              onChange={handleImportBundle}
              className="hidden"
            />
          </label>

          <div className="px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center space-x-2">
            <Database className="w-4 h-4 text-slate-500" />
            <span>{referenceLayers.length} Layers • {recipes.length} Recipes</span>
          </div>
        </div>
      </div>

      {bundleNotification && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PackageOpen className="w-4 h-4 text-indigo-600" />
            <span>{bundleNotification}</span>
          </div>
          <button
            onClick={() => setBundleNotification(null)}
            className="text-indigo-500 hover:text-indigo-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recipe Builder Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveRecipe} className="bg-white p-7 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-7">
            
            {/* Mode Selector */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Recipe Architecture
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select single spatial join or chained multi-stage pipeline.
                </p>
              </div>

              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setWorkflowMode('single')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    workflowMode === 'single'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Join
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('pipeline')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    workflowMode === 'pipeline'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pipeline (Chaining)</span>
                </button>
              </div>
            </div>

            {/* General Metadata */}
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
                  placeholder={
                    workflowMode === 'pipeline'
                      ? 'e.g., Enterprise Lead Qualification & Routing Pipeline'
                      : 'e.g., Regional Sales Territory & Manager Matcher'
                  }
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
                  Target Department
                </label>
                <input
                  type="text"
                  readOnly
                  value="Self-Service Portal"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-bold text-slate-800 block mb-1.5">
                  Description / User Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what this recipe calculates and what columns are appended to user spreadsheets..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* SINGLE OPERATION FORM */}
            {workflowMode === 'single' ? (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

                  <div>
                    <label className="text-sm font-bold text-slate-800 block mb-1.5">
                      Target Reference Layer *
                    </label>
                    <select
                      value={selectedLayerId}
                      onChange={(e) => setSelectedLayerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {referenceLayers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.geometryType} • {l.featureCount} features)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                            className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Single Mappings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Field Mappings (Appended Columns)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Map source layer attributes to target column names in the enriched spreadsheet.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMapping}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Column</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {mappings.map((m, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200"
                      >
                        <div className="sm:col-span-4">
                          <select
                            value={m.sourceField}
                            onChange={(e) => handleUpdateMapping(idx, 'sourceField', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800"
                          >
                            <option value="">-- Select Layer Attribute --</option>
                            {activeLayer?.availableFields.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-1 text-center text-slate-400">
                          <ArrowRight className="w-4 h-4 mx-auto" />
                        </div>

                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Target Column Name"
                            value={m.targetField}
                            onChange={(e) => handleUpdateMapping(idx, 'targetField', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Fallback Value"
                            value={m.fallbackValue ?? ''}
                            onChange={(e) => handleUpdateMapping(idx, 'fallbackValue', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* MULTI-STAGE PIPELINE BUILDER */
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <GitMerge className="w-4 h-4 text-indigo-600" />
                      <span>Pipeline Execution Stages ({pipelineSteps.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Executed sequentially in a single pass by the Web Worker.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPipelineStep}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stage</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {pipelineSteps.map((step, sIdx) => {
                    const stepLayer = referenceLayers.find((l) => l.id === step.referenceLayerId);
                    return (
                      <div
                        key={step.id}
                        className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                              {sIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) =>
                                handleUpdatePipelineStep(sIdx, { name: e.target.value })
                              }
                              className="font-bold text-slate-900 text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePipelineStep(sIdx)}
                            className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            Remove Stage
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Stage Operation
                            </label>
                            <select
                              value={step.operation}
                              onChange={(e) =>
                                handleUpdatePipelineStep(sIdx, {
                                  operation: e.target.value as SpatialOperationType,
                                })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                            >
                              <option value="point_in_polygon">Point in Polygon (Territory/Boundary)</option>
                              <option value="nearest_neighbor">Nearest Neighbor (Closest Hub/Distance)</option>
                              <option value="buffer_intersect">Proximity Buffer & Intersect</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Reference Layer
                            </label>
                            <select
                              value={step.referenceLayerId}
                              onChange={(e) =>
                                handleUpdatePipelineStep(sIdx, { referenceLayerId: e.target.value })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                            >
                              {referenceLayers.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name} ({l.geometryType})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Step Mappings */}
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Stage Output Columns:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddStepMapping(sIdx)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              + Add Column
                            </button>
                          </div>

                          <div className="space-y-2">
                            {step.fieldMappings.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200"
                              >
                                <div className="col-span-5">
                                  <select
                                    value={m.sourceField}
                                    onChange={(e) =>
                                      handleUpdateStepMapping(sIdx, mIdx, 'sourceField', e.target.value)
                                    }
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs font-mono font-bold"
                                  >
                                    <option value="">-- Layer Attribute --</option>
                                    {stepLayer?.availableFields.map((f) => (
                                      <option key={f} value={f}>
                                        {f}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-1 text-center text-slate-400">
                                  <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                                </div>
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    placeholder="Target Column Name"
                                    value={m.targetField}
                                    onChange={(e) =>
                                      handleUpdateStepMapping(sIdx, mIdx, 'targetField', e.target.value)
                                    }
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-indigo-900"
                                  />
                                </div>
                                <div className="col-span-1 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStepMapping(sIdx, mIdx)}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 px-6 rounded-xl text-white font-black text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>
                {workflowMode === 'pipeline'
                  ? 'Publish Multi-Stage Pipeline'
                  : 'Publish Recipe for Business Users'}
              </span>
            </button>
          </form>

          {/* Published Recipes Management */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
                      {r.isChained && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-800 rounded-full border border-purple-200 flex items-center space-x-1">
                          <GitMerge className="w-3 h-3" />
                          <span>{r.steps?.length || 2}-Stage Pipeline</span>
                        </span>
                      )}
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

                  <div className="flex items-center space-x-1 shrink-0">
                    <Tooltip
                      title="Export .georecipe Bundle"
                      content="Download this recipe and its underlying GeoJSON reference layers as a portable .georecipe package."
                      position="left"
                    >
                      <button
                        type="button"
                        onClick={() => handleExportBundle(r)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Export .georecipe Bundle"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </Tooltip>

                    {!r.isPreset && (
                      <button
                        type="button"
                        onClick={() => deleteRecipe(r.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Layer Asset Manager & Map Preview */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upload Custom Reference Layer */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
                      className="px-3 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 text-slate-800 hover:text-indigo-900 rounded-lg font-mono text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
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
