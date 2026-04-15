import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import AppErrorBoundary from './components/AppErrorBoundary';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PWA] Service worker registered.');
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
  }
}

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
