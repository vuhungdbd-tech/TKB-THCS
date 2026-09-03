import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against unhandled rejections from network, aborts, or background tasks
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

// Guard against errors from external scripts, aborted requests, or network failures
window.addEventListener('error', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

