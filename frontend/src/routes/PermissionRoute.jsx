import { Navigate, useLocation } from "react-router-dom";
import usePermissions from "../hooks/usePermissions";
import useOffline from "../hooks/useOffline";

function PermissionRoute({ permission, children }) {
  const { can } = usePermissions();
  const { isOnline, isEmergencyMode } = useOffline();
  const location = useLocation();

  // If offline emergency mode, restrict to POS, Sales, Dashboard only
  if (!isOnline || isEmergencyMode) {
    const offlineAllowedPaths = ['/pos', '/sales', '/dashboard', '/notifications'];
    if (!offlineAllowedPaths.includes(location.pathname)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return can(permission) ? children : <Navigate to="/access-denied" replace />;
}
export default PermissionRoute;