import React from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLogoutDialog } from './logout/LogoutProvider';

interface LogoutButtonProps {
  className?: string;
  showLabel?: boolean;
  label?: string;
  title?: string;
  compact?: boolean;
}

export default function LogoutButton({
  className = '',
  showLabel = true,
  label = 'Logout',
  title = 'Log out of the portal',
  compact = false,
}: LogoutButtonProps) {
  const { requestLogout, isLoggingOut } = useLogoutDialog();

  return (
    <motion.button
      type="button"
      title={title}
      aria-label={title}
      onClick={requestLogout}
      disabled={isLoggingOut}
      whileHover={isLoggingOut ? undefined : { y: -1, scale: 1.01 }}
      whileTap={isLoggingOut ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-error/15 bg-surface-container-high px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-outline transition-all',
        'hover:border-error/25 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-70',
        compact ? 'min-h-0 px-0 py-0' : 'min-h-[44px]',
        compact ? 'h-9 w-9 rounded-xl' : '',
        className,
      ].join(' ')}
    >
      {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      {showLabel && !compact && <span>{isLoggingOut ? 'Logging out' : label}</span>}
    </motion.button>
  );
}
