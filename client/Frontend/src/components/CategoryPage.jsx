import React, { useRef } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';

const images = [
  'new-arrival.png',
  'new-arrival.png',
  'new-arrival.png',
  'new-arrival.png',
  'new-arrival.png',
];

export default function CategoryPage({ categories, onBack, onNavigate, activePage, onLoginClick, authSession }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -320 : 320,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="category-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} />
        <AuthStatusButton authSession={authSession} onClick={onLoginClick} />
      </header>

      <div className="category-page-content">
        <aside className="category-panel">
          <p className="sidebar-label">Shop by category</p>
          <div className="category-list">
            {categories.map((category) => (
              <button
                key={category}
                className="category-pill"
                onClick={() => onNavigate('gallery', category)}
              >
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
              Discover the latest clothing, jewellery, makeup, shoes,
              bags, and skin care collections in one vibrant place.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => onNavigate('gallery', categories[0])}>
                Browse all collections
              </button>
              <button className="secondary-button" onClick={onBack}>
                Back to welcome
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="arrivals-scroll-track" ref={scrollRef}>
              {images.map((src, i) => (
                <div className="arrival-slide" key={i}>
                  <img src={src} alt={`Arrival ${i + 1}`} />
                </div>
              ))}
            </div>
            <div className="arrivals-footer">
              <span className="hero-sticker-label">New arrivals</span>
              <div className="arrivals-arrows">
                <button className="arr-arrow" onClick={() => scroll('left')} aria-label="Previous">←</button>
                <button className="arr-arrow" onClick={() => scroll('right')} aria-label="Next">→</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
