import axios from "axios";
import { alertManager } from "../utils/alertManager";

const sameOriginApiUrl =
  typeof window !== "undefined" && window.location.hostname === "store.mhminimart.com"
    ? `${window.location.origin}/api`
    : null;

const apiClient = axios.create({
  baseURL: sameOriginApiUrl || import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const csrfToken = sessionStorage.getItem("csrfToken");

  if (csrfToken && !["get", "head", "options"].includes(config.method)) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const status = error.response?.status;
    
    // Handle Network Errors (no response from server)
    if (!error.response) {
      alertManager.error("The local server is unavailable. Check Apache and MySQL.", { preventDuplicate: true, id: 'network-error' });
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized globally
    if (status === 401 && !url.includes("/auth/login")) {
      alertManager.warning("Your session has expired. Please log in again.", { preventDuplicate: true, id: 'session-expired' });
      window.dispatchEvent(new Event("mh-session-expired"));
    }
    
    // Handle 403 Forbidden globally
    if (status === 403) {
      alertManager.error("You do not have permission to perform this action.", { preventDuplicate: true, id: 'forbidden-error' });
    }

    // Handle 500 Server Error globally
    if (status >= 500) {
      alertManager.error("An unexpected server error occurred.", { preventDuplicate: true, id: 'server-error' });
    }

    return Promise.reject(error);
  },
);

export default apiClient;
