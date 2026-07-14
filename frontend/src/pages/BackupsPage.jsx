import { useCallback, useEffect, useState } from "react";
import { createBackup, downloadBackup, getBackups, restoreBackup } from "../api/backupsApi";
import AlertMessage from "../components/AlertMessage";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import LoadingState from "../components/LoadingState";
import Modal from "../components/Modal";
import usePermissions from "../hooks/usePermissions";

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

function messageFor(error, fallback) {
  if (!error.response) return "The local API could not be reached. Check that XAMPP is running.";
  return error.response.data?.message || fallback;
}

function BackupsPage() {
  const { can } = usePermissions();
  const canRestore = can("backups.restore");
  const [backups, setBackups] = useState([]);
  const [configuration, setConfiguration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [alert, setAlert] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBackups();
      setBackups(data.backups || []);
      setConfiguration(data.configuration || null);
    } catch (error) {
      setAlert({ type: "error", message: messageFor(error, "Backups could not be loaded.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Backups | MH Mini Mart";
    load();
  }, [load]);

  async function create() {
    setBusy("create");
    try {
      const response = await createBackup();
      setAlert({ type: "success", message: response.message });
      await load();
    } catch (error) {
      setAlert({ type: "error", message: messageFor(error, "The backup could not be created.") });
    } finally {
      setBusy("");
    }
  }

  async function download(filename) {
    setBusy(filename);
    try {
      const response = await downloadBackup(filename);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAlert({ type: "error", message: messageFor(error, "The backup could not be downloaded.") });
    } finally {
      setBusy("");
    }
  }

  async function restore(event) {
    event.preventDefault();
    if (!restoreTarget) return;
    setBusy("restore");

    try {
      const response = await restoreBackup(restoreTarget.filename, confirmation);
      setAlert({ type: "success", message: response.message });
      setRestoreTarget(null);
      setConfirmation("");
      await load();
    } catch (error) {
      setAlert({ type: "error", message: messageFor(error, "The backup could not be restored.") });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950">Backups</h2>
          <p className="mt-1.5 text-sm text-slate-500">Create protected local copies of shop data and restore verified archives.</p>
        </div>
        <button type="button" disabled={busy !== ""} onClick={create} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50">
          <Icon name="backups" className="size-[18px]" />
          {busy === "create" ? "Creating..." : "Create backup"}
        </button>
      </header>

      <AlertMessage type={alert?.type} message={alert?.message} onDismiss={() => setAlert(null)} />

      {configuration && (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="premium-surface rounded-xl p-4"><span className="text-xs font-semibold text-slate-400">Retention</span><strong className="mt-1 block text-lg text-slate-900">{configuration.retention_days} days</strong></div>
          <div className="premium-surface rounded-xl p-4"><span className="text-xs font-semibold text-slate-400">Automatic backup</span><strong className="mt-1 block text-lg text-slate-900">{configuration.automatic_backup ? "Configured" : "Off"}</strong></div>
          <div className="premium-surface rounded-xl p-4"><span className="text-xs font-semibold text-slate-400">Preferred time</span><strong className="mt-1 block text-lg text-slate-900">{configuration.automatic_backup_time}</strong></div>
        </section>
      )}

      <section className="premium-surface overflow-hidden rounded-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-extrabold text-slate-900">Local backup files</h3>
          <p className="mt-1 text-xs text-slate-500">Restore accepts only checksummed files generated by this application.</p>
        </div>
        {loading ? (
          <LoadingState label="Loading backups..." />
        ) : backups.length === 0 ? (
          <EmptyState icon="backups" title="No backups yet" description="Create the first local backup before making major system changes." actionLabel="Create backup" onAction={create} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr><th className="px-5 py-3 font-bold">File</th><th className="px-5 py-3 font-bold">Created</th><th className="px-5 py-3 font-bold">Size</th><th className="px-5 py-3 text-right font-bold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((backup) => (
                  <tr key={backup.filename} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-800">{backup.filename}</td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(backup.created_at)}</td>
                    <td className="px-5 py-4 text-slate-500">{formatBytes(Number(backup.size_bytes))}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={busy !== ""} onClick={() => download(backup.filename)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Download</button>
                        {canRestore && <button type="button" disabled={busy !== ""} onClick={() => { setRestoreTarget(backup); setConfirmation(""); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">Restore</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">Automatic-backup settings are retained for scheduling, but Windows Task Scheduler setup is still required outside the application.</p>

      <Modal isOpen={Boolean(restoreTarget)} title="Restore database backup" description="Current data will be replaced after an automatic safety backup is created." onClose={() => busy === "" && setRestoreTarget(null)}>
        <form onSubmit={restore} className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Restoring <strong>{restoreTarget?.filename}</strong> will replace all current shop records. This cannot be merged selectively.
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Type RESTORE to continue</span>
            <input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy !== ""} className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={busy !== ""} onClick={() => setRestoreTarget(null)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={busy !== "" || confirmation !== "RESTORE"} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === "restore" ? "Restoring..." : "Restore backup"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default BackupsPage;