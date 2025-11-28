import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from '../../src/components/ui/Toast';
import App from './App';
import '../../src/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
