let isDebugEnabled = false;

export const setDebugMode = (enabled) => {
  isDebugEnabled = !!enabled;
  if (isDebugEnabled) {
    console.log(
      "%c╔══════════════════════════════════════╗\n" +
      "║          MH MINI MART POS            ║\n" +
      "║ Debugging: ENABLED                   ║\n" +
      "║ Console Logs: ENABLED                ║\n" +
      "║ Technical Alerts: ENABLED            ║\n" +
      "╚══════════════════════════════════════╝",
      "color: #10b981; font-weight: bold"
    );
  }
};

export const getDebugMode = () => isDebugEnabled;

const createLogger = (layer) => {
  const prefix = `[MH MINI MART — ${layer.toUpperCase()}]`;
  return (message, ...args) => {
    if (!isDebugEnabled) return;
    console.log(`%c${prefix}`, "color: #3b82f6; font-weight: bold", message, ...args);
  };
};

export const logger = {
  frontend: createLogger("FRONTEND"),
  api: createLogger("API"),
  server: createLogger("SERVER"),
  backend: createLogger("BACKEND"),
  database: createLogger("DATABASE"),
  auth: createLogger("AUTH"),
  router: createLogger("ROUTER"),
  pos: createLogger("POS"),
  inventory: createLogger("INVENTORY"),
  purchase: createLogger("PURCHASE"),
  backup: createLogger("BACKUP"),
  printer: createLogger("PRINTER"),
  scanner: createLogger("SCANNER"),
  storage: createLogger("STORAGE"),
  warn: (message, ...args) => {
    if (!isDebugEnabled) return;
    console.warn(`[MH MINI MART — WARNING]`, message, ...args);
  },
  error: (message, ...args) => {
    if (!isDebugEnabled) return;
    console.error(`[MH MINI MART — ERROR]`, message, ...args);
  },
  promise: createLogger("PROMISE")
};
