import axios from "axios";

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
    if (error.response?.status === 401 && !url.includes("/auth/login")) {
      window.dispatchEvent(new Event("mh-session-expired"));
    }
    return Promise.reject(error);
  },
);

export default apiClient;
