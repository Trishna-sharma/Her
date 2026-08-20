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
  const token = authSession?.token || (typeof authSession === 'string' ? authSession : null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function buildProductKey({ category, section, rowTitle, name }) {
  return [category, section, rowTitle, name].map(normalizeText).join('::');
}

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

// Fallback order creator: Creates order on server or generates a local tracking record if backend fails/unauthenticated
export async function createOrderFromItems({ items = [], authSession = null, subtotal = 0 }) {
  const headers = authHeaders(authSession);
  const payload = {
    items: items.map(item => ({
      cartId: item.cartId || item.itemId || String(Date.now()),
      name: item.name,
      category: item.category || '',
      section: item.section || '',
      color: item.color || '',
      size: item.size || '',
      quantity: item.quantity || 1,
      price: item.price,
      img: item.img || '',
    })),
    subtotal,
  };

  try {
    const response = await axios.post(`${getApiBase()}/api/orders`, payload, { headers });
    return response.data?.order || response.data;
  } catch (error) {
    console.warn('Backend order logging failed. Generating local fallback order code:', error);
    // Return a valid mock order object so WhatsApp checkout never breaks
    const fallbackCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      orderCode: fallbackCode,
      _id: fallbackCode,
      status: 'pending',
      items: payload.items,
      subtotal,
    };
  }
}

export async function createOrderFromCart({ cartItems = [], authSession = null, subtotal = 0 }) {
  return createOrderFromItems({ items: cartItems, authSession, subtotal });
}

export async function getCustomerOrders(authSession) {
  if (!authSession?.token) return [];

  try {
    const response = await axios.get(`${getApiBase()}/api/orders/mine`, {
      headers: authHeaders(authSession),
    });
    return response.data?.orders || response.data || [];
  } catch (error) {
    console.error('Failed to load customer orders:', error);
    return [];
  }
}

export async function listOrders(authSession) {
  try {
    const response = await axios.get(`${getApiBase()}/api/orders`, {
      headers: authHeaders(authSession),
    });
    return response.data?.orders || response.data || [];
  } catch (error) {
    console.error('Failed to load orders:', error);
    return [];
  }
}

export async function updateOrderStatus(orderId, nextStatus, statusNote, authSession) {
  const response = await axios.patch(
    `${getApiBase()}/api/orders/${orderId}/status`,
    { status: nextStatus, statusNote },
    { headers: authHeaders(authSession) }
  );
  return response.data?.order || response.data;
}

export async function archiveOrder(orderId, authSession) {
  const response = await axios.patch(
    `${getApiBase()}/api/orders/${orderId}/archive`,
    {},
    { headers: authHeaders(authSession) }
  );
  return response.data?.order || response.data;
}

export async function rateDeliveredOrderItem(orderId, itemCartId, ratingValue, authSession) {
  try {
    await axios.patch(
      `${getApiBase()}/api/orders/${orderId}/rate`,
      { cartId: itemCartId, rating: ratingValue },
      { headers: authHeaders(authSession) }
    );
    fetchRatingsSummary();
    return true;
  } catch (error) {
    console.error('Failed to submit rating:', error);
    return false;
  }
}