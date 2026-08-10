import React, { useRef } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';

const WHATSAPP_NUMBER = '8801853314954';

const arrivals = [
  {
    id: 'arr-1',
    name: 'Minimal Ivory Lehenga',
    price: '$219',
    img: 'new-arrival.png',
    category: 'Clothing',
    section: 'Lehengas',
  },
  {
    id: 'arr-2',
    name: 'Embroidered Festive Lehenga',
    price: '$309',
    img: 'new-arrival(1).jpg',
    category: 'Clothing',
    section: 'Lehengas',
  },
  {
    id: 'arr-3',
    name: 'Classic Anarkali',
    price: '$119',
    img: 'new-arrival.png',
    category: 'Clothing',
    section: 'Anarkalis',
  },
  {
    id: 'arr-4',
    name: 'Royal Red Bridal Lehenga',
    price: '$359',
    img: 'new-arrival(1).jpg',
    category: 'Clothing',
    section: 'Lehengas',
  },
];

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function CategoryPage({
  categories,
  onBack,
  onNavigate,
  onAddCartItem = () => {},
  activePage,
  onLoginClick,
  authSession,
  theme,
  onToggleTheme,
}) {
  const scrollRef = useRef(null);
  const arrivalsRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -320 : 320,
        behavior: 'smooth',
      });
    }
  };

  const addArrivalToCart = (item) => {
    const itemId = `${item.category}__${item.section}__Everyday Edit__${item.name}`;
    onAddCartItem({
      itemId,
      cartId: `${itemId}__Default__Default`,
      name: item.name,
      price: item.price,
      img: item.img,
      category: item.category,
      section: item.section,
      rowTitle: 'Everyday Edit',
      color: 'Default',
      size: 'Default',
      quantity: 1,
    });
  };

  const arrivalOrderMessage = (item) => (
    [
      'Hello Her by Mou,',
      '',
      `I want to order this item: ${item.name}`,
      `Category: ${item.category}`,
      `Section: ${item.section}`,
      `Price: ${item.price}`,
      'Quantity: 1',
    ].join('\n')
  );

  return (
    <div className="category-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <img
            src={theme === 'dark' ? '/bella_dark.png' : '/bella_light.png'}
            alt="Bella logo"
          />
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} theme={theme} onToggleTheme={onToggleTheme} />
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
              <button className="primary-button" onClick={() => arrivalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                Browse new arrivals
              </button>
              <button className="secondary-button" onClick={onBack}>
                Back to welcome
              </button>
            </div>
          </div>

          <div className="hero-visual" ref={arrivalsRef}>
            <div className="new-arrivals-track compact">
              {arrivals.map((item) => (
                <article key={item.id} className="new-arrival-card compact">
                  <button
                    type="button"
                    className="new-arrival-image-btn"
                    onClick={() => onNavigate('detail', item.category, item.section)}
                    aria-label={`Open ${item.name}`}
                  >
                    <img src={item.img} alt={item.name} />
                  </button>

                  <div className="new-arrival-meta">
                    <h3>{item.name}</h3>
                    <p>{item.price}</p>
                  </div>

                  <div className="new-arrival-actions compact">
                    <button type="button" className="primary-button" onClick={() => addArrivalToCart(item)}>
                      Add to cart
                    </button>
                    <button
                      type="button"
                      className="whatsapp-icon-button"
                      onClick={() => openWhatsApp(arrivalOrderMessage(item))}
                      aria-label={`Order ${item.name} on WhatsApp`}
                    >
                      <span aria-hidden="true">✆</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
