import { executeSpatialRecipe } from '../lib/spatial/engine';

self.onmessage = async (e: MessageEvent) => {
  const { type, params } = e.data;

  if (type === 'EXECUTE') {
    try {
      const result = await executeSpatialRecipe({
        ...params,
        onProgress: (processed, total) => {
          self.postMessage({ type: 'PROGRESS', processed, total });
        },
      });

      self.postMessage({ type: 'SUCCESS', result });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message || 'Spatial calculation failed' });
    }
  }
};
