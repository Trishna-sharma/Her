import React, { useRef } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';
import { createOrderFromItems } from '../data/orderStore.js';

const WHATSAPP_NUMBER = '8801853314954';

const arrivals = [
  {
    id: 'arr-1',
    name: 'Minimal Ivory Lehenga',
    price: '$219',
    img: '/new-arrival.png',
    category: 'Clothing',
    section: 'Lehengas',
  },
  {
    id: 'arr-2',
    name: 'Embroidered Festive Lehenga',
    price: '$309',
    img: '/new-arrival(1).jpg',
    category: 'Clothing',
    section: 'Lehengas',
  },
  {
    id: 'arr-3',
    name: 'Classic Anarkali',
    price: '$119',
    img: '/new-arrival.png',
    category: 'Clothing',
    section: 'Anarkalis',
  },
  {
    id: 'arr-4',
    name: 'Royal Red Bridal Lehenga',
    price: '$359',
    img: '/new-arrival(1).jpg',
    category: 'Clothing',
    section: 'Lehengas',
  },
];

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.7 2.1 6.7L4 29l7.5-2c1.4.7 2.9 1 4.5 1 6.6 0 12-5.4 12-12S22.6 3 16 3Zm0 22.8c-1.4 0-2.8-.4-4.1-1.1l-.5-.3-4.4 1.2 1.2-4.3-.3-.5a9.6 9.6 0 0 1-1.4-5c0-5.3 4.3-9.6 9.6-9.6s9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6Zm5.3-7.2c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-2.1-1.1-3.4-2.9-3.6-3.3-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6c0-.2-.7-1.7-1-2.4-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6 0-.9.4-.3.3-1.1 1.1-1.1 2.7s1.1 3.2 1.3 3.4c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.8.6.8.2 1.5.1 2 .1.6-.1 1.9-.8 2.1-1.7.3-.9.3-1.6.2-1.7-.2-.2-.4-.3-.7-.5Z"
      />
    </svg>
  );
}

export default function CategoryPage({
  categories = [],
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
      const element = scrollRef.current;
      const scrollAmount = Math.max(element.clientWidth * 0.7, 280);
      element.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
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

  const sendArrivalWhatsAppOrder = (item) => {
    const cartPayload = {
      itemId: `${item.category}__${item.section}__Everyday Edit__${item.name}`,
      cartId: `${item.category}__${item.section}__Everyday Edit__${item.name}__Default__Default`,
      name: item.name,
      price: item.price,
      img: item.img,
      category: item.category,
      section: item.section,
      rowTitle: 'Everyday Edit',
      color: 'Default',
      size: 'Default',
      quantity: 1,
    };

    createOrderFromItems({
      items: [cartPayload],
      authSession,
      subtotal: Number.parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0,
    });
    openWhatsApp(arrivalOrderMessage(item));
  };

  const arrivalOrderMessage = (item) =>
    [
      'Hello Her by Mou,',
      '',
      `I want to order this item: ${item.name}`,
      `Category: ${item.category}`,
      `Section: ${item.section}`,
      `Price: ${item.price}`,
      'Quantity: 1',
    ].join('\n');

  return (
    <div className="category-page">
      <header className="page-top-nav">
        <button
          type="button"
          className="logo logo-home"
          onClick={() => onNavigate('welcome')}
          aria-label="Go to home page"
        >
          <img
            src={theme === 'dark' ? '/bella_dark.png' : '/bella_light.png'}
            alt="Bella logo"
          />
        </button>
        <Navigation
          onNavigate={onNavigate}
          activePage={activePage}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
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
            <div className="eyebrow">Be Bella</div>
            <h1>Skincare at your doorstep.</h1>
            <p>
              Discover the latest makeup and skin care collections in one vibrant place.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() =>
                  arrivalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Browse new arrivals
              </button>
              <button className="secondary-button" onClick={onBack}>
                Back to welcome
              </button>
            </div>
          </div>

          <div className="hero-visual" ref={arrivalsRef}>
            <div className="new-arrivals-track" ref={scrollRef}>
              {arrivals.map((item) => (
                <article key={item.id} className="new-arrival-card">
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

                  <div className="new-arrival-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => addArrivalToCart(item)}
                    >
                      Add to cart
                    </button>
                    <button
                      type="button"
                      className="whatsapp-icon-button"
                      onClick={() => sendArrivalWhatsAppOrder(item)}
                      aria-label={`Order ${item.name} on WhatsApp`}
                    >
                      <WhatsAppIcon />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="arrivals-footer">
              <span className="hero-sticker-label">New arrivals</span>
              <div className="arrivals-arrows">
                <button
                  type="button"
                  className="arr-arrow"
                  onClick={() => scroll('left')}
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="arr-arrow"
                  onClick={() => scroll('right')}
                  aria-label="Next"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}