import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { getPosProducts } from '../api/posApi';
import {
  getDeviceConfig,
  saveDeviceConfig,
  generateSalt,
  hashPin,
  cacheProducts,
  getOfflineSales,
  updateOfflineSaleStatus,
  getPendingOfflineSalesCount,
} from '../utils/idb';
import { logger } from '../utils/logger';

export const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [offlineUser, setOfflineUser] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [deviceConfig, setDeviceConfig] = useState(null);

  // Load device config and pending sync count on mount
  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await getDeviceConfig();
      setDeviceConfig(cfg);
      const pendingCount = await getPendingOfflineSalesCount();
      setPendingSyncCount(pendingCount);

      // Restore active offline session if present and valid
      const sessionStr = sessionStorage.getItem('mh_offline_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (new Date(session.expiry_date) > new Date()) {
          setOfflineUser(session.user);
          setIsEmergencyMode(true);
        } else {
          sessionStorage.removeItem('mh_offline_session');
        }
      }
    } catch (err) {
      logger.error('Failed to load offline config from IndexedDB', err);
    }
  }, []);

  // Health check to determine real online connectivity
  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    try {
      const response = await apiClient.get('/health', { silent: true, timeout: 5000 });
      const onlineState = response.data?.success === true || response.status === 200;
      setIsOnline(onlineState);
      return onlineState;
    } catch (err) {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Refresh Product Cache from Server (when online)
  const refreshProductCache = useCallback(async () => {
    try {
      const resData = await getPosProducts({ limit: 10000 });
      const productsList = Array.isArray(resData) ? resData : (resData?.products || []);
      if (Array.isArray(productsList) && productsList.length > 0) {
        await cacheProducts(productsList, true);
        return { success: true, count: productsList.length };
      }
    } catch (err) {
      logger.error('Failed to refresh offline product cache', err);
      return { success: false, error: err.message };
    }
    return { success: false, message: 'No products returned' };
  }, []);

  // Automatic Sync Workflow
  const syncPendingSales = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMessage('Connecting to server...');

    try {
      const isReachable = await checkConnectivity();
      if (!isReachable) {
        setSyncStatusMessage('Server is unreachable.');
        setIsSyncing(false);
        return { success: false, message: 'Server is unreachable.' };
      }

      const pendingSales = await getOfflineSales('pending');
      const failedSales = await getOfflineSales('failed');
      const salesToSync = [...pendingSales, ...failedSales];

      if (salesToSync.length === 0) {
        setSyncStatusMessage('No pending sales to sync.');
        setIsSyncing(false);
        return { success: true, synced: 0 };
      }

      setSyncStatusMessage(`Syncing ${salesToSync.length} offline sales...`);

      // Format payload for backend batch sync endpoint
      const payloadSales = salesToSync.map((s) => ({
        offline_sale_id: s.offline_sale_id,
        request_token: s.request_token || ('off_' + s.offline_sale_id),
        items: s.items.map((i) => ({
          product_id: Number(i.product_id),
          unit_id: i.unit_id ? Number(i.unit_id) : null,
          quantity: parseFloat(i.quantity),
        })),
        discount_type: s.discount_type || 'none',
        discount_value: s.discount_value || 0,
        amount_received: s.amount_received || s.grand_total,
        payment_method: 'cash',
        customer_name: s.customer_name || null,
        customer_phone: s.customer_phone || null,
        notes: s.notes ? `[Offline Sale] ${s.notes}` : '[Offline Sale]',
      }));

      const response = await apiClient.post('/sales/sync-offline', { sales: payloadSales });

      if (response.data?.success && Array.isArray(response.data.data?.results)) {
        let syncedCount = 0;
        let conflictCount = 0;

        for (const res of response.data.data.results) {
          if (res.success) {
            await updateOfflineSaleStatus(res.offline_sale_id, {
              sync_status: 'synced',
              server_sale_id: res.server_sale_id,
              server_invoice_number: res.invoice_number,
              synced_at: new Date().toISOString(),
              sync_attempts: (s => (s?.sync_attempts || 0) + 1),
            });
            syncedCount++;
          } else {
            const status = res.status === 'conflict' ? 'conflict' : 'failed';
            await updateOfflineSaleStatus(res.offline_sale_id, {
              sync_status: status,
              last_error: res.error || 'Sync failed',
              sync_attempts: (s => (s?.sync_attempts || 0) + 1),
            });
            if (status === 'conflict') conflictCount++;
          }
        }

        const remainingPending = await getPendingOfflineSalesCount();
        setPendingSyncCount(remainingPending);
        setLastSyncTime(new Date().toISOString());

        // Refresh product cache after sync to align online stock
        await refreshProductCache();

        setSyncStatusMessage(`Sync completed: ${syncedCount} synced, ${conflictCount} conflicts.`);
        setIsSyncing(false);
        return { success: true, synced: syncedCount, conflicts: conflictCount };
      }
    } catch (err) {
      setSyncStatusMessage(`Sync failed: ${err.message}`);
      logger.error('Error during offline sales sync', err);
    } finally {
      setIsSyncing(false);
      refreshConfig();
    }

    return { success: false, message: 'Sync process encountered an error.' };
  }, [isSyncing, checkConnectivity, refreshProductCache, refreshConfig]);

  // Setup / Enable Offline Emergency Mode (Admin function)
  const enableEmergencyMode = async (pin, adminUser, expiryDays = 7) => {
    if (!pin || pin.length < 6 || pin.length > 8 || !/^\d+$/.test(pin)) {
      return { success: false, message: 'PIN must be 6 to 8 digits.' };
    }

    const salt = await generateSalt();
    const pinHash = await hashPin(pin, salt);
    const deviceId = deviceConfig?.device_id || ('dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const now = new Date();
    const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const configVal = {
      device_id: deviceId,
      device_name: navigator.userAgent.includes('Windows') ? 'Windows POS Terminal' : 'POS Terminal',
      is_enabled: true,
      expiry_days: expiryDays,
      admin_user: {
        id: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
        permissions: ['dashboard.view', 'pos.access', 'sales.view', 'sales.reprint', 'sales.complete'],
      },
      pin_hash: pinHash,
      pin_salt: salt,
      last_verified: now.toISOString(),
      expiry_date: expiryDate,
      failed_attempts: 0,
      lockout_until: null,
    };

    await saveDeviceConfig(configVal);
    await refreshConfig();

    // Cache products immediately
    await refreshProductCache();

    return { success: true, message: 'Offline Emergency Mode configured successfully for this device.' };
  };

  // Login via Offline PIN
  const loginWithOfflinePin = async (pin) => {
    const cfg = await getDeviceConfig();
    if (!cfg || !cfg.is_enabled) {
      return { success: false, message: 'Offline Emergency Access is not configured on this device.' };
    }

    // Check Lockout
    if (cfg.lockout_until && new Date(cfg.lockout_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(cfg.lockout_until) - new Date()) / 60000);
      return { success: false, message: `Account locked due to incorrect attempts. Try again in ${minutesLeft} minute(s).` };
    }

    // Check 7-day Expiry
    if (new Date(cfg.expiry_date) <= new Date()) {
      return { success: false, message: 'Offline emergency access has expired. Please log in online to renew access.' };
    }

    // Verify PIN Hash
    const inputHash = await hashPin(pin, cfg.pin_salt);
    if (inputHash !== cfg.pin_hash) {
      const failedCount = (cfg.failed_attempts || 0) + 1;
      let lockoutTime = null;

      if (failedCount >= 5) {
        lockoutTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min lockout
      }

      await saveDeviceConfig({
        ...cfg,
        failed_attempts: failedCount,
        lockout_until: lockoutTime,
      });

      if (lockoutTime) {
        return { success: false, message: 'Too many incorrect attempts. Offline login locked for 5 minutes.' };
      }

      return { success: false, message: `Incorrect PIN. ${5 - failedCount} attempts remaining.` };
    }

    // Reset failed attempts on successful PIN
    await saveDeviceConfig({
      ...cfg,
      failed_attempts: 0,
      lockout_until: null,
    });

    const userObj = cfg.admin_user;
    setOfflineUser(userObj);
    setIsEmergencyMode(true);

    sessionStorage.setItem(
      'mh_offline_session',
      JSON.stringify({
        user: userObj,
        expiry_date: cfg.expiry_date,
      })
    );

    return { success: true, user: userObj };
  };

  const logoutOffline = () => {
    setOfflineUser(null);
    setIsEmergencyMode(false);
    sessionStorage.removeItem('mh_offline_session');
  };

  // Event listener for online/offline events
  useEffect(() => {
    refreshConfig();
    checkConnectivity();

    const handleOnline = () => {
      checkConnectivity().then((online) => {
        if (online) {
          syncPendingSales();
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity ping & sync check every 30s when online
    const interval = setInterval(() => {
      checkConnectivity().then((online) => {
        if (online && pendingSyncCount > 0 && !isSyncing) {
          syncPendingSales();
        }
      });
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshConfig, checkConnectivity, syncPendingSales, pendingSyncCount, isSyncing]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isEmergencyMode,
        offlineUser,
        deviceConfig,
        pendingSyncCount,
        isSyncing,
        syncStatusMessage,
        lastSyncTime,
        enableEmergencyMode,
        loginWithOfflinePin,
        logoutOffline,
        syncPendingSales,
        refreshProductCache,
        refreshConfig,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
