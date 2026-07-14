import { useCallback } from "react";
import useAuth from "./useAuth";

function usePermissions() {
  const { user } = useAuth();
  const can = useCallback((permission) => Boolean(user?.permissions?.includes(permission)), [user]);
  const canAny = useCallback((permissions) => permissions.some((permission) => can(permission)), [can]);
  return { permissions: user?.permissions || [], can, canAny };
}
export default usePermissions;