import { Navigate } from "react-router-dom";
import usePermissions from "../hooks/usePermissions";
function AdminRoute({ children }) { const { can } = usePermissions(); return can("users.manage") ? children : <Navigate to="/access-denied" replace />; }
export default AdminRoute;