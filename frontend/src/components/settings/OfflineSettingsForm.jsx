import React, { useState } from "react";
import { HardDrive, ShieldCheck, Key, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import useOffline from "../../hooks/useOffline";
import useAuth from "../../hooks/useAuth";
import useAlert from "../../hooks/useAlert";

export default function OfflineSettingsForm() {
  const { user } = useAuth();
  const alert = useAlert();
  const { deviceConfig, enableEmergencyMode, refreshProductCache, isSyncing, syncStatusMessage } = useOffline();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  const [isCaching, setIsCaching] = useState(false);

  const handleSetup = async (e) => {
    e.preventDefault();

    if (!pin || pin.length < 6 || pin.length > 8 || !/^\d+$/.test(pin)) {
      alert.error("PIN must be 6 to 8 numeric digits.");
      return;
    }

    if (pin !== confirmPin) {
      alert.error("PIN and Confirm PIN do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await enableEmergencyMode(pin, user, Number(expiryDays));
      if (res.success) {
        alert.success(res.message);
        setPin("");
        setConfirmPin("");
      } else {
        alert.error(res.message);
      }
    } catch (err) {
      alert.error("Failed to configure offline mode: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCacheProductsNow = async () => {
    setIsCaching(true);
    try {
      const res = await refreshProductCache();
      if (res.success) {
        alert.success(`Successfully cached ${res.count} products for offline scan!`);
      } else {
        alert.error("Product cache failed: " + (res.error || res.message));
      }
    } catch (err) {
      alert.error("Cache process failed: " + err.message);
    } finally {
      setIsCaching(false);
    }
  };

  const isConfigured = deviceConfig && deviceConfig.is_enabled;
  const isExpired = deviceConfig?.expiry_date && new Date(deviceConfig.expiry_date) <= new Date();

  return (
    <div className="space-y-6">
      {/* Current Device Status Card */}
      <div className={`rounded-2xl border p-6 shadow-sm ${
        isConfigured && !isExpired
          ? "border-emerald-200 bg-emerald-50/70"
          : isExpired
          ? "border-red-200 bg-red-50/70"
          : "border-slate-200 bg-slate-50"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${
            isConfigured && !isExpired ? "bg-emerald-600 text-white" : "bg-slate-700 text-white"
          }`}>
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Offline Terminal Authorization
              </h3>
              {isConfigured && !isExpired ? (
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  Active & Ready
                </span>
              ) : isExpired ? (
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  Expired
                </span>
              ) : (
                <span className="rounded-full bg-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  Not Configured
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-600">
              Authorized computer: <strong className="font-semibold text-slate-800">{deviceConfig?.device_name || "This Computer"}</strong>
            </p>

            {isConfigured && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-slate-200/60 pt-3">
                <div>
                  <span className="text-slate-500">Device ID:</span>
                  <p className="font-mono font-bold text-slate-800">{deviceConfig.device_id}</p>
                </div>
                <div>
                  <span className="text-slate-500">Authorized Admin:</span>
                  <p className="font-bold text-slate-800">{deviceConfig.admin_user?.name || "Admin"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Access Validity:</span>
                  <p className={`font-bold ${isExpired ? "text-red-700" : "text-emerald-800"}`}>
                    Until {new Date(deviceConfig.expiry_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Set Offline PIN Form */}
      <form onSubmit={handleSetup} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-extrabold text-slate-900">
            {isConfigured ? "Update Offline PIN" : "Configure Emergency Offline PIN"}
          </h3>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Set a secure 6 to 8 digit PIN for offline emergency authorization. When internet or server connection fails, entering this PIN allows instant offline POS billing on this terminal.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New 6-8 Digit PIN
            </label>
            <input
              type="password"
              maxLength={8}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full tracking-widest text-center font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm PIN
            </label>
            <input
              type="password"
              maxLength={8}
              placeholder="••••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="w-full tracking-widest text-center font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Access Validity (Days)
            </label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <option value={3}>3 Days</option>
              <option value={7}>7 Days (Recommended)</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !pin || !confirmPin}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSaving ? "Saving Configuration..." : "Save & Enable Offline Mode"}
          </button>
        </div>
      </form>

      {/* Manual Product Cache Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                IndexedDB Product Catalog Cache
              </h3>
              <p className="text-xs text-slate-500">
                Keep local offline barcode scanner data up to date with live products.
              </p>
            </div>
          </div>

          <button
            onClick={handleCacheProductsNow}
            disabled={isCaching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-blue-600 ${isCaching ? "animate-spin" : ""}`} />
            {isCaching ? "Caching..." : "Sync Product Cache Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
