import { useEffect, useRef, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import CategoryPage from './components/CategoryPage.jsx';
import Gallery from './components/Gallery.jsx';
import CategoryDetail from './components/CategoryDetail.jsx';
import ContactPage from './components/Contact.jsx';
import Startshopping from './components/startshopping.jsx';
import AuthPortal from './components/AuthPortal.jsx';
import React from 'react';

const AUTH_SESSION_KEY = 'herby-auth-session';
const THEME_KEY = 'herby-theme';

const categories = [
  'Clothing',
  'Jewellery',
  'Makeup',
  'Shoes',
  'Bags',
  'Skin Care'
];

export default function App() {
  const [page, setPage] = useState('welcome');
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [authSession, setAuthSession] = useState(null);
  const [authEntryRole, setAuthEntryRole] = useState('admin');
  const [authReturnTarget, setAuthReturnTarget] = useState(null);
  const [uiToast, setUiToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showUiToast = (message, tone = 'success') => {
    setUiToast({ message, tone });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setUiToast(null), 1900);
  };

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem('herby-cart-items');
      const storedWishlist = window.localStorage.getItem('herby-wishlist-items');
      const storedAuthSession = window.localStorage.getItem(AUTH_SESSION_KEY);

      if (storedCart) setCartItems(JSON.parse(storedCart));
      if (storedWishlist) setWishlistItems(JSON.parse(storedWishlist));
      if (storedAuthSession) setAuthSession(JSON.parse(storedAuthSession));
    } catch {
      // Ignore storage parse issues and continue with empty state.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('herby-cart-items', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    window.localStorage.setItem('herby-wishlist-items', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    if (!authSession) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession));
  }, [authSession]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const toggleWishlistItem = (item) => {
    if (!item?.itemId) return;

    setWishlistItems((previous) => {
      const exists = previous.some((entry) => entry.itemId === item.itemId);
      if (exists) {
        showUiToast('Removed from wishlist.', 'neutral');
        return previous.filter((entry) => entry.itemId !== item.itemId);
      }
      showUiToast('Saved to wishlist.', 'success');
      return [...previous, item];
    });
  };

  const addCartItem = (item) => {
    if (!item?.cartId) return;

    setCartItems((previous) => {
      const index = previous.findIndex((entry) => entry.cartId === item.cartId);
      if (index === -1) {
        showUiToast(`${item.name} added to cart.`, 'success');
        return [...previous, item];
      }

      const updated = [...previous];
      updated[index] = {
        ...updated[index],
        quantity: updated[index].quantity + item.quantity,
      };
      showUiToast(`${item.name} quantity updated in cart.`, 'success');
      return updated;
    });
  };

  const updateCartItemQuantity = (cartId, nextQuantity) => {
    setCartItems((previous) => previous.map((item) => (
      item.cartId === cartId
        ? { ...item, quantity: Math.max(1, nextQuantity) }
        : item
    )));
  };

  const removeCartItem = (cartId) => {
    setCartItems((previous) => {
      const removed = previous.find((item) => item.cartId === cartId);
      if (removed) {
        showUiToast(`${removed.name} removed from cart.`, 'neutral');
      }
      return previous.filter((item) => item.cartId !== cartId);
    });
  };

  const moveWishlistItemToCart = (itemId) => {
    const selected = wishlistItems.find((item) => item.itemId === itemId);
    if (!selected) return;

    const cartPayload = {
      ...selected,
      color: selected.color || 'Default',
      size: selected.size || 'Default',
      quantity: 1,
      cartId: `${selected.itemId}__${selected.color || 'default'}__${selected.size || 'default'}`,
    };

    addCartItem(cartPayload);
  };

  const navTo = (p, category = null, section = null) => {
    setPage(p);
    if (category) setSelectedCategory(category);
    if (p === 'detail') {
      setSelectedSection(section);
    }
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const renderPage = (content) => (
    <div className="app-container full-bleed">
      {uiToast && <div className={`ui-toast ${uiToast.tone}`}>{uiToast.message}</div>}
      {content}
    </div>
  );

  const openLogin = (role) => {
    const resolvedRole = role || authSession?.role || 'admin';
    setAuthEntryRole(resolvedRole === 'user' ? 'user' : 'admin');
    setAuthReturnTarget({
      page,
      category: selectedCategory,
      section: selectedSection,
    });
    navTo('auth');
  };

  const closeLogin = () => {
    if (!authReturnTarget?.page || authReturnTarget.page === 'auth') {
      navTo('welcome');
      return;
    }

    const target = authReturnTarget;
    setAuthReturnTarget(null);

    if (target.page === 'detail') {
      navTo('detail', target.category, target.section);
      return;
    }

    if (target.page === 'gallery' || target.page === 'category') {
      navTo(target.page, target.category);
      return;
    }

    navTo(target.page);
  };
  const handleAuthChange = (nextSession) => setAuthSession(nextSession);

  if (page === 'welcome') {
    return renderPage(
      <WelcomeScreen
        onContinue={() => navTo('category')}
        onNavigate={navTo}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === 'category') {
    return renderPage(
      <CategoryPage
        categories={categories}
        onBack={() => navTo('welcome')}
        onNavigate={navTo}
        onAddCartItem={addCartItem}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === 'gallery') {
    return renderPage(
      <Gallery
        onNavigate={navTo}
        selectedCategory={selectedCategory}
        categories={categories}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === 'detail') {
    return renderPage(
      <CategoryDetail
        category={selectedCategory}
        selectedSection={selectedSection}
        wishlistItems={wishlistItems}
        onToggleWishlist={toggleWishlistItem}
        onAddCartItem={addCartItem}
        onNavigate={navTo}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === 'contact') {
    return renderPage(
      <ContactPage
        onNavigate={navTo}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === 'startshopping') {
    return renderPage(
      <Startshopping
        onNavigate={navTo}
        categories={categories}
        activePage={page}
        cartItems={cartItems}
        wishlistItems={wishlistItems}
        onToggleWishlist={toggleWishlistItem}
        onUpdateCartItemQuantity={updateCartItemQuantity}
        onRemoveCartItem={removeCartItem}
        onMoveWishlistItemToCart={moveWishlistItemToCart}
        onAddCartItem={addCartItem}
        onLoginClick={openLogin}
        authSession={authSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === 'auth') {
    return renderPage(
      <AuthPortal
        onNavigate={navTo}
        activePage={page}
        authSession={authSession}
        onAuthChange={handleAuthChange}
        initialRole={authEntryRole}
        onClose={closeLogin}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }
}
