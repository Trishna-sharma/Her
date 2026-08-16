// src/hooks/useHeartbeat.js
import { useEffect } from 'react';
import axios from 'axios';

export const useHeartbeat = (currentUser) => {
  useEffect(() => {
    if (!currentUser?.email) return;

    const rawBase = import.meta.env.VITE_API_URL || 'https://bella-liliac-backend.vercel.app';
    const apiBase = rawBase.replace(/\/+$/, '');

    const sendPing = async () => {
      try {
        await axios.post(`${apiBase}/api/auth/heartbeat`, {
          email: currentUser.email,
          role: currentUser.role || 'user',
        });
      } catch (err) {
        console.error('Heartbeat ping failed:', err);
      }
    };

    // Send immediately on login/mount
    sendPing();

    // Ping server every 30 seconds
    const interval = setInterval(sendPing, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);
};