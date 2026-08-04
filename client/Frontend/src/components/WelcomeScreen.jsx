import React from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';

export default function WelcomeScreen({ onContinue, onNavigate, activePage, onLoginClick, authSession, theme, onToggleTheme }) {
  return (
    <div className="welcome-screen">
      {/* Top navigation */}
      <nav className="top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} theme={theme} onToggleTheme={onToggleTheme} />
        <AuthStatusButton authSession={authSession} onClick={onLoginClick} />
      </nav>

      {/* Decorative blobs */}
      <div className="blob blob-top-left" />
      <div className="blob blob-bottom-left" />
      <div className="blob blob-right" />

      {/* Vertical side text */}
      <div className="side-text side-text-left">Ethnic wear</div>
      <div className="side-text side-text-right">reimagined with joy</div>

      {/* Hero card */}
      <div className="hero-card">
        <h1>
          Made for Women by Woman.<br/>
        </h1>
        <p>
          Discover clothing, jewellery, makeup, shoes, bags, and skin care
          picks designed for Bangladeshi shoppers.
        </p>
        <button className="primary-button" onClick={onContinue}>
          Explore
        </button>
      </div>
    </div>
  );
}
