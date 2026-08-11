import React, { useEffect, useMemo, useState } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';
import {
  ORDER_STATUSES,
  createOrderFromCart,
  createOrderFromItems,
  listOrders,
  rateDeliveredOrderItem,
} from '../data/orderStore.js';

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

  const createSingleItemOrder = (item) => {
    createOrderFromItems({
      items: [item],
      authSession,
      subtotal: parsePrice(item.price) * item.quantity,
    });
  };

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
                            className="product-whatsapp-button"
                            onClick={() => {
                              createSingleItemOrder(item);
                              loadOrderHistory();
                              openWhatsApp(orderSingleMessage(item));
                            }}
                            aria-label="Order on WhatsApp"
                          >
                            <WhatsAppIcon />
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
                    <p className="saved-orders-caption">Your order status updates here after admin confirms packing, delivery, or completion.</p>
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