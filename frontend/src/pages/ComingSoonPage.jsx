import { useEffect } from "react";

function ComingSoonPage({ title }) {
  useEffect(() => {
    document.title = title + " | MH Mini Mart";
  }, [title]);

  return (
    <section className="min-h-60 rounded-xl border border-border bg-white p-6 sm:p-8">
      <span className="inline-flex rounded-full border border-border bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
        Planned
      </span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        This section is included in navigation and will be implemented in a later phase.
      </p>
    </section>
  );
}

export default ComingSoonPage;
