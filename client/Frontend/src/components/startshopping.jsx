import React, { useEffect, useMemo, useState } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';
import {
  ORDER_STATUSES,
  createOrderFromCart,
  listOrders,
  rateDeliveredOrderItem,
} from '../data/orderStore.js';

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
  const [orderHistory, setOrderHistory] = useState([]);
  const [ratingDrafts, setRatingDrafts] = useState({});

  const loadOrderHistory = () => {
    const allOrders = listOrders();

    if (authSession?.email) {
      const scoped = allOrders.filter((order) => String(order.customerEmail || '').toLowerCase() === String(authSession.email || '').toLowerCase());
      setOrderHistory(scoped);
      return;
    }

    const guestOnly = allOrders.filter((order) => !order.customerEmail);
    setOrderHistory(guestOnly);
  };

  useEffect(() => {
    loadOrderHistory();
  }, [authSession]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0),
    [cartItems]
  );

  const orderSingleMessage = (item) => [
    'Hello Bella,',
    '',
    'I would like to confirm this order:',
    `Item: ${item.name}`,
    item.category && `Category: ${item.category}`,
    item.section && `Section: ${item.section}`,
    item.color && `Color: ${item.color}`,
    item.size && `Size: ${item.size}`,
    `Quantity: ${item.quantity}`,
    `Price: ${item.price}`,
  ]
  .filter(Boolean) // Removes false, null, undefined, or empty strings
  .join('\n');

  const orderAllMessage = (orderId = '') => {
    const header = [
      'Hello Bella,',
      '',
      'I would like to confirm all items from my saved cart:',
      orderId ? `Order ID: ${orderId}` : '',
      '',
    ];

    const formattedItems = cartItems.map((item, index) => {
      return [
        `${index + 1}. Item: ${item.name}`,
        item.category && `   Category: ${item.category}`,
        item.section && `   Section: ${item.section}`,
        item.color && `   Color: ${item.color}`,
        item.size && `   Size: ${item.size}`,
        `   Quantity: ${item.quantity}`,
        `   Price: ${item.price}`,
      ]
      .filter(Boolean)
      .join('\n');
    });

    const footer = `\nEstimated subtotal: $${cartTotal}`;

    return [...header, formattedItems.join('\n\n'), footer].join('\n');
  };

  const createWhatsAppOrder = () => {
    if (cartItems.length === 0) return;

    const createdOrder = createOrderFromCart({
      cartItems,
      authSession,
      subtotal: cartTotal,
    });

    loadOrderHistory();
    openWhatsApp(orderAllMessage(createdOrder.id));
  };

  const orderStatusLabel = (status) => {
    return ORDER_STATUSES.find((item) => item.value === status)?.label || status;
  };

  const submitRating = (orderId, cartId) => {
    const key = `${orderId}__${cartId}`;
    const rating = ratingDrafts[key];
    const ok = rateDeliveredOrderItem(orderId, cartId, rating);
    if (!ok) return;

    setRatingDrafts((prev) => ({ ...prev, [key]: '' }));
    loadOrderHistory();
  };

  return (
    <div className="startshopping-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <img
            src={theme === 'dark' ? '/bella_dark.png' : '/bella_light.png'}
            alt="Bella LOGO"
          />
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
                  <button type="button" className="primary-button" onClick={createWhatsAppOrder}>
                    Confirm all on WhatsApp
                  </button>
                </div>

                {orderHistory.length > 0 && (
                  <div className="saved-orders-history" aria-label="Order history">
                    <h3>Your recent orders</h3>
                    {orderHistory.map((order) => (
                      <article key={order.id} className="saved-order-card">
                        <div className="saved-order-head">
                          <strong>{order.id}</strong>
                          <span>{orderStatusLabel(order.status)}</span>
                        </div>
                        {order.statusNote && <p className="saved-order-note">{order.statusNote}</p>}

                        <div className="saved-order-items">
                          {(order.items || []).map((item) => {
                            const ratingKey = `${order.id}__${item.cartId}`;
                            return (
                              <div key={ratingKey} className="saved-order-item-line">
                                <span>{item.name} x {item.quantity}</span>
                                {order.status === 'delivered' && item.userRating === null && (
                                  <div className="saved-order-rate">
                                    <select
                                      value={ratingDrafts[ratingKey] || ''}
                                      onChange={(event) => setRatingDrafts((prev) => ({
                                        ...prev,
                                        [ratingKey]: event.target.value,
                                      }))}
                                    >
                                      <option value="">Rate</option>
                                      <option value="5">5</option>
                                      <option value="4">4</option>
                                      <option value="3">3</option>
                                      <option value="2">2</option>
                                      <option value="1">1</option>
                                    </select>
                                    <button type="button" onClick={() => submitRating(order.id, item.cartId)}>
                                      Submit
                                    </button>
                                  </div>
                                )}

                                {item.userRating !== null && <small>Rated {item.userRating}/5</small>}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
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