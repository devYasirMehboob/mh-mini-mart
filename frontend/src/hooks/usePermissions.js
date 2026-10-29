import { useCallback } from "react";
import useAuth from "./useAuth";
import useOffline from "./useOffline";

function usePermissions() {
  const { user } = useAuth();
  const { offlineUser, isEmergencyMode } = useOffline();
  const activeUser = user || (isEmergencyMode ? offlineUser : null);

  const can = useCallback(
    (permission) => Boolean(activeUser?.permissions?.includes(permission)),
    [activeUser]
  );
  const canAny = useCallback(
    (permissions) => permissions.some((permission) => can(permission)),
    [can]
  );
  return { permissions: activeUser?.permissions || [], can, canAny };
}
export default usePermissions;