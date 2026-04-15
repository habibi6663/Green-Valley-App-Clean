import React from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default function NetworkStatusBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="sticky top-0 z-[140] border-b border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-100 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs">
            <WifiOff size={14} />
            You are offline. Some features will sync when connection returns.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
