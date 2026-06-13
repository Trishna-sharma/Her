// src/components/WelcomeScreen.jsx
import React from 'react';

export default function WelcomeScreen({ onContinue }) {
  return (
    <div className="welcome-screen">
      {/* Top navigation */}
      <nav className="top-nav">
        <div className="logo">
          <span style={{ color: '#1FD3A0' }}>H</span>
          <span style={{ color: '#1FD3A0' }}>E</span>
          <span style={{ color: '#F5C400' }}>R</span>
        </div>
        <div className="nav-links">
          <a href="#" className="active">Home</a>
          <a href="#">Products</a>
          <a href="#">Gallery</a>
          <a href="#">Contact</a>
          <a href="#">Start Shopping</a>
        </div>
        <button className="login-button">Login</button>
      </nav>

      {/* Decorative blobs */}
      <div className="blob blob-top-left" />
      <div className="blob blob-bottom-left" />
      <div className="blob blob-right" />

      {/* Vertical side text */}
      <div className="side-text side-text-left">Ethnic wear</div>
      <div className="side-text side-text-right">reimagined with joy</div>

      {/* Collection badge */}
      <div className="collection-badge">Spring Collection 2026</div>

      {/* Hero card */}
      <div className="hero-card">
        <h1>
          Welcome to <span className="logo-inline">HER</span> by Mou
        </h1>
        <p>
          Discover jewellery, clothing, skin care, makeup, shoes, and lehenga
          picks designed for Bangladeshi shoppers.
        </p>
        <button className="primary-button" onClick={onContinue}>
          Explore
        </button>
      </div>
    </div>
  );
}
