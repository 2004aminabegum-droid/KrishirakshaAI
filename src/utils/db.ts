const DB_NAME = 'KrishiRakshakDB';
const DB_VERSION = 2;

export interface ScanRecord {
  id: string;
  image: string; // base64 string
  crop: string;
  type: 'disease' | 'pest';
  diagnosis: string;
  confidence: number;
  symptoms: string;
  remedy: string;
  date: string;
  accuracyStatus: 'high' | 'low';
  validationRequested: boolean;
  expertVerdict?: string | null;
  expertNotes?: string | null;
  farmerName?: string;
  farmerLocation?: string;
}

export interface SyncItem {
  id: string;
  action: 'create_scan' | 'request_validation' | 'officer_validation';
  payload: any;
  timestamp: number;
}

/**
 * Normalizes confidence values into a clean percentage integer (0 - 100).
 * Handles:
 * - Ratios: 0.0 - 1.0 (e.g. 0.72 -> 72)
 * - Standard percentages: 1 - 100 (e.g. 72 -> 72)
 * - Over-multiplied values: > 100 (e.g. 7200 -> 72)
 */
export function formatConfidencePercent(val: number | undefined | null): number {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  let pct = val;
  if (pct > 100) {
    pct = pct / 100;
  } else if (pct <= 1 && pct > 0) {
    pct = pct * 100;
  }
  return Math.max(0, Math.min(100, Math.round(pct)));
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject('IndexedDB is not supported on Server Side');
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create Object Stores if they don't exist
        if (!db.objectStoreNames.contains('scans')) {
          db.createObjectStore('scans', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('weather')) {
          db.createObjectStore('weather', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('prices')) {
          db.createObjectStore('prices', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('rag_kb')) {
          db.createObjectStore('rag_kb', { keyPath: 'id' });
        }
      };
    });
  }

  // --- Scan Record Store ---
  async getScans(): Promise<ScanRecord[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('scans', 'readonly');
      const store = transaction.objectStore('scans');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort scans by date descending (latest first) and normalize confidence
        const rawScans = (request.result as ScanRecord[]) || [];
        const sorted = rawScans.map(scan => ({
          ...scan,
          confidence: formatConfidencePercent(scan.confidence)
        })).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveScan(scan: ScanRecord): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('scans', 'readwrite');
      const store = transaction.objectStore('scans');
      const normalizedScan = {
        ...scan,
        confidence: formatConfidencePercent(scan.confidence)
      };
      const request = store.put(normalizedScan);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScan(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('scans', 'readwrite');
      const store = transaction.objectStore('scans');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Weather Store ---
  async getCachedWeather(): Promise<any | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('weather', 'readonly');
      const store = transaction.objectStore('weather');
      const request = store.get('latest');

      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCachedWeather(data: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('weather', 'readwrite');
      const store = transaction.objectStore('weather');
      const request = store.put({ id: 'latest', data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Agmarknet Prices Store ---
  async getCachedPrices(): Promise<any[] | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('prices', 'readonly');
      const store = transaction.objectStore('prices');
      const request = store.get('latest');

      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCachedPrices(data: any[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('prices', 'readwrite');
      const store = transaction.objectStore('prices');
      const request = store.put({ id: 'latest', data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sync Queue Store ---
  async getSyncQueue(): Promise<SyncItem[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort queue by timestamp ascending (oldest first)
        const sorted = (request.result as SyncItem[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: SyncItem): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- KisanVaani RAG Knowledge Base Store (Offline Persistence) ---
  async getRagKB(): Promise<any[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        if (!db.objectStoreNames.contains('rag_kb')) {
          resolve([]);
          return;
        }
        const transaction = db.transaction('rag_kb', 'readonly');
        const store = transaction.objectStore('rag_kb');
        const request = store.get('kisanvaani_22k_bundle');

        request.onsuccess = () => {
          if (request.result && Array.isArray(request.result.items)) {
            resolve(request.result.items);
          } else {
            resolve([]);
          }
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveRagKB(items: any[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains('rag_kb')) {
          resolve();
          return;
        }
        const transaction = db.transaction('rag_kb', 'readwrite');
        const store = transaction.objectStore('rag_kb');
        const request = store.put({
          id: 'kisanvaani_22k_bundle',
          items,
          total: items.length,
          savedAt: Date.now()
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('[IndexedDB saveRagKB error]:', err);
    }
  }
}

export const localDB = new IndexedDBService();
export default localDB;
