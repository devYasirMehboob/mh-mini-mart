import { useRef } from "react";
import Icon from "../Icon";
import apiClient from "../../api/apiClient";
const shopImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return new URL(url, apiClient.defaults.baseURL).href;
};
function LogoUploader({ shop, isBusy, onUpload, onRemove }) {
  const input = useRef(null);
  return (
    <section className="premium-surface rounded-xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {shop?.logo_url ? (
            <img
              src={shopImageUrl(shop.logo_url)}
              alt="Shop logo"
              className="size-full object-contain p-2"
            />
          ) : (
            <span className="text-lg font-extrabold text-slate-400">
              {(shop?.shop_name || "MH").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-extrabold text-slate-900">Shop logo</h3>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG or WebP. Maximum 2 MB.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={isBusy}
              onClick={() => input.current?.click()}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              <Icon name="upload" className="size-4" />
              Replace logo
            </button>
            {shop?.logo_url && (
              <button
                type="button"
                disabled={isBusy}
                onClick={onRemove}
                className="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
export default LogoUploader;
