import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <AppConfigProvider>
        <BrowserRouter>
          <SettingsProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SettingsProvider>
        </BrowserRouter>
      </AppConfigProvider>
    </ErrorBoundary>
  </StrictMode>,
);
