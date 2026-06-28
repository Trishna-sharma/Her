import React from 'react';

export default function CategoryPage({ categories, onBack }) {
  return (
    <div className="category-page">
      <header className="page-top-nav">
        <div className="logo">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </div>

        <nav className="page-links">
          <a href="#">Home</a>
          <a href="#">Products</a>
          <a href="#">Gallery</a>
          <a href="#">Contact</a>
          <a href="#">Start Shopping</a>
        </nav>

        <button className="login-button">Login</button>
      </header>

      <div className="category-page-content">
        <aside className="category-panel">
          <p className="sidebar-label">Shop by category</p>
          <div className="category-list">
            {categories.map((category) => (
              <button key={category} className="category-pill">
                {category}
              </button>
            ))}
          </div>
        </aside>

        <section className="category-hero">
          <div className="hero-copy">
            <div className="eyebrow">Her by Mou</div>
            <h1>Celebrate every look with curated Bangladeshi style.</h1>
            <p>
              Discover the latest jewellery, clothing, skin care, makeup, shoes, and lehenga collections in one vibrant place.
            </p>
            <div className="hero-actions">
              <button className="primary-button">Browse all products</button>
              <button className="secondary-button" onClick={onBack}>
                Back to welcome
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-placeholder"><img src="new-arrival.png" alt="New Arrivals"/> </div>
            <span className="hero-sticker-label">New arrivals</span>
          </div>s
        </section>
      </div>
    </div>
  );
}
