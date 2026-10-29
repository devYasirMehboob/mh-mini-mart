import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "@fontsource-variable/manrope";
import "./styles/app.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { AppConfigProvider } from "./context/AppConfigContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { logger } from "./utils/logger";

window.addEventListener('error', (event) => {
  logger.error("Unhandled error:", event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  logger.promise("Unhandled promise rejection:", event.reason);
});

// In Electron or file:// protocol, use HashRouter for rock-solid local routing
const isElectronOrFile =
  typeof window !== "undefined" &&
  (window.electronAPI?.isElectron || window.location.protocol === "file:");

const Router = isElectronOrFile ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <AppConfigProvider>
        <Router>
          <SettingsProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SettingsProvider>
        </Router>
      </AppConfigProvider>
    </ErrorBoundary>
  </StrictMode>,
);
