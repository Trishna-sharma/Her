import axios from 'axios';

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packing', label: 'Packing' },
  { value: 'delivery_2d', label: 'Out for delivery (2 days)' },
  { value: 'delivered', label: 'Successfully delivered' },
];

function getApiBase() {
  const rawBase = import.meta.env.VITE_API_URL || 'https://bella-liliac-backend.vercel.app/';
  return rawBase.replace(/\/+$/, '');
}

function authHeaders(authSession) {
  const token = authSession?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function buildProductKey({ category, section, rowTitle, name }) {
  return [category, section, rowTitle, name].map(normalizeText).join('::');
}

// ---- Ratings summary cache -------------------------------------------------
// getProductReviewStats() is called synchronously in a lot of render code
// (CategoryDetail.jsx's buildProductDetails). To avoid rewriting every call
// site to be async, we keep a small in-memory cache that's populated by
// fetchRatingsSummary() and read synchronously afterwards. Call
// fetchRatingsSummary() once near app start (e.g. in App.jsx's useEffect);
// until it resolves, getProductReviewStats() just returns null, same as the
// old "no rating yet" fallback already handled by every caller.
let ratingsCache = {};

export async function fetchRatingsSummary() {
  try {
    const response = await axios.get(`${getApiBase()}/api/orders/ratings-summary`);
    ratingsCache = response?.data?.summary || {};
  } catch (error) {
    console.error('Failed to load ratings summary:', error);
  }
  return ratingsCache;
}

export function getProductReviewStats(productKey) {
  const stats = ratingsCache[productKey];
  if (!stats) return null;
  return { rating: stats.rating, reviews: stats.reviews };
}

// ---- Orders -----------------------------------------------------------------

// Creates an order. Works for guests (no authSession) and logged-in users.
export async function createOrderFromItems({ items = [], authSession = null, subtotal = 0 }) {
  const response = await axios.post(
    `${getApiBase()}/api/orders`,
    { items, subtotal },
    { headers: authHeaders(authSession) }
  );
  return response.data.order;
}

export async function createOrderFromCart({ cartItems = [], authSession = null, subtotal = 0 }) {
  return createOrderFromItems({ items: cartItems, authSession, subtotal });
}

// Customer's own order history (non-archived). Requires a logged-in session;
// guests won't have order history to look back up (matches old guest-only
// localStorage filter, which only worked because it was all one browser).
export async function getCustomerOrders(authSession) {
  if (!authSession?.token) return [];

  try {
    const response = await axios.get(`${getApiBase()}/api/orders/mine`, {
      headers: authHeaders(authSession),
    });
    return response.data.orders || [];
  } catch (error) {
    console.error('Failed to load customer orders:', error);
    return [];
  }
}

// Admin-only: every active order. Requires an admin authSession.token.
export async function listOrders(authSession) {
  try {
    const response = await axios.get(`${getApiBase()}/api/orders`, {
      headers: authHeaders(authSession),
    });
    return response.data.orders || [];
  } catch (error) {
    console.error('Failed to load orders:', error);
    return [];
  }
}

// Admin-only: Confirm / Packing / Delivery in 2 days / Mark delivered,
// optionally with a status note.
export async function updateOrderStatus(orderId, nextStatus, statusNote, authSession) {
  const response = await axios.patch(
    `${getApiBase()}/api/orders/${orderId}/status`,
    { status: nextStatus, statusNote },
    { headers: authHeaders(authSession) }
  );
  return response.data.order;
}

// Admin-only: archive an order (soft delete). This is the only way to
// archive now — there is no customer-facing path to this endpoint at all.
export async function archiveOrder(orderId, authSession) {
  const response = await axios.patch(
    `${getApiBase()}/api/orders/${orderId}/archive`,
    {},
    { headers: authHeaders(authSession) }
  );
  return response.data.order;
}

// Logged-in customer rates one item on their own delivered order.
export async function rateDeliveredOrderItem(orderId, itemCartId, ratingValue, authSession) {
  try {
    await axios.patch(
      `${getApiBase()}/api/orders/${orderId}/rate`,
      { cartId: itemCartId, rating: ratingValue },
      { headers: authHeaders(authSession) }
    );
    // Refresh the cache so any visible star ratings update without a full reload.
    fetchRatingsSummary();
    return true;
  } catch (error) {
    console.error('Failed to submit rating:', error);
    return false;
  }
}