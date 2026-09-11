import type { GeoRecipeBundle, ReferenceLayer, SpatialRecipe } from '../../types/recipe';

/**
 * Creates a self-contained .georecipe bundle containing a recipe and its underlying GeoJSON reference layers.
 */
export function createRecipeBundle(
  recipe: SpatialRecipe,
  availableLayers: ReferenceLayer[],
  options?: { author?: string; notes?: string; tags?: string[] }
): GeoRecipeBundle {
  // Collect all layer IDs required by this recipe (single layer or multi-step chain)
  const requiredLayerIds = new Set<string>();
  if (recipe.referenceLayerId) {
    requiredLayerIds.add(recipe.referenceLayerId);
  }
  if (recipe.steps && Array.isArray(recipe.steps)) {
    recipe.steps.forEach((step) => {
      if (step.referenceLayerId) {
        requiredLayerIds.add(step.referenceLayerId);
      }
    });
  }

  // Filter available layers to include only those needed by the recipe
  const bundledLayers = availableLayers.filter((layer) =>
    requiredLayerIds.has(layer.id)
  );

  return {
    format: 'geobridge-bundle',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    author: options?.author || recipe.author || 'GIS Specialist',
    metadata: {
      notes: options?.notes || recipe.description,
      tags: options?.tags || [recipe.category],
    },
    recipe,
    bundledLayers,
  };
}

/**
 * Validates whether an unknown object conforms to the GeoRecipeBundle schema.
 */
export function validateRecipeBundle(
  data: any
): { isValid: boolean; error?: string; bundle?: GeoRecipeBundle } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid file format: Not a JSON object.' };
  }

  if (data.format !== 'geobridge-bundle') {
    return {
      isValid: false,
      error: 'Unsupported bundle format. Expected "geobridge-bundle".',
    };
  }

  if (!data.recipe || typeof data.recipe !== 'object') {
    return { isValid: false, error: 'Malformed bundle: Missing recipe definition.' };
  }

  if (!data.recipe.title || !data.recipe.id) {
    return { isValid: false, error: 'Malformed recipe: Missing recipe ID or title.' };
  }

  if (!Array.isArray(data.bundledLayers)) {
    return {
      isValid: false,
      error: 'Malformed bundle: Missing bundledLayers array.',
    };
  }

  for (const layer of data.bundledLayers) {
    if (!layer.id || !layer.name || !layer.geojson) {
      return {
        isValid: false,
        error: `Malformed layer "${layer?.name || 'unknown'}": Missing GeoJSON payload.`,
      };
    }
  }

  return { isValid: true, bundle: data as GeoRecipeBundle };
}

/**
 * Parses and validates a JSON string into a GeoRecipeBundle.
 */
export function parseRecipeBundle(jsonContent: string): GeoRecipeBundle {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err: any) {
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }

  const validation = validateRecipeBundle(parsed);
  if (!validation.isValid || !validation.bundle) {
    throw new Error(validation.error || 'Invalid GeoRecipe bundle');
  }

  return validation.bundle;
}

/**
 * Exports a GeoRecipeBundle as a downloadable .georecipe file in the browser.
 */
export function exportRecipeBundleFile(bundle: GeoRecipeBundle, customFilename?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const safeTitle = (customFilename || bundle.recipe.title || 'spatial-recipe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle}.georecipe`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
