import { create } from 'zustand';
import type { EnrichmentResult, ReferenceLayer, SpatialRecipe } from '../types/recipe';
import { PRESET_RECIPES, PRESET_REFERENCE_LAYERS } from '../lib/data/presets';
import {
  initDatabase,
  dbSaveRecipe,
  dbDeleteRecipe,
  dbSaveLayer,
  dbDeleteLayer,
  dbResetToDefaults,
} from '../lib/db/database';

interface GeoBridgeState {
  appMode: 'consumer' | 'studio' | 'docs';
  isHydrated: boolean;
  recipes: SpatialRecipe[];
  referenceLayers: ReferenceLayer[];
  selectedRecipeId: string;
  lastResult: EnrichmentResult | null;

  setAppMode: (mode: 'consumer' | 'studio' | 'docs') => void;
  setSelectedRecipeId: (id: string) => void;
  setLastResult: (result: EnrichmentResult | null) => void;

  hydrateFromStorage: () => Promise<void>;
  addRecipe: (recipe: SpatialRecipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addReferenceLayer: (layer: ReferenceLayer) => Promise<void>;
  deleteReferenceLayer: (id: string) => Promise<void>;
  importBundle: (bundle: import('../types/recipe').GeoRecipeBundle) => Promise<{ recipeId: string; layersImported: number }>;
  resetToDefaults: () => Promise<void>;
}

export const useGeoBridgeStore = create<GeoBridgeState>((set, get) => {
  // Initialize with fast in-memory presets for immediate render
  return {
    appMode: 'consumer',
    isHydrated: false,
    recipes: PRESET_RECIPES,
    referenceLayers: PRESET_REFERENCE_LAYERS,
    selectedRecipeId: PRESET_RECIPES[0].id,
    lastResult: null,

    setAppMode: (mode) => set({ appMode: mode }),
    setSelectedRecipeId: (id) => set({ selectedRecipeId: id }),
    setLastResult: (result) => set({ lastResult: result }),

    hydrateFromStorage: async () => {
      try {
        const { recipes, layers } = await initDatabase();
        set({
          recipes,
          referenceLayers: layers,
          isHydrated: true,
          selectedRecipeId: recipes[0]?.id || PRESET_RECIPES[0].id,
        });
      } catch (err) {
        console.warn('Failed to hydrate from IndexedDB, using presets', err);
        set({ isHydrated: true });
      }
    },

    addRecipe: async (recipe) => {
      const updated = [recipe, ...get().recipes.filter((r) => r.id !== recipe.id)];
      set({ recipes: updated, selectedRecipeId: recipe.id, appMode: 'consumer' });
      await dbSaveRecipe(recipe);
    },

    deleteRecipe: async (id) => {
      const updated = get().recipes.filter((r) => r.id !== id);
      set({
        recipes: updated,
        selectedRecipeId: updated[0]?.id || '',
      });
      await dbDeleteRecipe(id);
    },

    addReferenceLayer: async (layer) => {
      const updated = [layer, ...get().referenceLayers.filter((l) => l.id !== layer.id)];
      set({ referenceLayers: updated });
      await dbSaveLayer(layer);
    },

    deleteReferenceLayer: async (id) => {
      const updated = get().referenceLayers.filter((l) => l.id !== id);
      set({ referenceLayers: updated });
      await dbDeleteLayer(id);
    },

    importBundle: async (bundle) => {
      for (const layer of bundle.bundledLayers) {
        await dbSaveLayer(layer);
      }
      const existingLayerIds = new Set(bundle.bundledLayers.map((l) => l.id));
      const mergedLayers = [
        ...bundle.bundledLayers,
        ...get().referenceLayers.filter((l) => !existingLayerIds.has(l.id)),
      ];

      await dbSaveRecipe(bundle.recipe);
      const mergedRecipes = [
        bundle.recipe,
        ...get().recipes.filter((r) => r.id !== bundle.recipe.id),
      ];

      set({
        referenceLayers: mergedLayers,
        recipes: mergedRecipes,
        selectedRecipeId: bundle.recipe.id,
      });

      return {
        recipeId: bundle.recipe.id,
        layersImported: bundle.bundledLayers.length,
      };
    },

    resetToDefaults: async () => {
      const { recipes, layers } = await dbResetToDefaults();
      set({
        recipes,
        referenceLayers: layers,
        selectedRecipeId: recipes[0]?.id || '',
        lastResult: null,
      });
    },
  };
});
