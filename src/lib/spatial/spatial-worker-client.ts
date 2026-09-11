import type { EnrichmentResult } from '../../types/recipe';
import { executeSpatialRecipe, type ExecuteRecipeParams } from './engine';

export async function runSpatialCalculation(
  params: ExecuteRecipeParams
): Promise<EnrichmentResult> {
  // Graceful fallback to direct execution in non-browser or test environments
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return executeSpatialRecipe(params);
  }

  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;

    try {
      worker = new Worker(
        new URL('../../workers/spatial.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent) => {
        const { type, processed, total, result, message } = e.data;

        if (type === 'PROGRESS' && params.onProgress) {
          params.onProgress(processed, total);
        } else if (type === 'SUCCESS') {
          worker?.terminate();
          resolve(result);
        } else if (type === 'ERROR') {
          worker?.terminate();
          reject(new Error(message || 'Worker execution failed'));
        }
      };

      worker.onerror = (err) => {
        console.warn('Web Worker error, falling back to main thread:', err);
        worker?.terminate();
        // Fallback to main thread execution
        executeSpatialRecipe(params).then(resolve).catch(reject);
      };

      // Extract serializable parameters
      const serializableParams = {
        recipe: params.recipe,
        referenceLayer: params.referenceLayer,
        referenceLayers: params.referenceLayers,
        rows: params.rows,
        latColumn: params.latColumn,
        lngColumn: params.lngColumn,
        zipColumn: params.zipColumn,
        fileName: params.fileName,
      };

      worker.postMessage({ type: 'EXECUTE', params: serializableParams });
    } catch (err) {
      console.warn('Could not launch worker, running on main thread:', err);
      if (worker) worker.terminate();
      executeSpatialRecipe(params).then(resolve).catch(reject);
    }
  });
}
