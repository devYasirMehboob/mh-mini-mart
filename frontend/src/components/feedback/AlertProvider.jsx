import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ALERT_EVENTS } from '../../utils/alertManager';
import ToastViewport from './ToastViewport';
import ConfirmationDialog from './ConfirmationDialog';
import DestructiveActionDialog from './DestructiveActionDialog';

const AlertContext = createContext(null);

export default function AlertProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const handleAdd = (e) => {
      setToasts(prev => {
        // Prevent duplicate network or session errors, or identical messages
        if (e.detail.preventDuplicate) {
          if (prev.some(t => t.message === e.detail.message && t.type === e.detail.type)) {
            return prev;
          }
        }
        // Limit to 4 visible toasts max, remove oldest if needed
        const newToasts = [...prev, { ...e.detail, isHovered: false }];
        if (newToasts.length > 4) {
          return newToasts.slice(newToasts.length - 4);
        }
        return newToasts;
      });
    };

    const handleDismiss = (e) => {
      setToasts(prev => prev.filter(t => t.id !== e.detail.id));
    };

    const handleDismissAll = () => {
      setToasts([]);
    };

    const handleUpdate = (e) => {
      setToasts(prev => prev.map(t => 
        t.id === e.detail.id ? { ...t, ...e.detail.updates } : t
      ));
    };

    const handleConfirm = (e) => {
      setDialog(e.detail);
    };

    window.addEventListener(ALERT_EVENTS.ADD_TOAST, handleAdd);
    window.addEventListener(ALERT_EVENTS.DISMISS_TOAST, handleDismiss);
    window.addEventListener(ALERT_EVENTS.DISMISS_ALL, handleDismissAll);
    window.addEventListener(ALERT_EVENTS.UPDATE_TOAST, handleUpdate);
    window.addEventListener(ALERT_EVENTS.CONFIRM, handleConfirm);

    return () => {
      window.removeEventListener(ALERT_EVENTS.ADD_TOAST, handleAdd);
      window.removeEventListener(ALERT_EVENTS.DISMISS_TOAST, handleDismiss);
      window.removeEventListener(ALERT_EVENTS.DISMISS_ALL, handleDismissAll);
      window.removeEventListener(ALERT_EVENTS.UPDATE_TOAST, handleUpdate);
      window.removeEventListener(ALERT_EVENTS.CONFIRM, handleConfirm);
    };
  }, []);

  const setHoverState = useCallback((id, isHovered) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isHovered } : t));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleDialogResolve = (result) => {
    if (dialog && dialog.resolve) {
      dialog.resolve(result);
    }
    setDialog(null);
  };

  return (
    <AlertContext.Provider value={{}}>
      {children}
      <ToastViewport toasts={toasts} dismissToast={dismissToast} setHoverState={setHoverState} />
      {dialog && dialog.destructive ? (
        <DestructiveActionDialog dialog={dialog} onResolve={handleDialogResolve} />
      ) : (
        <ConfirmationDialog dialog={dialog} onResolve={handleDialogResolve} />
      )}
    </AlertContext.Provider>
  );
}
