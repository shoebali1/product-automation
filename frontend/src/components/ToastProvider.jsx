import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
            key={toast.id}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
