import React, { useEffect, useRef, useState } from 'react';
import Navigation from './Navigation.jsx';
import { categoryData } from '../data/categoryData.js';
import { getAdminItems } from '../data/catalogAdminStore.js';
import AuthStatusButton from './AuthStatusButton.jsx';

function ArcCarousel({ items, onKnowMore }) {
  const [current, setCurrent] = useState(0);
  const stageRef = useRef(null);
  const [dims, setDims] = useState({ w: 660, h: 520 });

  useEffect(() => {
    const update = () => {
      if (stageRef.current) {
        setDims({
          w: stageRef.current.offsetWidth,
          h: stageRef.current.offsetHeight,
        });
      }
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + items.length) % items.length);
  const next = () => setCurrent((c) => (c + 1) % items.length);

  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const isCompact = dims.w <= 620;
  const lane = isCompact
    ? Math.max(64, Math.min(112, dims.w * 0.18))
    : Math.max(80, Math.min(185, dims.w * 0.23));

  const signedOffset = (index) => {
    const len = items.length;
    if (len <= 1) return 0;

    let delta = index - current;
    if (delta > len / 2) delta -= len;
    if (delta < -len / 2) delta += len;
    return delta;
  };

  return (
    <div className="arc-carousel">
      <div className="arc-stage" ref={stageRef}>
        {items.map((item, i) => {
          const delta = signedOffset(i);
          const depth = Math.abs(delta);
          const visible = isCompact ? depth <= 1 : depth <= 2;
          const isCurrent = i === current;
          const size = isCurrent
            ? (isCompact ? Math.min(330, dims.w * 0.86) : 258)
            : depth === 1
              ? (isCompact ? Math.min(136, dims.w * 0.34) : 168)
              : (isCompact ? Math.min(96, dims.w * 0.24) : 124);
          const x = cx + delta * lane - size / 2;
          const y = cy + depth * (isCompact ? 48 : 56) - size / 2 - (isCurrent ? (isCompact ? 22 : 34) : 0);
          const opacity = isCurrent ? 1 : depth === 1 ? 0.7 : 0.36;
          const zIndex = isCurrent ? 40 : 30 - depth;
          const rotate = 0;

          return (
            <div
              key={item.id}
              className={`arc-item ${isCurrent ? 'current' : 'ring'} ${visible ? '' : 'hidden'}`}
              style={{
                left: x,
                top: y,
                opacity,
                zIndex,
                transform: `scale(${isCurrent ? 1 : depth === 1 ? 0.93 : 0.86}) rotate(${rotate}deg)`,
                width: size,
                height: size + (isCurrent ? 64 : 0),
                pointerEvents: visible ? 'auto' : 'none',
              }}
              onClick={() => setCurrent(i)}
            >
              <div className="arc-img" style={{ width: size, height: size }}>
                <img src={item.img} alt={item.name} />
              </div>

              {isCurrent && (
                <>
                  <button
                    type="button"
                    className="arc-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      onKnowMore(item.name);
                    }}
                  >
                    {item.name}
                  </button>

                  <div className="arc-info">
                    <button
                      type="button"
                      className="arc-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKnowMore(item.name);
                      }}
                    >
                      Know more
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

      </div>

      <div className="arc-footer">
        <button className="arc-btn" onClick={prev}>←</button>
        <div className="arc-dots">
          {items.map((_, i) => (
            <div
              key={i}
              className={`arc-dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
        <button className="arc-btn" onClick={next}>→</button>
      </div>
    </div>
  );
}

export default function Gallery({
  onNavigate,
  selectedCategory,
  categories,
  activePage,
  onLoginClick,
  authSession,
  theme,
  onToggleTheme,
}) {
  const [currentCategory, setCurrentCategory] = useState(selectedCategory || categories[0]);

  useEffect(() => {
    if (selectedCategory && categoryData[selectedCategory]) {
      setCurrentCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const items = [
    ...(categoryData[currentCategory] || []),
    ...getAdminItems()
      .filter((item) => String(item.category || '').trim().toLowerCase() === currentCategory.toLowerCase())
      .map((item) => ({
        id: `admin-${item.id}`,
        name: item.name,
        img: item.img || 'new-arrival.png',
        price: item.price,
      })),
  ];

  return (
    <div className="gallery-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} theme={theme} onToggleTheme={onToggleTheme} />
        <AuthStatusButton authSession={authSession} onClick={onLoginClick} />
      </header>

      <div className="gallery-content-grid">
        <aside className="gallery-sidebar">
          <p className="sidebar-title">Categories</p>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`gallery-sidebar-btn ${currentCategory === cat ? 'active' : ''}`}
              onClick={() => setCurrentCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </aside>

        <main className="gallery-main">
          <div className="gallery-main-header">
            <div>
              <p className="gallery-main-meta">Selected category</p>
              <h2>{currentCategory}</h2>
            </div>
            <span className="gallery-main-count">{items.length} styles</span>
          </div>

          <div className="gallery-main-copy">
            <p>
              Explore the latest {currentCategory.toLowerCase()} collection in a curved carousel. Click the arrows to rotate the looks and tap the center image for details.
            </p>
          </div>

          <ArcCarousel
            items={items}
            onKnowMore={(sectionName) => onNavigate('detail', currentCategory, sectionName)}
          />
        </main>
      </div>
    </div>
  );
}
