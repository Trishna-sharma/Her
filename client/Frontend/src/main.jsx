import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '927446649163-ip0kji407cmjfjg6pdr5p3s6s660t6pq.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
