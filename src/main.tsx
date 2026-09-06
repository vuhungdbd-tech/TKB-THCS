import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

// Guard against unhandled rejections from network, aborts, or background tasks
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = String(reason?.message || reason?.name || reason || '');
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Supabase') ||
    msg.includes('AuthApiError') ||
    msg.includes('Auth session missing') ||
    msg.includes('AuthSessionMissingError') ||
    msg.includes('AuthError')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


