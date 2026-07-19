import { useEffect, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import CategoryPage from './components/CategoryPage.jsx';
import Gallery from './components/Gallery.jsx';
import CategoryDetail from './components/CategoryDetail.jsx';
import ContactPage from './components/Contact.jsx';
import Startshopping from './components/startshopping.jsx';
import AuthPortal from './components/AuthPortal.jsx';

const AUTH_SESSION_KEY = 'herby-auth-session';

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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [authSession, setAuthSession] = useState(null);

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

  const toggleWishlistItem = (item) => {
    if (!item?.itemId) return;

    setWishlistItems((previous) => {
      const exists = previous.some((entry) => entry.itemId === item.itemId);
      if (exists) {
        return previous.filter((entry) => entry.itemId !== item.itemId);
      }
      return [...previous, item];
    });
  };

  const addCartItem = (item) => {
    if (!item?.cartId) return;

    setCartItems((previous) => {
      const index = previous.findIndex((entry) => entry.cartId === item.cartId);
      if (index === -1) {
        return [...previous, item];
      }

      const updated = [...previous];
      updated[index] = {
        ...updated[index],
        quantity: updated[index].quantity + item.quantity,
      };
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
    setCartItems((previous) => previous.filter((item) => item.cartId !== cartId));
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

  const renderPage = (content) => (
    <div className="app-container full-bleed">
      {content}
    </div>
  );

  const openLogin = () => navTo('auth');
  const handleAuthChange = (nextSession) => setAuthSession(nextSession);

  if (page === 'welcome') {
    return renderPage(
      <WelcomeScreen
        onContinue={() => navTo('category')}
        onNavigate={navTo}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
      />
    );
  }

  if (page === 'category') {
    return renderPage(
      <CategoryPage
        categories={categories}
        onBack={() => navTo('welcome')}
        onNavigate={navTo}
        activePage={page}
        onLoginClick={openLogin}
        authSession={authSession}
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
      />
    );
  }
}
