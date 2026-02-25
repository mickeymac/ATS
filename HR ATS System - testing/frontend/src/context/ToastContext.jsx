import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext();

let idCounter = 0;

const normalizeToastArgs = (titleOrToast, descriptionOrVariant, maybeOptions) => {
  if (typeof titleOrToast === 'string') {
    const maybeVariant = descriptionOrVariant;
    const isVariant = ['success', 'error', 'warning', 'info'].includes(maybeVariant);
    const options = (maybeOptions && typeof maybeOptions === 'object') ? maybeOptions : {};
    return {
      title: titleOrToast,
      description: isVariant ? options.description : descriptionOrVariant,
      variant: isVariant ? maybeVariant : options.variant,
      duration: options.duration,
      persist: options.persist,
    };
  }

  return titleOrToast ?? {};
};

const variantClasses = {
  success: 'border-emerald-500/60 ring-emerald-200 dark:ring-emerald-900/40',
  error: 'border-rose-500/60 ring-rose-200 dark:ring-rose-900/40',
  warning: 'border-amber-500/60 ring-amber-200 dark:ring-amber-900/40',
  info: 'border-slate-500/30 ring-slate-200 dark:ring-slate-700',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((titleOrToast, descriptionOrVariant, maybeOptions) => {
    const toast = normalizeToastArgs(titleOrToast, descriptionOrVariant, maybeOptions);
    const id = ++idCounter;
    const next = { id, variant: 'info', ...toast };
    setToasts((current) => [...current, next]);
    if (!toast.persist) {
      setTimeout(() => removeToast(id), toast.duration ?? 3000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed inset-0 flex items-start justify-end px-4 py-6 sm:p-6">
        <div className="flex w-full flex-col items-end space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border-l-4 bg-white/90 shadow-md ring-1 backdrop-blur dark:bg-slate-900/90 ${
                variantClasses[toast.variant] ?? variantClasses.info
              }`}
            >
              <div className="p-4">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {toast.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
