import { create } from 'zustand';
import type { EnrichmentResult, ReferenceLayer, SpatialRecipe } from '../types/recipe';
import { PRESET_RECIPES, PRESET_REFERENCE_LAYERS } from '../lib/data/presets';

interface GeoBridgeState {
  appMode: 'consumer' | 'studio' | 'docs';
  recipes: SpatialRecipe[];
  referenceLayers: ReferenceLayer[];
  selectedRecipeId: string;
  lastResult: EnrichmentResult | null;

  setAppMode: (mode: 'consumer' | 'studio' | 'docs') => void;
  setSelectedRecipeId: (id: string) => void;
  setLastResult: (result: EnrichmentResult | null) => void;

  addRecipe: (recipe: SpatialRecipe) => void;
  deleteRecipe: (id: string) => void;
  addReferenceLayer: (layer: ReferenceLayer) => void;
  deleteReferenceLayer: (id: string) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY_RECIPES = 'geobridge_custom_recipes';
const STORAGE_KEY_LAYERS = 'geobridge_custom_layers';

function getStoredCustomRecipes(): SpatialRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECIPES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getStoredCustomLayers(): ReferenceLayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAYERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useGeoBridgeStore = create<GeoBridgeState>((set, get) => {
  const customRecipes = getStoredCustomRecipes();
  const customLayers = getStoredCustomLayers();

  const allRecipes = [...PRESET_RECIPES, ...customRecipes];
  const allLayers = [...PRESET_REFERENCE_LAYERS, ...customLayers];

  return {
    appMode: 'consumer',
    recipes: allRecipes,
    referenceLayers: allLayers,
    selectedRecipeId: PRESET_RECIPES[0].id,
    lastResult: null,

    setAppMode: (mode) => set({ appMode: mode }),
    setSelectedRecipeId: (id) => set({ selectedRecipeId: id }),
    setLastResult: (result) => set({ lastResult: result }),

    addRecipe: (recipe) => {
      const updated = [recipe, ...get().recipes];
      const customOnly = updated.filter((r) => !r.isPreset);
      try {
        localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(customOnly));
      } catch (err) {
        console.warn('Failed to save recipe to localStorage', err);
      }
      set({ recipes: updated, selectedRecipeId: recipe.id, appMode: 'consumer' });
    },

    deleteRecipe: (id) => {
      const updated = get().recipes.filter((r) => r.id !== id);
      const customOnly = updated.filter((r) => !r.isPreset);
      try {
        localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(customOnly));
      } catch (err) {
        console.warn('Failed to update localStorage', err);
      }
      set({
        recipes: updated,
        selectedRecipeId: updated[0]?.id || '',
      });
    },

    addReferenceLayer: (layer) => {
      const updated = [layer, ...get().referenceLayers];
      try {
        const customOnly = updated.filter((l) => !PRESET_REFERENCE_LAYERS.some((p) => p.id === l.id));
        localStorage.setItem(STORAGE_KEY_LAYERS, JSON.stringify(customOnly));
      } catch (err) {
        console.warn('Failed to save layer to localStorage', err);
      }
      set({ referenceLayers: updated });
    },

    deleteReferenceLayer: (id) => {
      const updated = get().referenceLayers.filter((l) => l.id !== id);
      try {
        const customOnly = updated.filter((l) => !PRESET_REFERENCE_LAYERS.some((p) => p.id === l.id));
        localStorage.setItem(STORAGE_KEY_LAYERS, JSON.stringify(customOnly));
      } catch (err) {
        console.warn('Failed to update layer in localStorage', err);
      }
      set({ referenceLayers: updated });
    },

    resetToDefaults: () => {
      try {
        localStorage.removeItem(STORAGE_KEY_RECIPES);
        localStorage.removeItem(STORAGE_KEY_LAYERS);
      } catch {}
      set({
        recipes: PRESET_RECIPES,
        referenceLayers: PRESET_REFERENCE_LAYERS,
        selectedRecipeId: PRESET_RECIPES[0].id,
        lastResult: null,
      });
    },
  };
});
