import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { getCsrfToken, getCurrentUser, loginUser, logoutUser } from "../api/authApi";
const AuthContext = createContext(null);
function getSafeErrorMessage(error, fallback) { if (!error.response) return "The server could not be reached. Check that the local API is running."; return error.response.data?.message || fallback; }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [isLoading, setIsLoading] = useState(true);
  const refreshCsrfToken = useCallback(async () => { const token = await getCsrfToken(); sessionStorage.setItem("csrfToken", token); return token; }, []);
  const refreshUser = useCallback(async () => { const currentUser = await getCurrentUser(); setUser(currentUser); return currentUser; }, []);
  useEffect(() => { let active = true; async function restoreSession() { try { await refreshCsrfToken(); const currentUser = await getCurrentUser(); if (active) setUser(currentUser); } catch { if (active) setUser(null); } finally { if (active) setIsLoading(false); } } restoreSession(); const expired = () => { if (active) { setUser(null); sessionStorage.removeItem("csrfToken"); } }; window.addEventListener("mh-session-expired", expired); return () => { active = false; window.removeEventListener("mh-session-expired", expired); }; }, [refreshCsrfToken]);
  const login = useCallback(async (password) => { try { await refreshCsrfToken(); const result = await loginUser(password); sessionStorage.setItem("csrfToken", result.csrfToken); setUser(result.user); return result.user; } catch (error) { throw new Error(getSafeErrorMessage(error, "Unable to log in.")); } }, [refreshCsrfToken]);
  const logout = useCallback(async () => { try { await logoutUser(); } finally { setUser(null); sessionStorage.removeItem("csrfToken"); } }, []);
  const value = useMemo(() => ({ user, isLoading, login, logout, refreshUser }), [user, isLoading, login, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export default AuthContext;