function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      {label}
    </div>
  );
}

export default LoadingState;


