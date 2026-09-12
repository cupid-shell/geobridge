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
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SegmentedControl } from '../ui/SegmentedControl';

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
        `Imported package "${bundle.recipe.title}" with ${res.layersImported} layer(s) into IndexedDB`
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
      { sourceField: '', targetField: '', fallbackValue: 'Unassigned' },
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
    <div className="space-y-6 pb-16">
      
      {/* Studio Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-surface-border">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block mb-0.5">
            GIS Engineering
          </span>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              GIS Recipe Studio
            </h1>
            <Badge variant="neutral" size="sm">
              Authoring Deck
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 leading-relaxed">
            Author boundary match logic, facility proximity joins, and column schemas for non-technical users.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-surface-card hover:bg-surface-subtle text-slate-700 rounded-lg border border-surface-border text-xs font-semibold transition-colors cursor-pointer shadow-2xs">
            <PackageOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Import .georecipe</span>
            <input
              type="file"
              accept=".georecipe,.json"
              onChange={handleImportBundle}
              className="hidden"
            />
          </label>

          <div className="px-3 py-2 bg-surface-subtle rounded-lg border border-surface-border text-xs font-medium text-slate-600 flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-xs">{referenceLayers.length} Layers • {recipes.length} Recipes</span>
          </div>
        </div>
      </div>

      {bundleNotification && (
        <div className="bg-accent-50/70 border border-accent-200 text-accent-950 px-4 py-3 rounded-lg text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PackageOpen className="w-4 h-4 text-accent-600 shrink-0" />
            <span>{bundleNotification}</span>
          </div>
          <button
            onClick={() => setBundleNotification(null)}
            className="text-accent-700 hover:text-accent-950 text-xs font-semibold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Recipe Builder Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b border-surface-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block leading-none mb-0.5">
                    Rule Definition
                  </span>
                  <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight">
                    Recipe Architecture
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Define single-pass containment or multi-stage pipeline.
                  </CardDescription>
                </div>

                <SegmentedControl
                  size="sm"
                  options={[
                    { value: 'single', label: 'Single Join' },
                    { value: 'pipeline', label: 'Chained Pipeline' },
                  ]}
                  value={workflowMode}
                  onChange={(v) => setWorkflowMode(v as 'single' | 'pipeline')}
                />
              </div>
            </CardHeader>

            <form onSubmit={handleSaveRecipe} className="p-5 space-y-5">
              
              {/* General Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
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
                    className="w-full bg-surface-card border border-surface-border rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-accent-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Business Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-accent-600 cursor-pointer"
                  >
                    <option value="Sales & Ops">Sales & Ops</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Risk & Compliance">Risk & Compliance</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Target Execution
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="In-Browser Worker Engine"
                    className="w-full bg-surface-subtle border border-surface-border rounded-lg px-3 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    User Description & Operational Guidelines
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what spatial calculation this performs and what columns will be appended..."
                    className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-accent-600 font-normal"
                  />
                </div>
              </div>

              {/* SINGLE OPERATION FORM */}
              {workflowMode === 'single' ? (
                <div className="space-y-5 pt-4 border-t border-surface-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Spatial Operation *
                      </label>
                      <select
                        value={operation}
                        onChange={(e) => setOperation(e.target.value as any)}
                        className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-accent-600 cursor-pointer"
                      >
                        <option value="point_in_polygon">Point in Polygon (Territories & Boundaries)</option>
                        <option value="nearest_neighbor">Nearest Neighbor (Closest Hub & Distance)</option>
                        <option value="buffer_intersect">Proximity Buffer & Intersect</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Reference Layer *
                      </label>
                      <select
                        value={selectedLayerId}
                        onChange={(e) => setSelectedLayerId(e.target.value)}
                        className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-accent-600 cursor-pointer"
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
                    <div className="p-3.5 bg-surface-subtle rounded-lg border border-surface-border text-xs space-y-2">
                      <label className="font-semibold text-slate-800 block">
                        Buffer Radius (Kilometers)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={bufferRadiusKm}
                          onChange={(e) => setBufferRadiusKm(parseFloat(e.target.value))}
                          className="w-28 bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 font-mono font-semibold text-slate-900 text-xs"
                        />
                        <span className="text-slate-500 font-medium">km buffer surrounding geometry features</span>
                      </div>
                    </div>
                  )}

                  {operation === 'nearest_neighbor' && (
                    <div className="p-3.5 bg-surface-subtle rounded-lg border border-surface-border text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-semibold text-slate-800 block">
                            Include Distance Metric
                          </label>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Appends calculated distance to closest point
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={includeDistanceField}
                          onChange={(e) => setIncludeDistanceField(e.target.checked)}
                          className="w-4 h-4 text-accent-600 rounded cursor-pointer"
                        />
                      </div>

                      {includeDistanceField && (
                        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-surface-border">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Distance Unit
                            </label>
                            <select
                              value={distanceUnit}
                              onChange={(e) => setDistanceUnit(e.target.value as any)}
                              className="w-full bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-medium"
                            >
                              <option value="miles">Miles (mi)</option>
                              <option value="km">Kilometers (km)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Distance Column Header
                            </label>
                            <input
                              type="text"
                              value={distanceFieldName}
                              onChange={(e) => setDistanceFieldName(e.target.value)}
                              className="w-full bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Single Mappings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block mb-0.5">
                          Schema Configuration
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                          Field Output Mappings
                        </h3>
                        <p className="text-xs text-slate-500">
                          Map source polygon attributes into target spreadsheet column names.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddMapping}
                        leftIcon={<Plus className="w-3 h-3" />}
                      >
                        Add Column
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {mappings.map((m, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-surface-subtle p-2.5 rounded-lg border border-surface-border"
                        >
                          <div className="sm:col-span-4">
                            <select
                              value={m.sourceField}
                              onChange={(e) => handleUpdateMapping(idx, 'sourceField', e.target.value)}
                              className="w-full bg-surface-card border border-surface-border rounded-md px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800"
                            >
                              <option value="">-- Layer Attribute --</option>
                              {activeLayer?.availableFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-1 text-center text-slate-400">
                            <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                          </div>

                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              placeholder="Target Column Name"
                              value={m.targetField}
                              onChange={(e) => handleUpdateMapping(idx, 'targetField', e.target.value)}
                              className="w-full bg-surface-card border border-surface-border rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-900"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Fallback"
                              value={m.fallbackValue ?? ''}
                              onChange={(e) => handleUpdateMapping(idx, 'fallbackValue', e.target.value)}
                              className="w-full bg-surface-card border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-slate-500"
                            />
                          </div>

                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* MULTI-STAGE PIPELINE BUILDER */
                <div className="space-y-5 pt-4 border-t border-surface-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block mb-0.5">
                        Sequential Execution
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-1.5">
                        <GitMerge className="w-4 h-4 text-accent-600" />
                        <span>Pipeline Execution Stages ({pipelineSteps.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Executed sequentially in a single pass by the Web Worker.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddPipelineStep}
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      Add Stage
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {pipelineSteps.map((step, sIdx) => {
                      const stepLayer = referenceLayers.find((l) => l.id === step.referenceLayerId);
                      return (
                        <div
                          key={step.id}
                          className="bg-surface-subtle p-4 rounded-lg border border-surface-border space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                                {sIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={step.name}
                                onChange={(e) =>
                                  handleUpdatePipelineStep(sIdx, { name: e.target.value })
                                }
                                className="font-semibold text-slate-900 text-xs bg-surface-card border border-surface-border rounded px-2 py-1 focus:ring-1 focus:ring-accent-600"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePipelineStep(sIdx)}
                              className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              Remove Stage
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Stage Operation
                              </label>
                              <select
                                value={step.operation}
                                onChange={(e) =>
                                  handleUpdatePipelineStep(sIdx, {
                                    operation: e.target.value as SpatialOperationType,
                                  })
                                }
                                className="w-full bg-surface-card border border-surface-border rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                              >
                                <option value="point_in_polygon">Point in Polygon (Territory/Boundary)</option>
                                <option value="nearest_neighbor">Nearest Neighbor (Closest Hub/Distance)</option>
                                <option value="buffer_intersect">Proximity Buffer & Intersect</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Reference Layer
                              </label>
                              <select
                                value={step.referenceLayerId}
                                onChange={(e) =>
                                  handleUpdatePipelineStep(sIdx, { referenceLayerId: e.target.value })
                                }
                                className="w-full bg-surface-card border border-surface-border rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800"
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
                          <div className="space-y-2 pt-2 border-t border-surface-border">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Output Columns:
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddStepMapping(sIdx)}
                                className="text-xs font-semibold text-accent-700 hover:text-accent-900 cursor-pointer"
                              >
                                + Add Column
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {step.fieldMappings.map((m, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="grid grid-cols-12 gap-2 items-center bg-surface-card p-2 rounded border border-surface-border"
                                >
                                  <div className="col-span-5">
                                    <select
                                      value={m.sourceField}
                                      onChange={(e) =>
                                        handleUpdateStepMapping(sIdx, mIdx, 'sourceField', e.target.value)
                                      }
                                      className="w-full bg-surface-subtle border border-surface-border rounded px-2 py-1 text-xs font-mono font-medium"
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
                                    <ArrowRight className="w-3 h-3 mx-auto" />
                                  </div>
                                  <div className="col-span-5">
                                    <input
                                      type="text"
                                      placeholder="Target Column Name"
                                      value={m.targetField}
                                      onChange={(e) =>
                                        handleUpdateStepMapping(sIdx, mIdx, 'targetField', e.target.value)
                                      }
                                      className="w-full bg-surface-subtle border border-surface-border rounded px-2 py-1 text-xs font-medium text-slate-900"
                                    />
                                  </div>
                                  <div className="col-span-1 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStepMapping(sIdx, mIdx)}
                                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                leftIcon={<Save className="w-4 h-4" />}
                className="w-full mt-4"
              >
                {workflowMode === 'pipeline'
                  ? 'Publish Multi-Stage Pipeline'
                  : 'Publish Recipe for Business Users'}
              </Button>
            </form>
          </Card>

          {/* Published Recipes Management */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block leading-none mb-0.5">
                    Registry
                  </span>
                  <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight">
                    Published Recipes ({recipes.length})
                  </CardTitle>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Ready in Self-Service Portal</span>
              </div>
            </CardHeader>

            <div className="divide-y divide-surface-border">
              {recipes.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-subtle transition-colors">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{r.title}</span>
                      {r.isChained && (
                        <Badge variant="info" size="sm">
                          {r.steps?.length || 2}-Stage Pipeline
                        </Badge>
                      )}
                      {r.isPreset ? (
                        <Badge variant="neutral" size="sm">
                          Preset
                        </Badge>
                      ) : (
                        <Badge variant="info" size="sm">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-normal">{r.description}</p>
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
                        className="p-1.5 text-slate-400 hover:text-accent-700 hover:bg-surface-subtle rounded-md transition-colors cursor-pointer"
                        title="Export .georecipe Bundle"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>

                    {!r.isPreset && (
                      <button
                        type="button"
                        onClick={() => deleteRecipe(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Layer Asset Manager & Map Preview */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upload Custom Reference Layer */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Layers className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block leading-none mb-0.5">
                    Layer Ingestion
                  </span>
                  <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight">
                    Upload Reference Layer (GeoJSON)
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <div className="p-4 space-y-3.5 text-xs">
              {uploadError && (
                <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium">
                  {uploadError}
                </p>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Layer Display Name</label>
                <input
                  type="text"
                  placeholder="e.g., Enterprise Flood Risk Polygons"
                  value={layerName}
                  onChange={(e) => setLayerName(e.target.value)}
                  className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
                />
              </div>

              <div className="relative border-2 border-dashed border-surface-border hover:border-slate-400 bg-surface-subtle rounded-xl p-5 text-center cursor-pointer group transition-colors">
                <input
                  type="file"
                  accept=".geojson, .json"
                  onChange={handleLayerUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5 group-hover:text-accent-600 transition-colors" />
                <p className="font-semibold text-slate-900 text-xs">Drop GeoJSON File Here</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Standard WGS84 (EPSG:4326) Polygon or Point FeatureCollection
                </p>
              </div>
            </div>
          </Card>

          {/* Layer Map Preview */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-accent-700 block leading-none mb-0.5">
                    Active Layer Preview
                  </span>
                  <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {activeLayer?.name}
                  </CardTitle>
                </div>
                <Badge variant="neutral" size="sm">
                  {activeLayer?.featureCount} features
                </Badge>
              </div>
            </CardHeader>

            <div className="p-3">
              <PreviewMap referenceLayer={activeLayer} className="h-[380px]" />
            </div>

            {activeLayer && (
              <div className="p-3.5 bg-surface-subtle border-t border-surface-border space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Click to add attribute to recipe:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeLayer.availableFields.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleQuickAddAttribute(f)}
                      className="px-2.5 py-1 bg-surface-card hover:bg-surface-subtle border border-surface-border text-slate-800 rounded font-mono text-xs font-medium transition-colors shadow-2xs flex items-center space-x-1 cursor-pointer"
                      title={`Click to add "${f}" to output mappings`}
                    >
                      <Plus className="w-3 h-3 text-slate-500" />
                      <span>{f}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

        </div>

      </div>

    </div>
  );
};
