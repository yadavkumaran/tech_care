import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getApiBaseUrl } from '../api/client';

export interface SyncPayload {
  entity: string; // 'TICKET' | 'INVOICE' | 'PAYMENT' | 'INVENTORY' | 'CUSTOMER' | 'DEVICE' | 'PURCHASE' | 'ALL'
  action: string;
  id?: number;
  reference?: string;
  actorUsername?: string;
  timestamp?: string;
}

type SyncCallback = (payload: SyncPayload) => void;

interface SyncContextType {
  broadcastLocalUpdate: (entity: string, action?: string, reference?: string) => void;
  subscribe: (entities: string[], callback: SyncCallback) => () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const listenersRef = useRef<Map<string, Set<SyncCallback>>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Notify registered callbacks
  const notifyListeners = (payload: SyncPayload) => {
    const { entity } = payload;
    // Notify entity-specific listeners
    const entityListeners = listenersRef.current.get(entity);
    if (entityListeners) {
      entityListeners.forEach((cb) => cb(payload));
    }
    // Notify global 'ALL' listeners
    const allListeners = listenersRef.current.get('ALL');
    if (allListeners) {
      allListeners.forEach((cb) => cb(payload));
    }
  };

  // Local BroadcastChannel for instant inter-tab sync
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('techcare_sync_channel');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (event.data && event.data.entity) {
            notifyListeners(event.data);
          }
        };

        return () => {
          channel.close();
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment');
    }
  }, []);

  // Window Focus & Visibility Change Handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        notifyListeners({
          entity: 'ALL',
          action: 'WINDOW_FOCUS_RESUME',
          timestamp: new Date().toISOString(),
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Server-Sent Events (SSE) stream connection
  useEffect(() => {
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const streamUrl = `${getApiBaseUrl()}/sync/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('SYNC_EVENT', (e: MessageEvent) => {
          try {
            const data: SyncPayload = JSON.parse(e.data);
            notifyListeners(data);
          } catch (err) {
            console.error('Failed to parse real-time sync event:', err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential backoff reconnect
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token]);

  // Method to broadcast a change locally + to other browser tabs
  const broadcastLocalUpdate = (entity: string, action = 'UPDATED', reference?: string) => {
    const payload: SyncPayload = {
      entity,
      action,
      reference,
      actorUsername: user?.username,
      timestamp: new Date().toISOString(),
    };

    // Notify listeners in current tab
    notifyListeners(payload);

    // Broadcast to other open tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(payload);
      } catch (e) {
        // ignore channel errors
      }
    }
  };

  const subscribe = (entities: string[], callback: SyncCallback) => {
    entities.forEach((entity) => {
      if (!listenersRef.current.has(entity)) {
        listenersRef.current.set(entity, new Set());
      }
      listenersRef.current.get(entity)!.add(callback);
    });

    return () => {
      entities.forEach((entity) => {
        const set = listenersRef.current.get(entity);
        if (set) {
          set.delete(callback);
          if (set.size === 0) listenersRef.current.delete(entity);
        }
      });
    };
  };

  return (
    <SyncContext.Provider value={{ broadcastLocalUpdate, subscribe }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

/**
 * Hook to automatically invoke a callback when specified entities are updated
 * (via SSE, cross-tab broadcast, or window focus)
 */
export const useRealtimeSync = (
  entities: string[],
  onSync: () => void,
  intervalSeconds = 25
) => {
  const { subscribe } = useSync();
  const callbackRef = useRef(onSync);
  callbackRef.current = onSync;

  useEffect(() => {
    const unsubscribe = subscribe(entities, () => {
      callbackRef.current();
    });

    // Optional gentle polling interval while tab is active
    let intervalId: any = null;
    if (intervalSeconds > 0) {
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          callbackRef.current();
        }
      }, intervalSeconds * 1000);
    }

    return () => {
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [entities.join(','), intervalSeconds, subscribe]);
};
