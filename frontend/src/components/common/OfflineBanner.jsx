import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import useOffline from '../../hooks/useOffline';

export default function OfflineBanner() {
  const { isOnline, isEmergencyMode, pendingSyncCount, isSyncing, syncStatusMessage, syncPendingSales } = useOffline();

  if (isOnline && !isEmergencyMode && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div className={`px-4 py-2.5 text-sm shadow-inner transition-colors border-b ${
      !isOnline
        ? 'bg-amber-600 text-white border-amber-700'
        : pendingSyncCount > 0
        ? 'bg-blue-600 text-white border-blue-700'
        : 'bg-gray-800 text-white border-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
              <span>Offline Emergency Mode Active</span>
              <span className="text-xs bg-amber-800/60 px-2 py-0.5 rounded-full border border-amber-400/30">
                Fallback Only
              </span>
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Internet Restored — {pendingSyncCount} offline sale(s) pending sync</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
              <span>Emergency Session (Online)</span>
            </>
          )}

          {syncStatusMessage && (
            <span className="hidden md:inline-block text-xs opacity-90 border-l border-white/20 pl-2 ml-2">
              {syncStatusMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pendingSyncCount > 0 && isOnline && (
            <button
              onClick={syncPendingSales}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Pending Sales Now'}
            </button>
          )}

          {!isOnline && (
            <span className="text-xs opacity-90">
              {pendingSyncCount > 0 ? `${pendingSyncCount} sale(s) saved locally` : 'All sales synced'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
