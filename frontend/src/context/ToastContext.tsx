import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (msg: string, title?: string) => showToast('success', msg, title),
    error: (msg: string, title?: string) => showToast('error', msg, title, 4500),
    warning: (msg: string, title?: string) => showToast('warning', msg, title, 4000),
    info: (msg: string, title?: string) => showToast('info', msg, title),
  };

  return (
    <ToastContext.Provider value={{ toast, showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <aside aria-label="Notifications" className="toast-container">
        {toasts.map((t) => {
          let icon = <CheckCircle2 size={18} className="toast-icon toast-icon-success" />;
          if (t.type === 'error') {
            icon = <AlertCircle size={18} className="toast-icon toast-icon-error" />;
          } else if (t.type === 'warning') {
            icon = <AlertTriangle size={18} className="toast-icon toast-icon-warning" />;
          } else if (t.type === 'info') {
            icon = <Info size={18} className="toast-icon toast-icon-info" />;
          }

          return (
            <div
              key={t.id}
              className={`toast-item toast-${t.type}`}
              onClick={() => removeToast(t.id)}
              role="status"
              title="Click to dismiss"
            >
              <div className="toast-icon-wrap">{icon}</div>
              <div className="toast-content">
                {t.title && <div className="toast-title">{t.title}</div>}
                <div className="toast-message">{t.message}</div>
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

