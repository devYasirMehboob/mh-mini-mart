import { useEffect, useMemo, useState } from "react";
import {
  getSettings,
  removeShopLogo,
  updateSettings,
  uploadShopLogo,
} from "../api/settingsApi";
import useAlert from "../hooks/useAlert";
import useConfirmation from "../hooks/useConfirmation";
import normalizeApiError from "../utils/normalizeApiError";
import PageErrorState from "../components/feedback/PageErrorState";
import LoadingState from "../components/feedback/LoadingState";
import AlertBanner from "../components/feedback/AlertBanner";
import Icon from "../components/Icon";
import LogoUploader from "../components/settings/LogoUploader";
import SettingsNavigation from "../components/settings/SettingsNavigation";
import SettingsSaveBar from "../components/settings/SettingsSaveBar";
import SettingsSectionForm from "../components/settings/SettingsSectionForm";
import { settingsSections } from "../components/settings/settingsConfig";
import useSettings from "../hooks/useSettings";
const safe = (error, fallback) => error.response?.data?.message || fallback;
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function SettingsPage() {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState(null);
  const [original, setOriginal] = useState(null);
  const [active, setActive] = useState("shop");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const alert = useAlert();
  const confirm = useConfirmation();
  const [pageError, setPageError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [errors, setErrors] = useState({});
  const section = useMemo(
    () => settingsSections.find((item) => item.key === active),
    [active],
  );
  const dirty =
    settings && original
      ? JSON.stringify(settings[active]) !== JSON.stringify(original[active])
      : false;
  async function load() {
    setLoading(true);
    setPageError(null);
    try {
      const data = await getSettings();
      setSettings(data);
      setOriginal(clone(data));
    } catch (error) {
      const normalized = normalizeApiError(error);
      setPageError(normalized);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    document.title = "Settings | MH Mini Mart";
    load();
  }, []);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function select(next) {
    if (dirty) {
      const confirmed = await confirm({
        title: "Unsaved Changes",
        description: "Discard unsaved changes in this settings section?",
        confirmText: "Discard",
        tone: "warning"
      });
      if (!confirmed) return;
    }
    if (dirty)
      setSettings((current) => ({
        ...current,
        [active]: clone(original[active]),
      }));
    setErrors({});
    setFormError(null);
    setActive(next);
  }
  function change(key, value) {
    setSettings((current) => ({
      ...current,
      [active]: { ...current[active], [key]: value },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`${active}.${key}`];
      return next;
    });
  }
  function reset() {
    setSettings((current) => ({
      ...current,
      [active]: clone(original[active]),
    }));
    setErrors({});
  }
  async function save() {
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const payload = clone(settings[active]);
      if (active === "shop") {
        delete payload.logo_url;
      }
      const response = await updateSettings({ [active]: payload });
      setSettings(response.data);
      setOriginal(clone(response.data));
      await refreshSettings();
      alert.success(response.message || "Settings updated successfully.");
    } catch (error) {
      const normalized = normalizeApiError(error);
      setErrors(normalized.fieldErrors);
      setFormError(normalized.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    setBusy(true);
    try {
      const response = await uploadShopLogo(file);
      const fresh = await getSettings();
      setSettings(fresh);
      setOriginal(clone(fresh));
      await refreshSettings();
      await refreshSettings();
      alert.success(response.message || "Shop logo updated successfully.");
    } catch (error) {
      const normalized = normalizeApiError(error);
      alert.error(normalized.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    const confirmed = await confirm({
      title: "Remove Logo",
      description: "Are you sure you want to remove the current shop logo?",
      confirmText: "Remove",
      tone: "danger"
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await removeShopLogo();
      const fresh = await getSettings();
      setSettings(fresh);
      setOriginal(clone(fresh));
      await refreshSettings();
      alert.success(response.message || "Logo removed successfully.");
    } catch (error) {
      const normalized = normalizeApiError(error);
      alert.error(normalized.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingState message="Loading system settings..." />;
  if (pageError) return <PageErrorState error={pageError} onRetry={load} />;
  if (!settings) return <PageErrorState error={{ message: "Settings data is unavailable." }} onRetry={load} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
            System configuration
          </span>
          <h2 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
            Settings
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Manage one trusted configuration for your shop, sales, receipts and
            local operation.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={load}
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
        >
          <Icon
            name="refresh"
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>
      {formError && <AlertBanner type="error" message={formError} />}
      {dirty && !formError && <AlertBanner type="warning" message="You have unsaved changes in this section." />}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {active === "shop" && (
        <LogoUploader
          shop={settings.shop}
          isBusy={busy}
          onUpload={upload}
          onRemove={remove}
        />
      )}
      <div className="flex flex-col lg:grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <aside className="lg:sticky lg:top-[94px] lg:order-last">
          <SettingsNavigation
            sections={settingsSections}
            active={active}
            onSelect={select}
            dirty={dirty ? active : null}
          />
        </aside>
        <main>
          <SettingsSectionForm
            section={section}
            values={settings[active]}
            errors={errors}
            onChange={change}
            disabled={busy}
          />
          <SettingsSaveBar
            dirty={dirty}
            busy={busy}
            onReset={reset}
            onSave={save}
          />
        </main>
      </div>
      </div>
    </div>
  );
}
export default SettingsPage;
