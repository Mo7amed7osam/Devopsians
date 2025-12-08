// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx'; // 1. Import AuthProvider
import './index.css';
import ReactModal from 'react-modal';

// Ensure ReactModal knows the app element once at startup to avoid duplicate registration warnings
if (typeof window !== 'undefined') {
  try {
    ReactModal.setAppElement('#root');
  } catch (err) {
    // ignore in non-browser environments
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {/* 2. Wrap the App component */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);