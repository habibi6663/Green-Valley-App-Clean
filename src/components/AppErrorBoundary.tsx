import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  declare props: Readonly<AppErrorBoundaryProps>;
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[APP_ERROR_BOUNDARY]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface px-4 py-10 text-on-surface md:px-8">
          <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 text-center shadow-2xl shadow-black/20 md:p-10">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error">
              <AlertTriangle size={28} />
            </div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-white md:text-4xl">
              Something went wrong
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant md:text-base">
              The app hit an unexpected issue. Your data is safe, and a refresh usually restores the session cleanly.
            </p>
            <p className="mt-4 rounded-2xl border border-outline-variant/10 bg-surface-container-high px-4 py-3 text-sm text-error">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-surface shadow-lg shadow-brand-green/10 transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <RefreshCw size={16} />
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
