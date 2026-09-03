import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against unhandled rejections from network, aborts, or background tasks
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

// Guard against empty error objects and external script errors
window.addEventListener('error', (event) => {
  if (
    !event.message ||
    event.message === 'Script error.' ||
    !event.error ||
    (typeof event.error === 'object' && Object.keys(event.error).length === 0)
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

