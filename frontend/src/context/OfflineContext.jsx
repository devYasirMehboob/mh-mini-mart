import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/apiClient';
import { getPosProducts, getPosCategories } from '../api/posApi';
import { getCustomers } from '../api/customersApi';
import {
  getDeviceConfig,
  saveDeviceConfig,
  generateSalt,
  hashPin,
  cacheProducts,
  cacheCategories,
  cacheCustomers,
  getOfflineSales,
  updateOfflineSaleStatus,
  getPendingOfflineSalesCount,
} from '../utils/idb';
import { logger } from '../utils/logger';
import useAuth from '../hooks/useAuth';

export const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [offlineUser, setOfflineUser] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lastCacheTime, setLastCacheTime] = useState(null);
  const [deviceConfig, setDeviceConfig] = useState(null);
  const isCachingRef = useRef(false);
  const lastCacheTimestampRef = useRef(0);

  // Load device config and pending sync count on mount
  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await getDeviceConfig();
      setDeviceConfig(cfg);
      if (cfg?.last_cached_at) {
        setLastCacheTime(cfg.last_cached_at);
      }
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

  // Refresh Product, Category, and Customer Cache from Server (when online and authenticated)
  const refreshProductCache = useCallback(async () => {
    if (!user) return { success: false, message: 'User not authenticated' };
    if (isCachingRef.current) return { success: false, message: 'Already caching' };
    isCachingRef.current = true;
    try {
      const [resData, catData, custData] = await Promise.allSettled([
        getPosProducts({ limit: 10000 }, null, { silent: true }),
        getPosCategories({ silent: true }),
        getCustomers({ limit: 1000, status: 'active' }, { silent: true }),
      ]);

      let prodCount = 0;
      if (resData.status === 'fulfilled') {
        const val = resData.value;
        const productsList = Array.isArray(val) ? val : (val?.products || []);
        if (Array.isArray(productsList) && productsList.length > 0) {
          await cacheProducts(productsList, true);
          prodCount = productsList.length;
        }
      }

      if (catData.status === 'fulfilled' && Array.isArray(catData.value)) {
        await cacheCategories(catData.value, true);
      }

      if (custData.status === 'fulfilled' && custData.value?.data?.customers) {
        await cacheCustomers(custData.value.data.customers, true);
      }

      const nowIso = new Date().toISOString();
      setLastCacheTime(nowIso);
      lastCacheTimestampRef.current = Date.now();

      // Persist last_cached_at in deviceConfig
      getDeviceConfig().then((cfg) => {
        if (cfg) {
          saveDeviceConfig({ ...cfg, last_cached_at: nowIso }).catch(() => undefined);
        }
      }).catch(() => undefined);

      return { success: true, count: prodCount, timestamp: nowIso };
    } catch (err) {
      logger.error('Failed to refresh offline product and data cache', err);
      return { success: false, error: err.message };
    } finally {
      isCachingRef.current = false;
    }
  }, [user]);

  // Automatic Sync Workflow
  const syncPendingSales = useCallback(async () => {
    if (!user) return { success: false, message: 'User not authenticated' };
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMessage('Connecting to server...');

    try {
      const isReachable = await checkConnectivity();
      if (!isReachable) {
        setSyncStatusMessage('Server is unreachable.');
        setIsSyncing(false);
        return { success: false, message: 'Server unreachable.' };
      }

      const pendingSales = await getOfflineSales('pending');
      const conflictSales = await getOfflineSales('conflict');
      const salesToSync = [...pendingSales, ...conflictSales];

      if (salesToSync.length === 0) {
        setSyncStatusMessage('All sales are synced.');
        setIsSyncing(false);
        setPendingSyncCount(0);
        return { success: true, count: 0 };
      }

      setSyncStatusMessage(`Syncing ${salesToSync.length} offline sale(s)...`);

      const payloadSales = salesToSync.map((s) => ({
        offline_sale_id: s.offline_sale_id,
        request_token: s.request_token || ('off_' + s.offline_sale_id),
        created_at: s.created_at || null,
        items: s.items.map((i) => ({
          product_id: Number(i.product_id),
          unit_id: i.unit_id ? Number(i.unit_id) : null,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
        subtotal: s.subtotal,
        discount_type: s.discount_type || 'none',
        discount_value: s.discount_value || 0,
        amount_received: s.amount_received || s.grand_total,
        payment_method: s.payment_method || 'cash',
        customer_id: s.customer_id ? Number(s.customer_id) : null,
        customer_name: s.customer_name || null,
        customer_phone: s.customer_phone || null,
        notes: s.notes
          ? (String(s.notes).includes('[Offline Sale]') ? s.notes : `[Offline Sale] ${s.notes}`)
          : '[Offline Sale]',
      }));

      const response = await apiClient.post('/sales/sync-offline', { sales: payloadSales });

      if (response.data && response.data.success) {
        const results = response.data.data?.results || [];

        for (const res of results) {
          if (res.status === 'synced') {
            await updateOfflineSaleStatus(res.offline_sale_id, 'synced', null, res.sale_id);
          } else if (res.status === 'conflict') {
            await updateOfflineSaleStatus(res.offline_sale_id, 'conflict', res.error);
          }
        }

        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString());
        setSyncStatusMessage(`Successfully synced ${response.data.data?.synced_count || 0} sale(s).`);

        // Refresh product inventory cache after stock deduction
        refreshProductCache();
        await refreshConfig();

        setIsSyncing(false);
        return { success: true, count: response.data.data?.synced_count || 0 };
      }
    } catch (err) {
      logger.error('Offline sales sync error', err);
      setSyncStatusMessage('Sync failed. Will retry automatically.');
    } finally {
      setIsSyncing(false);
    }

    return { success: false, message: 'Sync process encountered an error.' };
  }, [user, isSyncing, checkConnectivity, refreshProductCache, refreshConfig]);

  // Setup / Enable Offline Emergency Mode (Admin function)
  const enableEmergencyMode = async (pin, adminUser, expiryDays = 30) => {
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
      has_custom_pin: true,
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

    // Check Expiry
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

  // 1-Click login with cached user for seamless offline recovery
  const loginWithCachedUser = async () => {
    let userToRestore = null;
    try {
      const cachedStr = localStorage.getItem('mh_cached_user');
      if (cachedStr) {
        userToRestore = JSON.parse(cachedStr);
      }
    } catch (_) {}

    if (!userToRestore) {
      const cfg = await getDeviceConfig();
      if (cfg?.admin_user) {
        userToRestore = cfg.admin_user;
      }
    }

    if (!userToRestore) {
      return { success: false, message: 'No offline session found. Please log in online once first.' };
    }

    setOfflineUser(userToRestore);
    setIsEmergencyMode(true);

    sessionStorage.setItem(
      'mh_offline_session',
      JSON.stringify({
        user: userToRestore,
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    );

    return { success: true, user: userToRestore };
  };

  const logoutOffline = () => {
    setOfflineUser(null);
    setIsEmergencyMode(false);
    sessionStorage.removeItem('mh_offline_session');
  };

  // Always load device config on mount
  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  // Auto-provision offline readiness when user is online & logged in
  useEffect(() => {
    if (!user) return;

    getDeviceConfig().then(async (cfg) => {
      if (!cfg || !cfg.is_enabled) {
        try {
          const salt = await generateSalt();
          const defaultPinHash = await hashPin('123456', salt);
          const deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          const now = new Date();
          const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const autoConfig = {
            device_id: deviceId,
            device_name: navigator.userAgent.includes('Windows') ? 'Windows POS Terminal' : 'POS Terminal',
            is_enabled: true,
            expiry_days: 30,
            admin_user: {
              id: user.id,
              name: user.name,
              role: user.role,
              permissions: user.permissions || ['dashboard.view', 'pos.access', 'sales.view', 'sales.reprint', 'sales.complete'],
            },
            pin_hash: defaultPinHash,
            pin_salt: salt,
            last_verified: now.toISOString(),
            expiry_date: expiryDate,
            failed_attempts: 0,
            lockout_until: null,
            has_custom_pin: false,
          };
          await saveDeviceConfig(autoConfig);
          setDeviceConfig(autoConfig);
        } catch (e) {
          logger.warn('Could not auto-provision device config', e);
        }
      }
    }).catch(() => undefined);
  }, [user]);

  // When user is authenticated and online, trigger background caching and sync
  useEffect(() => {
    if (!user) return;

    checkConnectivity().then((online) => {
      if (online) {
        refreshProductCache();
        syncPendingSales();
      }
    });
  }, [user, checkConnectivity, refreshProductCache, syncPendingSales]);

  // Network online/offline listener & periodic sync (only when user is authenticated)
  useEffect(() => {
    if (!user) return;

    const handleOnline = () => {
      checkConnectivity().then((online) => {
        if (online && user) {
          refreshProductCache();
          syncPendingSales();
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity ping, auto-sync, and auto-cache every 3 minutes when online and logged in
    const interval = setInterval(() => {
      checkConnectivity().then((online) => {
        if (online && user) {
          if (pendingSyncCount > 0 && !isSyncing) {
            syncPendingSales();
          }

          // Auto background cache refresh every 3 minutes if online and logged in
          const now = Date.now();
          if (now - lastCacheTimestampRef.current > 3 * 60 * 1000) {
            refreshProductCache();
          }
        }
      });
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [user, checkConnectivity, syncPendingSales, refreshProductCache, pendingSyncCount, isSyncing]);

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
        lastCacheTime,
        enableEmergencyMode,
        loginWithOfflinePin,
        loginWithCachedUser,
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

export default OfflineContext;
