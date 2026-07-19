import { categoryData, categoryDetailSections, categorySectionCatalogueRows } from './categoryData.js';

const ADMIN_ITEMS_KEY = 'herby-admin-items';
const DELETED_CATALOGUE_ITEMS_KEY = 'herby-deleted-catalogue-items';
const CATALOGUE_OVERRIDES_KEY = 'herby-catalogue-overrides';

const rowThemes = [
  { label: 'Everyday Edit', namePrefix: 'Everyday', priceDelta: -8 },
  { label: 'Festive Edit', namePrefix: 'Festive', priceDelta: 12 },
  { label: 'Premium Edit', namePrefix: 'Premium', priceDelta: 26 },
];

function readStorage(key, fallback = []) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parsePrice(value) {
  const numeric = Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 99;
}

function formatPrice(num) {
  return `$${Math.max(19, num)}`;
}

function createGeneratedRows(sectionName, sectionItems) {
  if (!sectionItems.length) return [];

  return rowThemes.map((theme, rowIdx) => ({
    title: `${sectionName} - ${theme.label}`,
    items: sectionItems.map((item, itemIdx) => {
      const base = parsePrice(item.price);
      return {
        ...item,
        id: `${rowIdx + 1}-${item.id}`,
        name: `${theme.namePrefix} ${item.name}`,
        price: formatPrice(base + theme.priceDelta + itemIdx * 3),
      };
    }),
  }));
}

export function getAdminItems() {
  return readStorage(ADMIN_ITEMS_KEY, []);
}

export function addAdminItem(item) {
  const existing = getAdminItems();
  writeStorage(ADMIN_ITEMS_KEY, [item, ...existing]);
}

export function removeAdminItem(itemId) {
  const existing = getAdminItems();
  writeStorage(
    ADMIN_ITEMS_KEY,
    existing.filter((item) => item.id !== itemId)
  );
}

export function createCatalogueItemKey({ category, section, rowTitle, name }) {
  return [category, section, rowTitle, name].map(normalizeText).join('::');
}

export function getDeletedCatalogueItemKeys() {
  return new Set(readStorage(DELETED_CATALOGUE_ITEMS_KEY, []));
}

export function isCatalogueItemDeleted(meta) {
  const key = createCatalogueItemKey(meta);
  return getDeletedCatalogueItemKeys().has(key);
}

export function markCatalogueItemDeleted(meta) {
  const key = createCatalogueItemKey(meta);
  const deletedKeys = getDeletedCatalogueItemKeys();
  deletedKeys.add(key);
  writeStorage(DELETED_CATALOGUE_ITEMS_KEY, Array.from(deletedKeys));
}

export function unmarkCatalogueItemDeleted(meta) {
  const key = createCatalogueItemKey(meta);
  const deletedKeys = getDeletedCatalogueItemKeys();
  deletedKeys.delete(key);
  writeStorage(DELETED_CATALOGUE_ITEMS_KEY, Array.from(deletedKeys));
}

export function getCatalogueOverridesObject() {
  try {
    const raw = window.localStorage.getItem(CATALOGUE_OVERRIDES_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getCatalogueItemOverride(meta) {
  const key = createCatalogueItemKey(meta);
  const overrides = getCatalogueOverridesObject();
  return overrides[key] || null;
}

export function upsertCatalogueItemOverride(meta, updates) {
  const key = createCatalogueItemKey(meta);
  const overrides = getCatalogueOverridesObject();

  overrides[key] = {
    ...(overrides[key] || {}),
    ...updates,
  };

  writeStorage(CATALOGUE_OVERRIDES_KEY, overrides);
}

export function clearCatalogueItemOverride(meta) {
  const key = createCatalogueItemKey(meta);
  const overrides = getCatalogueOverridesObject();
  delete overrides[key];
  writeStorage(CATALOGUE_OVERRIDES_KEY, overrides);
}

export function applyCatalogueItemState(meta, item) {
  const key = createCatalogueItemKey(meta);
  const override = getCatalogueItemOverride(meta);
  const deleted = isCatalogueItemDeleted(meta);

  return {
    ...item,
    ...(override || {}),
    __catalogMeta: meta,
    __catalogKey: key,
    __originalName: meta.name,
    isDeleted: deleted,
  };
}

export function mergeAdminItemsIntoSections(baseSections, category) {
  const cloned = Object.entries(baseSections || {}).reduce((acc, [sectionName, items]) => {
    acc[sectionName] = Array.isArray(items) ? [...items] : [];
    return acc;
  }, {});

  const scopedAdminItems = getAdminItems().filter(
    (item) => normalizeText(item.category) === normalizeText(category)
  );

  scopedAdminItems.forEach((item) => {
    const sectionName = String(item.section || 'Admin Picks').trim() || 'Admin Picks';

    if (!cloned[sectionName]) {
      cloned[sectionName] = [];
    }

    cloned[sectionName].push({
      id: `admin-${item.id}`,
      name: item.name,
      price: item.price,
      img: item.img || 'new-arrival.png',
      sizes: item.sizes || '',
      isAdminCreated: true,
    });
  });

  return cloned;
}

export function getSectionsForCategory(category) {
  const configured = categoryDetailSections[category];
  if (configured) {
    return mergeAdminItemsIntoSections(configured, category);
  }

  const fallbackItems = categoryData[category] || [];
  const fallbackSections = fallbackItems.reduce((acc, item, idx) => {
    acc[item.name] = [
      {
        id: idx + 1,
        name: item.name,
        price: item.price,
        img: item.img,
      },
    ];
    return acc;
  }, {});

  return mergeAdminItemsIntoSections(fallbackSections, category);
}

export function getCatalogueRowsForSection(category, sectionName) {
  const sections = getSectionsForCategory(category);
  const items = sections[sectionName] || [];
  const explicitRows = categorySectionCatalogueRows[category]?.[sectionName] || null;

  if (!explicitRows) {
    return createGeneratedRows(sectionName, items);
  }

  const adminItems = items.filter((item) => item.isAdminCreated);
  const adminRows = adminItems.length
    ? [{ title: `${sectionName} - Admin Picks`, items: adminItems }]
    : [];

  return [
    ...explicitRows.map((row) => ({ ...row, items: [...row.items] })),
    ...adminRows,
  ];
}

export function listAllWebsiteItems() {
  const catalogueItems = [];

  Object.keys(categoryData).forEach((category) => {
    const sections = getSectionsForCategory(category);

    Object.keys(sections).forEach((sectionName) => {
      const rows = getCatalogueRowsForSection(category, sectionName);

      rows.forEach((row) => {
        row.items.forEach((item) => {
          const meta = {
            category,
            section: sectionName,
            rowTitle: row.title,
            name: item.name,
          };

          const liveItem = applyCatalogueItemState(meta, item);

          catalogueItems.push({
            key: liveItem.__catalogKey,
            meta,
            category,
            section: sectionName,
            rowTitle: row.title,
            originalName: item.name,
            name: liveItem.name,
            price: liveItem.price,
            img: liveItem.img || 'new-arrival.png',
            saleTag: liveItem.saleTag || '',
            isDeleted: liveItem.isDeleted,
          });
        });
      });
    });
  });

  return catalogueItems;
}
