import React, { useMemo, useState } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';
import { getCatalogueRowsForSection, getSectionsForCategory, applyCatalogueItemState } from './catalogAdminStore.js';

export default function CategoryDetail({
  category,
  categories,
  onSelectCategory,
  onNavigate,
  activePage,
  onLoginClick,
  authSession,
  wishlistItems = [],
  onToggleWishlist,
  onAddCartItem,
  theme,
  onToggleTheme,
}) {
  const sectionsObj = useMemo(() => getSectionsForCategory(category), [category]);
  const sectionKeys = useMemo(() => Object.keys(sectionsObj), [sectionsObj]);

  const [activeSection, setActiveSection] = useState(() => sectionKeys[0] || '');
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [productQty, setProductQty] = useState(1);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const rawRows = useMemo(() => {
    if (!activeSection) return [];
    return getCatalogueRowsForSection(category, activeSection);
  }, [category, activeSection]);

  const catalogueRows = useMemo(() => {
    return rawRows
      .map((row) => ({
        ...row,
        items: row.items
          .map((item) => {
            const meta = {
              category,
              section: activeSection,
              rowTitle: row.title,
              name: item.name,
            };
            return applyCatalogueItemState(meta, item);
          })
          .filter((item) => !item.isDeleted),
      }))
      .filter((row) => row.items.length > 0);
  }, [rawRows, category, activeSection]);

  const activeCategorySections = useMemo(
    () => (activeSection && sectionsObj[activeSection] ? sectionsObj[activeSection] : []),
    [sectionsObj, activeSection]
  );

  const handleSectionClick = (secName) => {
    setActiveSection(secName);
  };

  const createItemPayload = (itemDetails, rowTitle, colorChoice, sizeChoice, qty) => ({
    itemId: itemDetails.key,
    name: itemDetails.name,
    category,
    section: activeSection,
    rowTitle,
    price: itemDetails.price,
    img: itemDetails.img,
    color: colorChoice,
    size: sizeChoice,
    quantity: qty,
  });

  const isWishlisted = (itemKey) => wishlistItems.some((w) => w.itemId === itemKey);

  const openProduct = (item, rowTitle) => {
    const details = buildProductDetails(item, rowTitle);
    setActiveProduct(details);
    setSelectedColor(details.colors[0] || 'Default');
    setSelectedSize(details.sizes[0] || 'Default');
    setProductQty(1);
    setActiveGalleryIndex(0);
  };

  const buildProductDetails = (item, rowTitle) => {
    const colors = item.colors?.length ? item.colors : ['Classic', 'Rose', 'Gold'];
    const sizes = item.sizes?.length ? item.sizes : ['S', 'M', 'L'];
    const gallery = item.gallery?.length ? item.gallery : [item.img];

    return {
      ...item,
      rowTitle,
      key: item.__catalogKey,
      colors,
      sizes,
      gallery,
      description: item.description || `Beautiful ${item.name} from our ${category} - ${activeSection} collection. Crafted with exceptional care.`,
      stock: item.stock || 'In Stock',
      rating: item.rating || '4.8 ★',
    };
  };

  return (
    <div className="category-detail-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} theme={theme} onToggleTheme={onToggleTheme} />
        <AuthStatusButton authSession={authSession} onClick={onLoginClick} />
      </header>

      <div className="category-detail-layout">
        <aside className="category-panel">
          <p className="sidebar-label">Shop by category</p>
          <div className="category-list">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${cat === category ? 'active' : ''}`}
                onClick={() => {
                  onSelectCategory(cat);
                  const newSections = getSectionsForCategory(cat);
                  const firstSec = Object.keys(newSections)[0] || '';
                  setActiveSection(firstSec);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        <main className="category-main">
          <div className="detail-header">
            <span className="detail-eyebrow">Her by Mou Collection</span>
            <h1 className="detail-title">{category}</h1>
            <p className="detail-sub">Handpicked designs curated for your style</p>
          </div>

          <nav className="section-tabs" aria-label="Subcategories">
            {sectionKeys.map((secName) => (
              <button
                key={secName}
                type="button"
                className={`section-tab ${secName === activeSection ? 'active' : ''}`}
                onClick={() => handleSectionClick(secName)}
              >
                {secName}
              </button>
            ))}
          </nav>

          {activeCategorySections.length > 0 && (
            <div className="section-showcase-bar">
              <span className="showcase-label">Featured in {activeSection}:</span>
              <div className="showcase-pills">
                {activeCategorySections.map((secItem) => (
                  <span key={secItem.id || secItem.name} className="showcase-pill">
                    {secItem.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <section className="catalogue-rows">
            {catalogueRows.map((row) => (
              <div key={row.title} className="catalogue-row-group">
                <h2 className="catalogue-row-title">{row.title}</h2>
                <div className="catalogue-grid">
                  {row.items.map((item) => {
                    const wish = isWishlisted(item.__catalogKey);
                    return (
                      <div
                        key={item.__catalogKey}
                        className="product-card"
                        onClick={() => openProduct(item, row.title)}
                      >
                        <div className="card-image-wrap">
                          <img src={item.img} alt={item.name} loading="lazy" />
                          {item.saleTag && <span className="card-tag">{item.saleTag}</span>}
                          <button
                            type="button"
                            className={`card-wishlist-btn ${wish ? 'wishlisted' : ''}`}
                            aria-label={wish ? 'Remove from wishlist' : 'Add to wishlist'}
                            onClick={(e) => {
                              e.stopPropagation();
                              const details = buildProductDetails(item, row.title);
                              onToggleWishlist(createItemPayload(details, row.title, 'Default', 'Default', 1));
                            }}
                          >
                            {wish ? '♥' : '♡'}
                          </button>
                        </div>

                        <div className="card-content">
                          <h3 className="card-title">{item.name}</h3>
                          <p className="card-price">{item.price}</p>
                          <button
                            type="button"
                            className="primary-button card-add-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const details = buildProductDetails(item, row.title);
                              onAddCartItem(
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
                            Add to cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>

      {activeProduct && (
        <div className="product-modal-backdrop" onClick={() => setActiveProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setActiveProduct(null)}
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="modal-grid">
              <div className="modal-gallery">
                <div className="modal-main-img">
                  <img
                    src={activeProduct.gallery[activeGalleryIndex] || activeProduct.img}
                    alt={activeProduct.name}
                  />
                </div>
                {activeProduct.gallery.length > 1 && (
                  <div className="modal-thumbnails">
                    {activeProduct.gallery.map((gImg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`thumb-btn ${idx === activeGalleryIndex ? 'active' : ''}`}
                        onClick={() => setActiveGalleryIndex(idx)}
                      >
                        <img src={gImg} alt={`View ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-info">
                <span className="modal-row-tag">{activeProduct.rowTitle}</span>
                <h2>{activeProduct.name}</h2>
                <p className="modal-price">{activeProduct.price}</p>
                <p className="modal-desc">{activeProduct.description}</p>

                <div className="modal-option-group">
                  <label>Color</label>
                  <div className="option-buttons">
                    {activeProduct.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`option-btn ${selectedColor === c ? 'active' : ''}`}
                        onClick={() => setSelectedColor(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-option-group">
                  <label>Size</label>
                  <div className="option-buttons">
                    {activeProduct.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`option-btn ${selectedSize === s ? 'active' : ''}`}
                        onClick={() => setSelectedSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-qty-group">
                  <label>Quantity</label>
                  <div className="qty-picker">
                    <button
                      type="button"
                      onClick={() => setProductQty((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span>{productQty}</span>
                    <button type="button" onClick={() => setProductQty((q) => q + 1)}>
                      +
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      onAddCartItem(
                        createItemPayload(
                          activeProduct,
                          activeProduct.rowTitle,
                          selectedColor,
                          selectedSize,
                          productQty
                        )
                      );
                      setActiveProduct(null);
                    }}
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    className={`secondary-button ${isWishlisted(activeProduct.key) ? 'wishlisted' : ''}`}
                    onClick={() => {
                      onToggleWishlist(
                        createItemPayload(
                          activeProduct,
                          activeProduct.rowTitle,
                          selectedColor,
                          selectedSize,
                          1
                        )
                      );
                    }}
                  >
                    {isWishlisted(activeProduct.key) ? 'Saved in Wishlist ♥' : 'Add to Wishlist ♡'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}