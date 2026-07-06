import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastItem = {
  id: string;
  message: string;
};

type PortalToastContextValue = {
  showToast: (message: string) => void;
};

const PortalToastContext = createContext<PortalToastContextValue | null>(null);

export function PortalToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current, { id, message }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <PortalToastContext.Provider value={value}>
      {children}
      <div className="portal-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <p key={toast.id} className="portal-toast" role="status">
            {toast.message}
          </p>
        ))}
      </div>
    </PortalToastContext.Provider>
  );
}

export function usePortalToast() {
  const context = useContext(PortalToastContext);
  if (!context) {
    throw new Error("usePortalToast must be used within PortalToastProvider");
  }
  return context;
}
