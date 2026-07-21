import React, { useEffect, useRef, useState } from 'react';

function getProfileName(authSession) {
  if (!authSession) return 'Login';
  return 'Your profile';
}

export default function AuthStatusButton({ authSession, onClick, menuEnabled = true }) {
  const isLoggedIn = Boolean(authSession);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const openRoleLogin = (role) => {
    setOpen(false);
    onClick(role);
  };

  return (
    <div className="auth-status-wrap" ref={rootRef}>
      <button
        type="button"
        className={`login-button ${isLoggedIn ? 'profile-button logged-in' : ''}`}
        onClick={() => {
          if (isLoggedIn || !menuEnabled) {
            onClick();
            return;
          }

          setOpen((value) => !value);
        }}
        title={isLoggedIn ? `Logged in as ${authSession.role}` : 'Login'}
      >
        {isLoggedIn && <span className="profile-dot" aria-hidden="true" />}
        <span>{getProfileName(authSession)}</span>
      </button>

      {!isLoggedIn && open && menuEnabled && (
        <div className="auth-login-menu" role="menu" aria-label="Quick login options">
          <button type="button" className="auth-login-menu-item" onClick={() => openRoleLogin('admin')}>
            Login as Admin
          </button>
          <button type="button" className="auth-login-menu-item" onClick={() => openRoleLogin('user')}>
            Login as User
          </button>
        </div>
      )}
    </div>
  );
}