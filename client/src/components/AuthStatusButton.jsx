import React from 'react';

function getProfileName(authSession) {
  if (!authSession) return 'Login';
  if (authSession.role === 'admin') return 'Your profile: Admin';

  const safeName = String(authSession.name || '').trim();
  if (safeName) {
    return `Your profile: ${safeName}`;
  }

  const emailSeed = String(authSession.email || '').trim();
  const username = emailSeed.includes('@') ? emailSeed.split('@')[0] : emailSeed;
  return `Your profile: ${username || 'User'}`;
}

export default function AuthStatusButton({ authSession, onClick }) {
  const isLoggedIn = Boolean(authSession);

  return (
    <button
      type="button"
      className={`login-button ${isLoggedIn ? 'profile-button logged-in' : ''}`}
      onClick={onClick}
      title={isLoggedIn ? `Logged in as ${authSession.role}` : 'Login'}
    >
      {isLoggedIn && <span className="profile-dot" aria-hidden="true" />}
      <span>{getProfileName(authSession)}</span>
    </button>
  );
}