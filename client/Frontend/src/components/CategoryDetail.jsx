import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navigation from './Navigation.jsx';
import { categoryData } from '../data/categoryData.js';
import AuthStatusButton from './AuthStatusButton.jsx';
import {
  applyCatalogueItemState,
  getCatalogueRowsForSection,
  getSectionsForCategory,
  markCatalogueItemDeleted,
} from '../data/catalogAdminStore.js';
import { buildProductKey, createOrderFromItems, getProductReviewStats } from '../data/orderStore.js';

const WHATSAPP_NUMBER = '8801853314954';

function buildProductDetails(item, rowTitle, category, section) {
  const nameSeed = item.name.length;
  const parsedRating = Number.parseFloat(item.rating);
  const parsedStock = item.stock !== undefined && item.stock !== null && String(item.stock).trim() !== ''
    ? Number.parseInt(item.stock, 10)
    : null;
  const liveReview = getProductReviewStats(
    buildProductKey({ category, section, rowTitle, name: item.name })
  );

  return {
    ...item,
    rowTitle,
    rating: liveReview?.rating || (Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : (4 + (nameSeed % 8) / 10)),
    reviews: liveReview?.reviews || item.reviews || 80 + nameSeed * 3,
    description:
      (item.description && item.description.trim()) ||
      `${item.name} is available now — reach out for full details on this item.`,
    colors: Array.isArray(item.colors) && item.colors.length ? item.colors : [],
    sizes: Array.isArray(item.sizes) && item.sizes.length ? item.sizes : [],
    gallery: Array.isArray(item.gallery) && item.gallery.length
      ? item.gallery
      : [item.img, item.img, item.img, item.img],
    stock: Number.isFinite(parsedStock) ? parsedStock : null,
  };
}

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

export default function CategoryDetail({
  category,
  selectedSection,
  onNavigate,
  activePage,
  onLoginClick,
  authSession,
  theme,
  onToggleTheme,
  wishlistItems = [],
  onToggleWishlist = () => {},
  onAddCartItem = () => {},
}) {
  const rowRefs = useRef({});
  const [catalogueVersion, setCatalogueVersion] = useState(0);
  const canManageCatalogue = authSession?.role === 'admin';

  const sections = useMemo(() => {
    return getSectionsForCategory(category);
  }, [category, catalogueVersion]);

  const sectionNames = useMemo(() => Object.keys(sections), [sections]);
  const [activeSection, setActiveSection] = useState(sectionNames[0] || '');

  useEffect(() => {
    if (selectedSection && sections[selectedSection]) {
      setActiveSection(selectedSection);
      return;
    }

    setActiveSection(sectionNames[0] || '');
  }, [category, selectedSection, sections]);

  const baseRows = useMemo(
    () => getCatalogueRowsForSection(category, activeSection),
    [category, activeSection, catalogueVersion]
  );

  const catalogueRows = useMemo(
    () => baseRows
      .map((row) => ({
        ...row,
        items: row.items
          .map((item) => applyCatalogueItemState(
            {
              category,
              section: activeSection,
              rowTitle: row.title,
              name: item.name,
            },
            item
          ))
          .filter((item) => !item.isDeleted),
      }))
      .filter((row) => row.items.length > 0),
    [baseRows, category, activeSection, catalogueVersion]
  );
  const totalCatalogueItems = catalogueRows.reduce((acc, row) => acc + row.items.length, 0);
  const heroTitle = activeSection || category || 'Category';
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((item) => item.itemId)),
    [wishlistItems]
  );

  useEffect(() => {
    setSelectedProduct(null);
    setSelectedImageIndex(0);
    setSelectedColor('');
    setSelectedSize('');
    setQuantity(1);
  }, [category, activeSection]);

  const createItemPayload = (item, rowTitle, color, size, qty = 1) => {
    const itemId = `${category}__${activeSection}__${rowTitle}__${item.name}`;
    const safeColor = color || 'Default';
    const safeSize = size || 'Default';

    return {
      itemId,
      cartId: `${itemId}__${safeColor}__${safeSize}`,
      name: item.name,
      price: item.price,
      img: item.img,
      category,
      section: activeSection,
      rowTitle,
      color: safeColor,
      size: safeSize,
      quantity: qty,
    };
  };

  const openProduct = (item, rowTitle) => {
    const built = buildProductDetails(item, rowTitle, category, activeSection);
    setSelectedProduct(built);
    setSelectedImageIndex(0);
    setSelectedColor(built.colors[0] || 'Default');
    setSelectedSize(built.sizes[0] || 'Default');
    setQuantity(1);
  };

  const handleAdminDeleteProduct = (event, item, rowTitle) => {
    event.stopPropagation();
    if (!canManageCatalogue) return;

    markCatalogueItemDeleted(item.__catalogMeta || {
      category,
      section: activeSection,
      rowTitle,
      name: item.name,
    });

    if (selectedProduct?.name === item.name && selectedProduct?.rowTitle === rowTitle) {
      setSelectedProduct(null);
    }

    setCatalogueVersion((value) => value + 1);
  };

  const orderMessage = (item, rowTitle) => (
    [
      'Hello Her by Mou,',
      '',
      `I want to order this item: ${item.name}`,
      `Category: ${category}`,
      `Section: ${activeSection}`,
      `Collection row: ${rowTitle}`,
      `Price: ${item.price}`,
      `Selected color: ${selectedColor || '-'}`,
      `Selected size: ${selectedSize || '-'}`,
      `Quantity: ${quantity}`,
      '',
      'Please help me with available colors, sizes, and order confirmation on WhatsApp.',
    ].join('\n')
  );

  const sendModalWhatsAppOrder = () => {
    const payload = createItemPayload(
      selectedProduct,
      selectedProduct.rowTitle,
      selectedColor,
      selectedSize,
      quantity
    );

    createOrderFromItems({
      items: [payload],
      authSession,
      subtotal: Number.parseInt(String(selectedProduct.price).replace(/[^0-9]/g, ''), 10) * quantity || 0,
    });
    openWhatsApp(orderMessage(selectedProduct, selectedProduct.rowTitle));
  };

  const scrollRow = (rowTitle, direction) => {
    const target = rowRefs.current[rowTitle];
    if (!target) return;

    const firstCard = target.querySelector('.category-card');
    const styles = window.getComputedStyle(target);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const scrollAmount = firstCard
      ? firstCard.getBoundingClientRect().width + gap
      : Math.max(260, target.clientWidth * 0.82);

    target.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="category-detail-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <img
            src={theme === 'dark' ? '/bella_dark.png' : '/bella_light.png'}
            alt="Bellalogo"
          />
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} theme={theme} onToggleTheme={onToggleTheme} />
        <AuthStatusButton authSession={authSession} onClick={onLoginClick} />
      </header>

      <main className="category-detail-main">
        <div className="category-detail-hero">
          <div>
            <h1>
              {heroTitle} <span className="category-detail-inline-count">({totalCatalogueItems} items)</span>
            </h1>
            <p className="category-detail-description">
              Explore curated {heroTitle.toLowerCase()} catalogues inside this sub page.
            </p>
            {canManageCatalogue && (
              <p className="category-admin-note">Admin mode: Delete item is enabled on each product card.</p>
            )}
          </div>
          <div className="category-detail-summary">
            <button className="category-back-btn" onClick={() => onNavigate('gallery', category)}>
              Back to gallery
            </button>
          </div>
        </div>

        <section className="category-detail-tabs" aria-label="Sub categories">
          {sectionNames.map((sectionName) => (
            <button
              key={sectionName}
              type="button"
              className={`category-detail-tab ${sectionName === activeSection ? 'active' : ''}`}
              onClick={() => setActiveSection(sectionName)}
            >
              {sectionName}
            </button>
          ))}
        </section>

        <section className="category-catalogue-rows">
          {catalogueRows.length === 0 ? (
            <div className="saved-empty-state">
              <h2>No items available in this section.</h2>
              <p>
                {canManageCatalogue
                  ? 'All items are removed. Add products from the admin portal.'
                  : 'Please choose another section or category.'}
              </p>
            </div>
          ) : catalogueRows.map((row) => (
            <div key={row.title} className="category-catalogue-row">
              <div className="category-catalogue-row-head">
                <h2>{row.title}</h2>
                <span>{row.items.length} catalogues</span>
              </div>

              <div className="category-row-scroll-shell">
                <div
                  ref={(element) => {
                    rowRefs.current[row.title] = element;
                  }}
                  className="category-card-grid scrollable"
                >
                {row.items.map((item) => (
                  <article
                    key={`${row.title}-${item.__catalogKey || item.id}`}
                    className="category-card"
                    onClick={() => openProduct(item, row.title)}
                  >
                    <div className="category-card-image">
                      <img src={item.img} alt={item.name} />
                    </div>
                    <div className="category-card-body">
                      <h2>{item.name}</h2>
                      <p>{item.price}</p>
                      {item.saleTag && <p className="category-sale-pill">{item.saleTag}</p>}
                      <div className="category-card-actions">
                        <button
                          className="primary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openProduct(item, row.title);
                          }}
                        >
                          Add to cart
                        </button>
                        <button
                          type="button"
                          className={`wishlist-btn ${wishlistIds.has(createItemPayload(item, row.title).itemId) ? 'active' : ''}`}
                          aria-label="Add to wishlist"
                          onClick={(event) => {
                            event.stopPropagation();
                            const details = buildProductDetails(item, row.title, category, activeSection);
                            onToggleWishlist(
                              createItemPayload(
                                details,
                                row.title,
                                details.colors?.[0] || 'Default',
                                details.sizes?.[0] || 'Default',
                                1
                              )
                            );
                          }}
                        >
                          {wishlistIds.has(createItemPayload(item, row.title).itemId) ? '♥' : '♡'}
                        </button>
                        {canManageCatalogue && (
                          <button
                            type="button"
                            className="startshopping-remove"
                            onClick={(event) => handleAdminDeleteProduct(event, item, row.title)}
                          >
                            Delete item
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                </div>

                {row.items.length > 1 && (
                  <div className="row-controls">
                    <button
                      type="button"
                      className="row-nav-btn"
                      onClick={() => scrollRow(row.title, 'left')}
                      aria-label={`Scroll ${row.title} left`}
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="row-nav-btn"
                      onClick={() => scrollRow(row.title, 'right')}
                      aria-label={`Scroll ${row.title} right`}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        {selectedProduct && (
          <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="product-modal" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="product-modal-close"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close product details"
              >
                ×
              </button>

              <div className="product-modal-gallery">
                <div className="product-modal-main-image">
                  <img
                    src={selectedProduct.gallery[selectedImageIndex]}
                    alt={`${selectedProduct.name} preview ${selectedImageIndex + 1}`}
                  />
                </div>
                <div className="product-modal-thumbs">
                  {selectedProduct.gallery.map((imgSrc, index) => (
                    <button
                      key={`${selectedProduct.name}-thumb-${index}`}
                      type="button"
                      className={`product-modal-thumb ${index === selectedImageIndex ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={imgSrc} alt={`${selectedProduct.name} thumbnail ${index + 1}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="product-modal-content">
                <p className="product-modal-row">{selectedProduct.rowTitle}</p>
                <h3>{selectedProduct.name}</h3>
                <p className="product-modal-price">{selectedProduct.price}</p>
                <p className="product-modal-meta">
                  Rating {selectedProduct.rating.toFixed(1)} / 5 • {selectedProduct.reviews} reviews
                </p>
                {selectedProduct.stock !== null && (
                  <p className={`product-modal-stock ${selectedProduct.stock > 0 ? '' : 'out'}`}>
                    {selectedProduct.stock > 0
                      ? `${selectedProduct.stock} available in stock`
                      : 'Out of stock'}
                  </p>
                )}
                <p className="product-modal-description">{selectedProduct.description}</p>

                {selectedProduct.colors.length > 0 && (
                  <div className="product-modal-block">
                    <span>Colors</span>
                    <div className="product-chip-list">
                      {selectedProduct.colors.map((color) => (
                        <button
                          key={`${selectedProduct.name}-${color}`}
                          type="button"
                          className={`product-chip ${selectedColor === color ? 'active' : ''}`}
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProduct.sizes.length > 0 && (
                  <div className="product-modal-block">
                    <span>Sizes</span>
                    <div className="product-chip-list">
                      {selectedProduct.sizes.map((size) => (
                        <button
                          key={`${selectedProduct.name}-${size}`}
                          type="button"
                          className={`product-chip ${selectedSize === size ? 'active' : ''}`}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="product-modal-block">
                  <span>Quantity</span>
                  <div className="product-qty-control">
                    <button
                      type="button"
                      className="product-qty-btn"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="product-qty-value">{quantity}</span>
                    <button
                      type="button"
                      className="product-qty-btn"
                      onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="product-modal-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      !selectedColor ||
                      !selectedSize ||
                      quantity < 1 ||
                      selectedProduct.stock === 0
                    }
                    onClick={() => {
                      onAddCartItem(
                        createItemPayload(
                          selectedProduct,
                          selectedProduct.rowTitle,
                          selectedColor,
                          selectedSize,
                          quantity
                        )
                      );
                    }}
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    className="product-whatsapp-button"
                    onClick={sendModalWhatsAppOrder}
                    aria-label="Order on WhatsApp"
                  >
                    <WhatsAppIcon />
                  </button>
                  <button
                    type="button"
                    className={`wishlist-btn large ${wishlistIds.has(createItemPayload(selectedProduct, selectedProduct.rowTitle).itemId) ? 'active' : ''}`}
                    onClick={() => onToggleWishlist(createItemPayload(selectedProduct, selectedProduct.rowTitle, selectedColor, selectedSize, 1))}
                  >
                    {wishlistIds.has(createItemPayload(selectedProduct, selectedProduct.rowTitle).itemId) ? '♥ Saved' : '♡ Wishlist'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}