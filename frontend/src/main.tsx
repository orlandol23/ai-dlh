import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initSentry } from './lib/sentry';
import './i18n';
import './i18n/zod';
import './styles/globals.css';

// Observability (C1): no-op unless VITE_SENTRY_DSN is set — see lib/sentry.ts.
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
