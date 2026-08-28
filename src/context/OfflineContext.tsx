'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { localDB, SyncItem } from '../utils/db';
import { dbService } from '../utils/supabase';

interface OfflineContextType {
  isOnline: boolean;
  syncQueueLength: number;
  triggerSync: () => Promise<void>;
  queueOfflineAction: (action: SyncItem['action'], payload: any) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncQueueLength, setSyncQueueLength] = useState<number>(0);

  // Initialize online status on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        // Automatically trigger sync when online is restored
        syncData();
      };
      
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check initial queue length
      updateQueueLength();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const updateQueueLength = async () => {
    try {
      const queue = await localDB.getSyncQueue();
      setSyncQueueLength(queue.length);
    } catch (e) {
      console.error('Failed to get sync queue length', e);
    }
  };

  const queueOfflineAction = async (action: SyncItem['action'], payload: any) => {
    const syncItem: SyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      timestamp: Date.now(),
    };
    await localDB.addToSyncQueue(syncItem);
    await updateQueueLength();
  };

  const syncData = async () => {
    if (!navigator.onLine) return;

    try {
      const queue = await localDB.getSyncQueue();
      if (queue.length === 0) return;

      console.log(`Restored connection! Starting sync of ${queue.length} items...`);

      for (const item of queue) {
        try {
          switch (item.action) {
            case 'create_scan':
              // Save to "cloud" validator if accuracy was low and they checked validation
              if (item.payload.validationRequested) {
                await dbService.submitValidationRequest({
                  id: item.payload.id,
                  scan_id: item.payload.id,
                  image: item.payload.image,
                  crop: item.payload.crop,
                  type: item.payload.type,
                  original_diagnosis: item.payload.diagnosis,
                  confidence: item.payload.confidence,
                  farmer_name: item.payload.farmerName || 'Offline Farmer',
                  farmer_location: item.payload.farmerLocation || 'Local Region',
                });
              }
              break;

            case 'request_validation':
              await dbService.submitValidationRequest(item.payload);
              break;

            case 'officer_validation':
              await dbService.updateValidationVerdict(
                item.payload.id,
                item.payload.verdict,
                item.payload.notes
              );
              break;
          }

          // Successfully synced, remove from queue
          await localDB.removeFromSyncQueue(item.id);
        } catch (err) {
          console.error(`Failed to sync item ${item.id}`, err);
          // Stop sync loop if we hit a serious network error
          break;
        }
      }

      await updateQueueLength();
      console.log('Syncing process completed.');
    } catch (e) {
      console.error('Error during data sync', e);
    }
  };

  const triggerSync = async () => {
    await syncData();
  };

  return (
    <OfflineContext.Provider value={{ isOnline, syncQueueLength, triggerSync, queueOfflineAction }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
