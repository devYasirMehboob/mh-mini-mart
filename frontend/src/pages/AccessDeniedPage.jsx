import { Link } from "react-router-dom";
import Icon from "../components/Icon";

function AccessDeniedPage() {
  return <section className="premium-surface mx-auto max-w-xl rounded-xl p-8 text-center sm:p-12">
    <span className="mx-auto grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600"><Icon name="lock" /></span>
    <h2 className="mt-5 text-xl font-extrabold text-slate-950">Access not available</h2>
    <p className="mt-2 text-sm leading-6 text-slate-500">Your account does not have permission to open this area. Ask an administrator if you need access.</p>
    <Link className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700" to="/pos">Return to workspace</Link>
  </section>;
}
export default AccessDeniedPage;