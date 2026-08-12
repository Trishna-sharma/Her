const ORDERS_KEY = 'herby-order-requests';
const ARCHIVED_ORDERS_KEY = 'herby-archived-orders';
const PRODUCT_RATINGS_KEY = 'herby-product-ratings';

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packing', label: 'Packing' },
  { value: 'delivery_2d', label: 'Out for delivery (2 days)' },
  { value: 'delivered', label: 'Successfully delivered' },
];

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function buildProductKey({ category, section, rowTitle, name }) {
  return [category, section, rowTitle, name].map(normalizeText).join('::');
}

export function listOrders() {
  const parsed = readJson(ORDERS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

// Returns active, non-archived orders (filtered by customer email if provided)
export function getCustomerOrders(authEmail = '') {
  const allOrders = listOrders();
  return allOrders.filter((order) => {
    const isArchived = order.status === 'archived';
    const belongsToUser = !authEmail || normalizeText(order.customerEmail) === normalizeText(authEmail);
    return !isArchived && belongsToUser;
  });
}

export function writeOrders(nextOrders) {
  writeJson(ORDERS_KEY, nextOrders);
}

export function listArchivedOrders() {
  const parsed = readJson(ARCHIVED_ORDERS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function createOrderId() {
  const now = new Date();
  return `HBM-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function buildOrderItems(orderItems = []) {
  return orderItems.map((item) => ({
    itemId: item.itemId,
    cartId: item.cartId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    category: item.category,
    section: item.section,
    rowTitle: item.rowTitle || 'Everyday Edit',
    color: item.color || 'Default',
    size: item.size || 'Default',
    productKey: buildProductKey({
      category: item.category,
      section: item.section,
      rowTitle: item.rowTitle || 'Everyday Edit',
      name: item.name,
    }),
    userRating: null,
  }));
}

export function createOrderFromItems({ items = [], authSession = null, subtotal = 0 }) {
  const id = createOrderId();
  const customerName = authSession?.name || authSession?.email || 'Guest customer';
  const customerEmail = authSession?.email || '';

  const order = {
    id,
    createdAt: new Date().toISOString(),
    customerName,
    customerEmail,
    status: 'pending',
    statusNote: '',
    subtotal,
    items,
  };

  const existing = listOrders();
  writeOrders([order, ...existing]);
  return order;
}

export function createOrderFromCart({ cartItems = [], authSession = null, subtotal = 0 }) {
  return createOrderFromItems({ items: cartItems, authSession, subtotal });
}

export function updateOrderStatus(orderId, nextStatus, statusNote = '') {
  // If set to archived, route directly through removeOrder to shift to ARCHIVED_ORDERS_KEY
  if (nextStatus === 'archived') {
    removeOrder(orderId);
    return;
  }

  const existing = listOrders();
  const updated = existing.map((order) => (
    order.id === orderId
      ? {
          ...order,
          status: nextStatus,
          statusNote: statusNote || order.statusNote || '',
          updatedAt: new Date().toISOString(),
        }
      : order
  ));

  writeOrders(updated);
}

export function removeOrder(orderId) {
  const existing = listOrders();
  const target = existing.find((o) => o.id === orderId);
  if (!target) return;

  const remaining = existing.filter((o) => o.id !== orderId);
  writeOrders(remaining);

  const archived = listArchivedOrders();
  const docLogEntry = {
    ...target,
    archivedAt: new Date().toISOString(),
    archiveReason: 'Order removed/archived by Admin',
  };
  writeJson(ARCHIVED_ORDERS_KEY, [docLogEntry, ...archived]);
}

function getRatingsMap() {
  const parsed = readJson(PRODUCT_RATINGS_KEY, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed;
}

function writeRatingsMap(map) {
  writeJson(PRODUCT_RATINGS_KEY, map);
}

export function getProductReviewStats(productKey) {
  const ratings = getRatingsMap();
  const stats = ratings[productKey];
  if (!stats || !stats.count || !stats.total) {
    return null;
  }

  return {
    rating: stats.total / stats.count,
    reviews: stats.count,
  };
}

export function rateDeliveredOrderItem(orderId, itemCartId, ratingValue) {
  const numericRating = Number.parseFloat(ratingValue);
  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) return false;

  let updatedProductKey = '';
  const existingOrders = listOrders();
  const updatedOrders = existingOrders.map((order) => {
    if (order.id !== orderId || order.status !== 'delivered') return order;

    const nextItems = (order.items || []).map((item) => {
      if (item.cartId !== itemCartId || item.userRating !== null) return item;
      updatedProductKey = item.productKey;
      return {
        ...item,
        userRating: numericRating,
      };
    });

    return {
      ...order,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!updatedProductKey) return false;

  writeOrders(updatedOrders);

  const ratings = getRatingsMap();
  const current = ratings[updatedProductKey] || { total: 0, count: 0 };
  ratings[updatedProductKey] = {
    total: current.total + numericRating,
    count: current.count + 1,
  };
  writeRatingsMap(ratings);

  return true;
}