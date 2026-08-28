/**
 * Client-Side Model Manager & IndexedDB Cache
 * KrishiRakshak AI Hybrid Engine (Phase 9 & DLCPD-25)
 */

const MODEL_DB_NAME = 'KrishiRakshak_ModelCache';
const MODEL_STORE = 'onnx_models';

interface CachedModelRecord {
  version: string;
  modelKey: 'disease' | 'pest';
  modelPath: string;
  blob: Blob;
  updatedAt: string;
}

function openModelDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('IndexedDB unavailable');
    }
    const request = indexedDB.open(MODEL_DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MODEL_STORE)) {
        db.createObjectStore(MODEL_STORE, { keyPath: 'version' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Checks server for latest model versions (both disease and DLCPD-25 pest models)
 * and updates local IndexedDB cache when online.
 */
export async function checkAndUpdateOfflineModels(): Promise<{ diseaseUrl: string; pestUrl: string }> {
  const defaults = { diseaseUrl: '/model.onnx', pestUrl: '/pest-model.onnx' };
  if (typeof window === 'undefined' || !navigator.onLine) {
    return defaults;
  }

  try {
    const res = await fetch('/api/v1/models/latest');
    if (!res.ok) return defaults;

    const data = await res.json();
    const db = await openModelDB();

    const modelsToSync: Array<{ key: 'disease' | 'pest'; version?: string; url?: string }> = [
      { key: 'disease', version: data?.offline_model?.version, url: data?.offline_model?.download_url || '/model.onnx' },
      { key: 'pest', version: data?.pest_model?.version, url: data?.pest_model?.download_url || '/pest-model.onnx' }
    ];

    for (const item of modelsToSync) {
      if (!item.version || !item.url) continue;
      const tx = db.transaction(MODEL_STORE, 'readwrite');
      const store = tx.objectStore(MODEL_STORE);
      const getReq = store.get(item.version);

      getReq.onsuccess = async () => {
        if (!getReq.result && item.url && item.version) {
          console.log(`[ModelManager] Downloading updated ${item.key} ONNX model (${item.version})...`);
          try {
            const modelRes = await fetch(item.url);
            if (modelRes.ok) {
              const blob = await modelRes.blob();
              const writeTx = db.transaction(MODEL_STORE, 'readwrite');
              writeTx.objectStore(MODEL_STORE).put({
                version: item.version,
                modelKey: item.key,
                modelPath: item.url,
                blob,
                updatedAt: new Date().toISOString()
              } as CachedModelRecord);
              console.log(`[ModelManager] Successfully cached ${item.key} ONNX model (${item.version}) in IndexedDB.`);
            }
          } catch (fetchErr) {
            console.warn(`[ModelManager] Could not download ${item.key} model:`, fetchErr);
          }
        }
      };
    }

    return {
      diseaseUrl: data?.offline_model?.download_url || '/model.onnx',
      pestUrl: data?.pest_model?.download_url || '/pest-model.onnx'
    };
  } catch (err) {
    console.warn('[ModelManager] Model update check skipped:', err);
    return defaults;
  }
}

export async function checkAndUpdateOfflineModel(): Promise<string> {
  const res = await checkAndUpdateOfflineModels();
  return res.diseaseUrl;
}

