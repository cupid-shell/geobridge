import Dexie, { type Table } from 'dexie';
import type { SpatialRecipe, ReferenceLayer } from '../../types/recipe';
import { PRESET_RECIPES, PRESET_REFERENCE_LAYERS } from '../data/presets';

export interface StoredLayer extends ReferenceLayer {
  isPreset?: boolean;
  updatedAt?: number;
}

export interface StoredRecipe extends SpatialRecipe {
  updatedAt?: number;
}

export class GeoBridgeDatabase extends Dexie {
  recipes!: Table<StoredRecipe, string>;
  layers!: Table<StoredLayer, string>;

  constructor() {
    super('GeoBridgeDB');
    this.version(1).stores({
      recipes: 'id, category, referenceLayerId, isPreset, createdAt',
      layers: 'id, name, geometryType, isPreset, updatedAt',
    });
  }
}

export const db = new GeoBridgeDatabase();

// In-memory fallback for headless test environments without IndexedDB
let inMemoryRecipes: StoredRecipe[] = [...PRESET_RECIPES];
let inMemoryLayers: StoredLayer[] = [...PRESET_REFERENCE_LAYERS];

const isIndexedDBAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
};

export async function initDatabase(): Promise<{ recipes: SpatialRecipe[]; layers: ReferenceLayer[] }> {
  if (!isIndexedDBAvailable()) {
    return { recipes: inMemoryRecipes, layers: inMemoryLayers };
  }

  try {
    // Ensure current preset recipes and layers are seeded/updated without affecting custom user items
    await db.recipes.bulkPut(PRESET_RECIPES.map((r) => ({ ...r, updatedAt: Date.now() })));
    await db.layers.bulkPut(PRESET_REFERENCE_LAYERS.map((l) => ({ ...l, isPreset: true, updatedAt: Date.now() })));

    const recipes = await db.recipes.toArray();
    const layers = await db.layers.toArray();
    return { recipes, layers };
  } catch (error) {
    console.warn('IndexedDB unavailable, using memory fallback:', error);
    return { recipes: inMemoryRecipes, layers: inMemoryLayers };
  }
}

export async function dbSaveRecipe(recipe: SpatialRecipe): Promise<void> {
  if (!isIndexedDBAvailable()) {
    inMemoryRecipes = [recipe, ...inMemoryRecipes.filter((r) => r.id !== recipe.id)];
    return;
  }
  await db.recipes.put({ ...recipe, updatedAt: Date.now() });
}

export async function dbDeleteRecipe(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    inMemoryRecipes = inMemoryRecipes.filter((r) => r.id !== id);
    return;
  }
  await db.recipes.delete(id);
}

export async function dbSaveLayer(layer: ReferenceLayer): Promise<void> {
  if (!isIndexedDBAvailable()) {
    inMemoryLayers = [layer, ...inMemoryLayers.filter((l) => l.id !== layer.id)];
    return;
  }
  await db.layers.put({ ...layer, updatedAt: Date.now() });
}

export async function dbDeleteLayer(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    inMemoryLayers = inMemoryLayers.filter((l) => l.id !== id);
    return;
  }
  await db.layers.delete(id);
}

export async function dbResetToDefaults(): Promise<{ recipes: SpatialRecipe[]; layers: ReferenceLayer[] }> {
  if (!isIndexedDBAvailable()) {
    inMemoryRecipes = [...PRESET_RECIPES];
    inMemoryLayers = [...PRESET_REFERENCE_LAYERS];
    return { recipes: inMemoryRecipes, layers: inMemoryLayers };
  }

  await db.recipes.clear();
  await db.layers.clear();
  await db.recipes.bulkPut(PRESET_RECIPES.map((r) => ({ ...r, updatedAt: Date.now() })));
  await db.layers.bulkPut(PRESET_REFERENCE_LAYERS.map((l) => ({ ...l, isPreset: true, updatedAt: Date.now() })));

  return { recipes: PRESET_RECIPES, layers: PRESET_REFERENCE_LAYERS };
}
