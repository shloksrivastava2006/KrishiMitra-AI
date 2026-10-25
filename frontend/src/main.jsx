import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { CartProvider } from './features/market/CartContext.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </I18nProvider>
  </React.StrictMode>
);
