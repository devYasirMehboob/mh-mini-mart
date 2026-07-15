import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import useAuth from "../hooks/useAuth";

function homeFor(user) {
  if (user?.permissions?.includes("dashboard.view")) return "/dashboard";
  if (user?.permissions?.includes("pos.access")) return "/pos";
  if (user?.permissions?.includes("sales.view")) return "/sales";
  return "/access-denied";
}

function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("admin1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Login | MH Mini Mart";
  }, []);

  if (!isLoading && user) return <Navigate to={homeFor(user)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!password) {
      setError("Enter the access password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(password);
      navigate(location.state?.from?.pathname || homeFor(loggedInUser), {
        replace: true,
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-4 text-ink sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(30,41,59,0.10)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden flex-col justify-between bg-[#17203a] p-12 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-blue-500 text-sm font-black shadow-lg shadow-blue-950/30">
              MH
            </span>
            <div>
              <strong className="block text-base font-extrabold">
                MH Mini Mart
              </strong>
              <span className="mt-0.5 block text-xs text-slate-400">
                Store operations made simple
              </span>
            </div>
          </div>

          <div className="max-w-lg">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">
              Local / Fast / Secure
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.035em]">
              Everything your shop needs, in one calm workspace.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
              Manage products, inventory, billing, and daily operations without
              unnecessary complexity.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["products", "Products"],
              ["inventory", "Inventory"],
              ["reports", "Reports"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <Icon name={icon} className="size-5 text-blue-300" />
                <p className="mt-3 text-xs font-semibold text-slate-200">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid place-items-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-9 lg:hidden">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-200">
                MH
              </span>
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
              Secure shop access
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
              Welcome back
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter the shop password to open your workspace.
            </p>

            {error && (
              <div
                className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                role="alert"
              >
                <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="mt-8" onSubmit={handleSubmit} noValidate>
              <label
                className="mb-2 block text-sm font-bold text-slate-700"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-blue-600"
                  onClick={() => setShowPassword((current) => !current)}
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  <Icon name="eye" className="size-5" />
                </button>
              </div>
              <button
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Login"}
                {!isSubmitting && <Icon name="arrow" className="size-4" />}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
              <Icon name="check" className="size-4 text-emerald-500" />
              <span>Runs securely on your local computer</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
