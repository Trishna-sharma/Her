import React, { useMemo, useState } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';

const WHATSAPP_NUMBER = '8801853314954';

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function parsePrice(value) {
  const numeric = Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function Startshopping({
  onNavigate,
  activePage,
  onLoginClick,
  authSession,
  cartItems = [],
  wishlistItems = [],
  onToggleWishlist,
  onUpdateCartItemQuantity,
  onRemoveCartItem,
  onMoveWishlistItemToCart,
  theme,
  onToggleTheme,
}) {
  const [activeTab, setActiveTab] = useState('cart');

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0),
    [cartItems]
  );

  const orderSingleMessage = (item) => [
    'Hello Her by Mou,',
    '',
    'I would like to confirm this order from my saved cart:',
    `Item: ${item.name}`,
    `Category: ${item.category}`,
    `Section: ${item.section}`,
    `Color: ${item.color}`,
    `Size: ${item.size}`,
    `Quantity: ${item.quantity}`,
    `Price: ${item.price}`,
  ].join('\n');

  const orderAllMessage = () => {
    const lines = [
      'Hello Her by Mou,',
      '',
      'I would like to confirm all items from my saved cart:',
      '',
    ];

    cartItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name}`);
      lines.push(`   Category: ${item.category} / ${item.section}`);
      lines.push(`   Color: ${item.color} | Size: ${item.size}`);
      lines.push(`   Quantity: ${item.quantity} | Price: ${item.price}`);
      lines.push('');
    });

    lines.push(`Estimated subtotal: $${cartTotal}`);
    return lines.join('\n');
  };

  return (
    <div className="startshopping-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} theme={theme} onToggleTheme={onToggleTheme} />
        <AuthStatusButton authSession={authSession} onClick={onLoginClick} />
      </header>

      <main className="startshopping-main">
        <section className="startshopping-tabs" aria-label="Shopping subpages">
          <button
            type="button"
            className={`startshopping-tab ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveTab('cart')}
          >
            Cart Items ({cartItems.length})
          </button>
          <button
            type="button"
            className={`startshopping-tab ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('wishlist')}
          >
            Wishlist ({wishlistItems.length})
          </button>
        </section>

        {activeTab === 'cart' ? (
          <section className="saved-items-panel" aria-label="Cart items">
            {cartItems.length === 0 ? (
              <div className="saved-empty-state">
                <h2>Your cart is empty.</h2>
                <p>Add items from category detail pages and they will appear here.</p>
                <button type="button" className="primary-button" onClick={() => onNavigate('gallery')}>
                  Browse collections
                </button>
              </div>
            ) : (
              <>
                <div className="saved-items-list">
                  {cartItems.map((item) => (
                    <article key={item.cartId} className="saved-item-card">
                      <div className="saved-item-image">
                        <img src={item.img} alt={item.name} />
                      </div>

                      <div className="saved-item-body">
                        <h2>{item.name}</h2>
                        <p className="saved-item-meta">{item.category} / {item.section}</p>
                        <p className="saved-item-meta">Color: {item.color} • Size: {item.size}</p>
                        <p className="saved-item-price">{item.price}</p>

                        <div className="saved-item-actions">
                          <div className="saved-qty-control">
                            <button
                              type="button"
                              onClick={() => onUpdateCartItemQuantity(item.cartId, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateCartItemQuantity(item.cartId, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => openWhatsApp(orderSingleMessage(item))}
                          >
                            Order on WhatsApp
                          </button>

                          <button
                            type="button"
                            className="startshopping-remove"
                            onClick={() => onRemoveCartItem(item.cartId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="saved-items-footer">
                  <strong>Estimated subtotal: ${cartTotal}</strong>
                  <button type="button" className="primary-button" onClick={() => openWhatsApp(orderAllMessage())}>
                    Confirm all on WhatsApp
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="saved-items-panel" aria-label="Wishlist items">
            {wishlistItems.length === 0 ? (
              <div className="saved-empty-state">
                <h2>Your wishlist is empty.</h2>
                <p>Tap the heart icon on products to save them for later.</p>
                <button type="button" className="primary-button" onClick={() => onNavigate('gallery')}>
                  Explore products
                </button>
              </div>
            ) : (
              <div className="saved-items-list">
                {wishlistItems.map((item) => (
                  <article key={item.itemId} className="saved-item-card">
                    <div className="saved-item-image">
                      <img src={item.img} alt={item.name} />
                    </div>

                    <div className="saved-item-body">
                      <h2>{item.name}</h2>
                      <p className="saved-item-meta">{item.category} / {item.section}</p>
                      <p className="saved-item-price">{item.price}</p>

                      <div className="saved-item-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => onMoveWishlistItemToCart(item.itemId)}
                        >
                          Move to cart
                        </button>
                        <button
                          type="button"
                          className="startshopping-remove"
                          onClick={() => onToggleWishlist(item)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
