import { Navigate } from "react-router-dom";
import usePermissions from "../hooks/usePermissions";

function PermissionRoute({ permission, children }) {
  const { can } = usePermissions();
  return can(permission) ? children : <Navigate to="/access-denied" replace />;
}
export default PermissionRoute;