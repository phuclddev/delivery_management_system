import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { DataProviderProvider } from './providers/dataProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0f766e',
          colorInfo: '#0f766e',
          borderRadius: 12,
          fontFamily:
            '"Plus Jakarta Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <AntdApp>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
          <AuthProvider>
            <DataProviderProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </DataProviderProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
