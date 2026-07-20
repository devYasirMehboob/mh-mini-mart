import axios from "axios";
import { alertManager } from "../utils/alertManager";
import { logger } from "../utils/logger";

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
  
  config.metadata = { startTime: new Date() };

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    const requestId = response.headers['x-request-id'] || 'sys';
    logger.api(`${response.config.method.toUpperCase()} ${response.config.url}\nStatus: ${response.status}\nDuration: ${duration}ms\nRequest ID: ${requestId}`);
    return response;
  },
  (error) => {
    const duration = error.config ? (new Date() - error.config.metadata.startTime) : 0;
    const requestId = error.response?.headers?.['x-request-id'] || error.response?.data?.request_id || 'sys';
    
    if (error.config) {
      logger.api(`${error.config.method.toUpperCase()} ${error.config.url}\nStatus: ${error.response?.status || 'Network Error'}\nDuration: ${duration}ms\nRequest ID: ${requestId}`);
    } else {
      logger.api(`Request failed to initialize\nRequest ID: ${requestId}`, error);
    }

    const url = error.config?.url || "";
    const status = error.response?.status;
    const debug = error.response?.data?.debug;
    
    // Handle Network Errors (no response from server)
    if (!error.response) {
      alertManager.error(`The local server is unavailable. Check Apache and MySQL.\nReference: ${requestId}`, { preventDuplicate: true, id: `network-error` });
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized globally
    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/me") && !url.includes("/auth/logout")) {
      alertManager.warning("Your session has expired. Please log in again.", { preventDuplicate: true, id: 'session-expired' });
      window.dispatchEvent(new Event("mh-session-expired"));
    }
    
    // Handle 403 Forbidden globally
    if (status === 403) {
      alertManager.error(`You do not have permission to perform this action.\nReference: ${requestId}`, { preventDuplicate: true, id: `forbidden-error-${requestId}` });
    }

    // Handle 500/503 Server Error globally
    if (status >= 500) {
      if (debug) {
        alertManager.error(`Developer Error\nLayer: ${debug.layer}\nEndpoint: ${error.config.method.toUpperCase()} ${error.config.url}\nStatus: ${status}\nRequest ID: ${requestId}\nDetails: ${debug.message}`, { preventDuplicate: true, id: `internal-error-${requestId}` });
      } else {
        alertManager.error(`An unexpected server error occurred. Please try again.\nReference: ${requestId}`, { preventDuplicate: true, id: `internal-error-${requestId}` });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
