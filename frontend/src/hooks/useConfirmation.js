import { alertManager, ALERT_EVENTS } from "../utils/alertManager";

export default function useConfirmation() {
  return function confirm(options) {
    return new Promise((resolve) => {
      window.dispatchEvent(new CustomEvent(ALERT_EVENTS.CONFIRM, {
        detail: {
          ...options,
          resolve
        }
      }));
    });
  };
}
