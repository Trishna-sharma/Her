import React from 'react';

const WHATSAPP_NUMBER = '8801853314954';

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

export default function Footer({ onNavigate }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Website footer">
      <div className="site-footer-grid">
        <section className="site-footer-brand">
          <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
            <img
              src={theme === 'dark' ? '/1.png' : '/2.png'}
              alt="Her by Mou logo"
            />
          </button>
          <p>Premium womenswear curated for events, celebrations, and everyday elegance.</p>
        </section>

        <section className="site-footer-links" aria-label="Quick links">
          <h3>Quick Links</h3>
          <button type="button" onClick={() => onNavigate('gallery')}>Gallery</button>
          <button type="button" onClick={() => onNavigate('category')}>Products</button>
          <button type="button" onClick={() => onNavigate('startshopping')}>Your Cart</button>
          <button type="button" onClick={() => onNavigate('contact')}>Contact</button>
        </section>

        <section className="site-footer-links" aria-label="Support links">
          <h3>Customer Care</h3>
          <p>Order via WhatsApp</p>
          <p>Fast WhatsApp confirmation</p>
          <p>Dhaka, Bangladesh</p>
        </section>

        <section className="site-footer-whatsapp" aria-label="WhatsApp help">
          <h3>Need help choosing?</h3>
          <p>Chat directly with our team and confirm your order details instantly.</p>
          <button
            type="button"
            className="footer-whatsapp-button"
            onClick={() => openWhatsApp('Hello Her by Mou, I want help choosing an outfit.')}
          >
            <span className="footer-whatsapp-icon" aria-hidden="true">
              <WhatsAppIcon />
            </span>
            WhatsApp us
          </button>
          <span className="footer-whatsapp-number">01853314954</span>
        </section>
      </div>

      <div className="site-footer-bottom">
        <p>© {year} Her by Mou. All rights reserved.</p>
        <p>Crafted with style in Bangladesh.</p>
      </div>
    </footer>
  );
}
