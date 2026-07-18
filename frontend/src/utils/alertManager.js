export const ALERT_EVENTS = {
  ADD_TOAST: 'mh-add-toast',
  DISMISS_TOAST: 'mh-dismiss-toast',
  DISMISS_ALL: 'mh-dismiss-all',
  UPDATE_TOAST: 'mh-update-toast',
  CONFIRM: 'mh-confirm',
};

let toastIdCounter = 0;

export const alertManager = {
  add(type, message, options = {}) {
    const id = options.id || `toast-${++toastIdCounter}`;
    const event = new CustomEvent(ALERT_EVENTS.ADD_TOAST, {
      detail: { id, type, message, ...options },
    });
    window.dispatchEvent(event);
    return id;
  },
  
  success(message, options = {}) {
    return this.add('success', message, options);
  },

  error(message, options = {}) {
    return this.add('error', message, options);
  },

  warning(message, options = {}) {
    return this.add('warning', message, options);
  },

  info(message, options = {}) {
    return this.add('info', message, options);
  },

  loading(message, options = {}) {
    return this.add('loading', message, options);
  },

  dismiss(id) {
    window.dispatchEvent(new CustomEvent(ALERT_EVENTS.DISMISS_TOAST, { detail: { id } }));
  },

  dismissAll() {
    window.dispatchEvent(new CustomEvent(ALERT_EVENTS.DISMISS_ALL));
  },

  update(id, updates) {
    window.dispatchEvent(new CustomEvent(ALERT_EVENTS.UPDATE_TOAST, { detail: { id, updates } }));
  }
};
