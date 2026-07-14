import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center gap-3 bg-app text-sm text-muted"
        role="status"
        aria-live="polite"
      >
        <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" aria-hidden="true" />
        <span>Loading MH Mini Mart...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
