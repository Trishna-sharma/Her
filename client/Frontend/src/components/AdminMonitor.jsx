// src/components/AdminMonitor.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const AdminMonitor = ({ token }) => {
  const [data, setData] = useState({
    activeUsersCount: 0,
    activeAdminsCount: 0,
    activeSessions: [],
    history: [],
  });

  const fetchMonitoringData = async () => {
    try {
      const rawBase = import.meta.env.VITE_API_URL || 'https://bella-liliac-backend.vercel.app';
      const apiBase = rawBase.replace(/\/+$/, '');

      const response = await axios.get(`${apiBase}/api/admin/monitoring-dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load monitoring stats:', error);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchMonitoringData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Live System Monitoring</h2>

      {/* Status Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', flex: 1 }}>
          <h3>🟢 Online Users</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.activeUsersCount}</p>
        </div>
        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', flex: 1 }}>
          <h3>🛡️ Online Admins</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.activeAdminsCount}</p>
        </div>
      </div>

      {/* Recent Activity Log Table */}
      <h3>Recent Login Activity</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '8px' }}>Email</th>
            <th style={{ padding: '8px' }}>Role</th>
            <th style={{ padding: '8px' }}>Action</th>
            <th style={{ padding: '8px' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {data.history.map((log, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{log.email}</td>
              <td style={{ padding: '8px' }}>{log.role}</td>
              <td style={{ padding: '8px' }}>{log.action}</td>
              <td style={{ padding: '8px' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};