import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface LogoutContextValue {
  requestLogout: () => void;
  isLoggingOut: boolean;
}

const LogoutContext = React.createContext<LogoutContextValue | null>(null);

export function useLogoutDialog() {
  const context = React.useContext(LogoutContext);

  if (!context) {
    throw new Error('useLogoutDialog must be used within a LogoutProvider');
  }

  return context;
}

interface LogoutProviderProps {
  children: React.ReactNode;
  onLogout: () => Promise<void>;
}

function getLogoutErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Logout failed. Please try again.';
}

export default function LogoutProvider({ children, onLogout }: LogoutProviderProps) {
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requestLogout = React.useCallback(() => {
    if (isLoggingOut) return;
    setError(null);
    setIsConfirmOpen(true);
  }, [isLoggingOut]);

  const cancelLogout = React.useCallback(() => {
    if (isLoggingOut) return;
    setIsConfirmOpen(false);
    setError(null);
  }, [isLoggingOut]);

  const confirmLogout = React.useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setError(null);

    try {
      await onLogout();
      setIsConfirmOpen(false);
    } catch (logoutError) {
      setError(getLogoutErrorMessage(logoutError));
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, onLogout]);

  React.useEffect(() => {
    if (!isConfirmOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoggingOut) {
        cancelLogout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelLogout, isConfirmOpen, isLoggingOut]);

  return (
    <LogoutContext.Provider value={{ requestLogout, isLoggingOut }}>
      {children}

      <AnimatePresence>
        {isConfirmOpen && (
          <>
            <motion.button
              aria-label="Close logout confirmation"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelLogout}
              className="fixed inset-0 z-[120] cursor-default bg-surface/80 backdrop-blur-md"
            />

            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-dialog-title"
              aria-describedby="logout-dialog-description"
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 z-[121] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-5 shadow-2xl shadow-black/40 md:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 id="logout-dialog-title" className="text-lg font-bold tracking-tight text-white md:text-xl">
                      Confirm Logout
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                      Session protection
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cancelLogout}
                  disabled={isLoggingOut}
                  className="rounded-full p-2 text-outline transition-colors hover:bg-surface-container-high hover:text-white disabled:opacity-50"
                  aria-label="Cancel logout"
                >
                  <X size={18} />
                </button>
              </div>

              <p id="logout-dialog-description" className="mt-5 text-sm leading-relaxed text-on-surface-variant">
                Are you sure you want to log out?
              </p>

              {error && (
                <div className="mt-4 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                  {error}
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cancelLogout}
                  disabled={isLoggingOut}
                  className="min-h-[44px] rounded-2xl border border-outline-variant/10 bg-surface-container-high px-4 py-3 text-xs font-bold uppercase tracking-widest text-outline transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="group flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-brand-green px-4 py-3 text-xs font-bold uppercase tracking-widest text-surface shadow-lg shadow-brand-green/10 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Logging out
                    </>
                  ) : (
                    'Log Out'
                  )}
                </button>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </LogoutContext.Provider>
  );
}
