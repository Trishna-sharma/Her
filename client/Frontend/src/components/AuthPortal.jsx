import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';

import {
  addAdminItem,
  clearCatalogueItemOverride,
  getSectionsForCategory,
  getAdminItems,
  listAllWebsiteItems,
  markCatalogueItemDeleted,
  removeAdminItem,
  unmarkCatalogueItemDeleted,
  upsertCatalogueItemOverride,
} from '../data/catalogAdminStore.js';

const ADMIN_USERS_KEY = 'herby-admin-users';

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

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePrice(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('$') ? raw : `$${raw}`;
}

export default function AuthPortal({
  onNavigate,
  activePage,
  authSession,
  onAuthChange,
  initialRole = 'admin',
  onClose = () => onNavigate('welcome'),
}) {
  const [role, setRole] = useState('admin');
  const [mode, setMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState(null);
  const [inventoryVersion, setInventoryVersion] = useState(0);

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');

  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '' });

  const [itemForm, setItemForm] = useState({
    name: '',
    price: '',
    sizes: '',
    section: 'Admin Picks',
    image: 'new-arrival.png',
    category: 'Clothing',
  });

  const [catalogueQuery, setCatalogueQuery] = useState('');
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState('All');
  const [drafts, setDrafts] = useState({});
  const [isUploadingItemImage, setIsUploadingItemImage] = useState(false);

  const toastTimerRef = useRef(null);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (initialRole !== 'admin' && initialRole !== 'user') return;
    setRole(initialRole);
    setMode('login');
    setOtpStep(false);
    setOtp('');
    setNotice('');
  }, [initialRole]);

  const showToast = (message, tone = 'success') => {
    setToast({ message, tone });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  const isAdminLoggedIn = authSession?.role === 'admin';
  const isUserLoggedIn = authSession?.role === 'user';
  const hasActiveSession = Boolean(authSession);

  const managedItems = useMemo(() => getAdminItems(), [inventoryVersion]);
  const websiteItems = useMemo(() => listAllWebsiteItems(), [inventoryVersion]);

  const categoryOptions = useMemo(
    () => ['All', ...new Set(websiteItems.map((item) => item.category))],
    [websiteItems]
  );

  const addItemCategoryOptions = useMemo(
    () => categoryOptions.filter((option) => option !== 'All'),
    [categoryOptions]
  );

  const addItemSectionOptions = useMemo(() => {
    const sections = getSectionsForCategory(itemForm.category || 'Clothing');
    const options = Object.keys(sections);
    return options.length ? options : ['Admin Picks'];
  }, [itemForm.category, inventoryVersion]);

  const filteredWebsiteItems = useMemo(() => {
    const query = catalogueQuery.trim().toLowerCase();

    return websiteItems.filter((item) => {
      if (catalogueCategoryFilter !== 'All' && item.category !== catalogueCategoryFilter) return false;
      if (!query) return true;

      const haystack = [item.name, item.section, item.rowTitle, item.saleTag]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [websiteItems, catalogueCategoryFilter, catalogueQuery]);

  const ensureDefaultAdmin = () => {
    const admins = readStorage(ADMIN_USERS_KEY, []);
    if (admins.length === 0) {
      const seeded = [{ email: 'admin@herbymou.com', password: 'admin123' }];
      writeStorage(ADMIN_USERS_KEY, seeded);
      return seeded;
    }
    return admins;
  };

  const handleLogout = () => {
    const previousRole = authSession?.role === 'user' ? 'user' : 'admin';
    onAuthChange(null);
    setRole(previousRole);
    setMode('login');
    setOtpStep(false);
    setOtp('');
    setNotice('');
    showToast('Logged out successfully.', 'neutral');
  };

  const handleAdminAuth = () => {
    if (hasActiveSession && !isAdminLoggedIn) {
      setNotice('Logout current user first, then login as admin.');
      return;
    }

    const email = normalizeEmail(adminForm.email);
    const password = adminForm.password;

    if (!email || !password) {
      setNotice('Enter admin email and password.');
      return;
    }

    const admins = ensureDefaultAdmin();

    if (mode === 'register') {
      const exists = admins.some((entry) => entry.email === email);
      if (exists) {
        setNotice('Admin email already exists. Please login.');
        return;
      }

      const updated = [...admins, { email, password }];
      writeStorage(ADMIN_USERS_KEY, updated);
      setMode('login');
      setNotice('Admin account created. Please login now.');
      return;
    }

    const valid = admins.find((entry) => entry.email === email && entry.password === password);
    if (!valid) {
      setNotice('Invalid admin credentials.');
      return;
    }

    onAuthChange({ role: 'admin', email, name: 'Admin' });
    setNotice('');
    showToast('Logged in successfully.', 'success');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const rawBase = import.meta.env.VITE_API_URL || 'https://her-by-mou-backend.vercel.app';
      const apiBase = rawBase.replace(/\/+$/, '');

      const response = await axios.post(`${apiBase}/api/auth/google`, {
        credential: credentialResponse.credential,
      });
      const { token, user } = response.data;

      const googleSession = {
        role: 'user',
        email: user.email,
        name: user.name,
        picture: user.picture,
        token,
      };

      onAuthChange(googleSession);
      setNotice('');
      showToast('Signed in with Google successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      const backendMessage = error?.response?.data?.message;
      const backendError = error?.response?.data?.error;
      setNotice(backendError || backendMessage || 'Google sign-in failed. Please try again.');
    }
  };

  const handleUserAuth = async () => {
    if (hasActiveSession && !isUserLoggedIn) {
      setNotice('Logout current admin first, then login as user.');
      return;
    }

    const name = String(userForm.name || '').trim();
    const email = normalizeEmail(userForm.email);
    const password = userForm.password;

    const rawBase = import.meta.env.VITE_API_URL || 'https://her-by-mou-backend.vercel.app';
    const apiBase = rawBase.replace(/\/+$/, '');

    try {
      // --- REGISTRATION FLOW ---
      if (mode === 'register') {
        // Step 1: Send OTP to Email
        if (!otpStep) {
          if (!name || !email || !password) {
            setNotice('Please fill in your name, email, and password.');
            return;
          }

          setNotice('Sending verification code...');
          await axios.post(`${apiBase}/api/auth/send-otp`, { email });

          setOtpStep(true);
          setNotice('');
          showToast('OTP sent to your email!', 'success');
          return;
        }

        // Step 2: Verify OTP & Create Account
        if (otpStep) {
          if (!otp.trim()) {
            setNotice('Please enter the 6-digit OTP code.');
            return;
          }

          const response = await axios.post(`${apiBase}/api/auth/verify-otp`, {
            email,
            otp: otp.trim(),
            name,
            password,
          });

          const { token, user } = response.data;
          onAuthChange({
            role: 'user',
            email: user.email,
            name: user.name || name,
            token,
          });

          setNotice('');
          showToast('Account verified and logged in successfully!', 'success');
          onClose();
          return;
        }
      }

      // --- LOGIN FLOW ---
      if (!email || !password) {
        setNotice('Enter your email and password.');
        return;
      }

      const response = await axios.post(`${apiBase}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;
      onAuthChange({
        role: 'user',
        email: user.email,
        name: user.name || 'User',
        token,
      });
      setNotice('');
      showToast('Logged in successfully.', 'success');
      onClose();
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      const backendError = error?.response?.data?.error;
      setNotice(backendError || backendMessage || 'Authentication failed. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    const email = normalizeEmail(userForm.email);
    const rawBase = import.meta.env.VITE_API_URL || 'https://her-by-mou-backend.vercel.app';
    const apiBase = rawBase.replace(/\/+$/, '');

    try {
      setNotice('Resending verification code...');
      await axios.post(`${apiBase}/api/auth/send-otp`, { email });
      setNotice('');
      showToast('New OTP code sent to your email!', 'success');
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  const handleAddItem = (event) => {
    event.preventDefault();

    const name = String(itemForm.name || '').trim();
    const price = normalizePrice(itemForm.price);
    const sizes = String(itemForm.sizes || '').trim();
    const section = String(itemForm.section || '').trim();
    const category = String(itemForm.category || '').trim();

    if (!name || !price || !category) {
      setNotice('Add item name, price, and category.');
      return;
    }

    addAdminItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      price,
      sizes,
      section: section || 'Admin Picks',
      img: itemForm.image || 'new-arrival.png',
      category,
    });

    setItemForm({
      name: '',
      price: '',
      sizes: '',
      section: 'Admin Picks',
      image: 'new-arrival.png',
      category: 'Clothing',
    });
    setInventoryVersion((value) => value + 1);
    setNotice('');
    showToast('Item added to website catalogue.', 'success');
  };

  const handleItemImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setNotice('Image must be 10MB or smaller.');
      event.target.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setNotice('Please upload JPG, PNG, WEBP, or GIF images only.');
      event.target.value = '';
      return;
    }

    const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const apiBase = rawBase.replace(/\/+$/, '');
    const payload = new FormData();
    payload.append('image', file);

    try {
      setIsUploadingItemImage(true);
      setNotice('Uploading image...');

      const response = await axios.post(`${apiBase}/api/uploads/image`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = response?.data?.url;
      if (!imageUrl) {
        setNotice('Upload succeeded but no image URL was returned.');
        return;
      }

      setItemForm((previous) => ({ ...previous, image: imageUrl }));
      setNotice('');
      showToast('Image uploaded and linked to item.', 'success');
    } catch (error) {
      const message = error?.response?.data?.message || 'Image upload failed.';
      setNotice(message);
    } finally {
      setIsUploadingItemImage(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (addItemSectionOptions.length === 0) return;

    if (!addItemSectionOptions.includes(itemForm.section)) {
      setItemForm((previous) => ({
        ...previous,
        section: addItemSectionOptions[0],
      }));
    }
  }, [addItemSectionOptions, itemForm.section]);

  const handleDeleteManagedItem = (id) => {
    removeAdminItem(id);
    setInventoryVersion((value) => value + 1);
    showToast('Admin-created item deleted.', 'success');
  };

  const getDraft = (item) => (
    drafts[item.key] || {
      name: item.name,
      price: item.price,
      img: item.img || 'new-arrival.png',
      saleTag: item.saleTag || '',
    }
  );

  const handleDraftChange = (item, field, value) => {
    setDrafts((previous) => ({
      ...previous,
      [item.key]: {
        ...getDraft(item),
        [field]: value,
      },
    }));
  };

  const handleSaveWebsiteItem = (item) => {
    const draft = getDraft(item);

    upsertCatalogueItemOverride(item.meta, {
      name: String(draft.name || '').trim() || item.name,
      price: normalizePrice(draft.price) || item.price,
      img: String(draft.img || '').trim() || 'new-arrival.png',
      saleTag: String(draft.saleTag || '').trim(),
    });

    unmarkCatalogueItemDeleted(item.meta);
    setInventoryVersion((value) => value + 1);
    showToast('Website item updated.', 'success');
  };

  const handleDeleteWebsiteItem = (item) => {
    markCatalogueItemDeleted(item.meta);
    setInventoryVersion((value) => value + 1);
    showToast('Item hidden from website.', 'success');
  };

  const handleRestoreWebsiteItem = (item) => {
    unmarkCatalogueItemDeleted(item.meta);
    setInventoryVersion((value) => value + 1);
    showToast('Item restored to website.', 'success');
  };

  const handleResetWebsiteItem = (item) => {
    clearCatalogueItemOverride(item.meta);
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[item.key];
      return next;
    });
    setInventoryVersion((value) => value + 1);
    showToast('Item reset to original data.', 'neutral');
  };

  const buildSessionDetails = () => {
    if (!authSession) {
      return {
        role: '-',
        name: '-',
        username: '-',
        email: '-',
      };
    }

    const name = String(authSession.name || '').trim() || (authSession.role === 'admin' ? 'Admin' : '-');
    const email = String(authSession.email || '').trim() || '-';
    const usernameFromEmail = email.includes('@') ? email.split('@')[0] : email;

    return {
      role: authSession.role === 'admin' ? 'Admin' : 'User',
      name,
      username: usernameFromEmail || name || '-',
      email,
    };
  };

  const renderSessionProfileCard = () => {
    const details = buildSessionDetails();

    return (
      <section className="auth-compact-card auth-profile-card" aria-label="Logged in profile details">
        <h2>Your profile details</h2>

        <p><strong>Role:</strong> {details.role}</p>
        <p><strong>Name:</strong> {details.name}</p>
        <p><strong>Username:</strong> {details.username}</p>
        <p><strong>Email:</strong> {details.email}</p>

        <button type="button" className="auth-small-logout" onClick={handleLogout}>
          Logout
        </button>
      </section>
    );
  };

  const authMainClassName = isAdminLoggedIn ? 'auth-main' : 'auth-main auth-main-compact';

  const renderAdminAuthForm = () => (
    <section className="auth-compact-card" aria-label="Admin auth form">
      <h2>{mode === 'login' ? 'Nice to see you again, Admin' : 'Create admin account'}</h2>

      <label className="auth-field">
        <span>{mode === 'login' ? 'Email or phone number' : 'Email'}</span>
        <input
          type="email"
          placeholder={mode === 'login' ? 'Email or phone number' : 'admin@herbymou.com'}
          value={adminForm.email}
          onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))}
        />
      </label>

      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          placeholder="Enter password"
          value={adminForm.password}
          onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))}
        />
      </label>

      <div className="auth-inline-row">
        <label className="auth-checkline">
          <input type="checkbox" defaultChecked={mode === 'login'} />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          className="auth-text-link"
          onClick={() => setNotice('Password reset needs backend support.')}
        >
          Forgot password?
        </button>
      </div>

      <button type="button" className="auth-solid-action" onClick={handleAdminAuth}>
        {mode === 'login' ? 'Sign in' : 'Sign up'}
      </button>

      <p className="auth-switch-row">
        {mode === 'login' ? 'No account yet?' : 'Already have an account?'}{' '}
        <button
          type="button"
          className="auth-text-link"
          onClick={() => {
            setMode((prev) => (prev === 'login' ? 'register' : 'login'));
            setNotice('');
          }}
        >
          {mode === 'login' ? 'Create account' : 'Log in'}
        </button>
      </p>

      <button
        type="button"
        className="auth-guest-link"
        onClick={() => onNavigate('welcome')}
      >
        Continue as guest
      </button>

      <small>Default admin: admin@herbymou.com / admin123</small>
    </section>
  );

  const renderAdminDashboard = () => (
    <div className="auth-admin-manager">
      <div className="auth-admin-head">
        <div>
          <h2>Admin dashboard</h2>
          <p>You can edit, hide, restore, and replace any website item from here.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <details className="auth-admin-section" open>
        <summary>Add New Item</summary>
        <form className="auth-item-form" onSubmit={handleAddItem}>
          <label className="auth-field">
            <span>Item name</span>
            <input
              type="text"
              placeholder="Bridal Lehenga"
              value={itemForm.name}
              onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span>Price</span>
            <input
              type="text"
              placeholder="250"
              value={itemForm.price}
              onChange={(event) => setItemForm((prev) => ({ ...prev, price: event.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span>Sizes</span>
            <input
              type="text"
              placeholder="S, M, L, XL"
              value={itemForm.sizes}
              onChange={(event) => setItemForm((prev) => ({ ...prev, sizes: event.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span>Category</span>
            <select
              value={itemForm.category}
              onChange={(event) => setItemForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {addItemCategoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span>Section</span>
            <select
              value={itemForm.section}
              onChange={(event) => setItemForm((prev) => ({ ...prev, section: event.target.value }))}
            >
              {addItemSectionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="auth-field auth-field-full">
            <span>Image path</span>
            <input
              type="text"
              placeholder="new-arrival.png"
              value={itemForm.image}
              onChange={(event) => setItemForm((prev) => ({ ...prev, image: event.target.value }))}
            />
          </label>
          <label className="auth-field auth-field-full">
            <span>Upload image (max 10MB)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleItemImageUpload}
              disabled={isUploadingItemImage}
            />
          </label>
          <div className="auth-actions auth-field-full">
            <button type="submit" className="primary-button" disabled={isUploadingItemImage}>
              {isUploadingItemImage ? 'Uploading image...' : 'Add item'}
            </button>
          </div>
        </form>

        {managedItems.length > 0 && (
          <div className="auth-item-list">
            {managedItems.map((item) => (
              <article key={item.id} className="auth-item-card">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.price} • Sizes: {item.sizes || 'N/A'}</p>
                  <p>Category: {item.category || 'General'} • Section: {item.section || 'Admin Picks'}</p>
                </div>
                <button
                  type="button"
                  className="startshopping-remove"
                  onClick={() => handleDeleteManagedItem(item.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </details>

      <details className="auth-admin-section" open>
        <summary>Manage Entire Website Catalogue</summary>

        <div className="auth-catalog-filters">
          <label className="auth-field">
            <span>Category</span>
            <select
              value={catalogueCategoryFilter}
              onChange={(event) => setCatalogueCategoryFilter(event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="auth-field auth-field-query">
            <span>Search</span>
            <input
              type="text"
              placeholder="Find item, section, sale tag"
              value={catalogueQuery}
              onChange={(event) => setCatalogueQuery(event.target.value)}
            />
          </label>
        </div>

        <p className="auth-catalog-caption">
          Showing {filteredWebsiteItems.length} of {websiteItems.length} items.
        </p>

        <div className="auth-catalog-list">
          {filteredWebsiteItems.length === 0 ? (
            <p className="auth-catalog-empty">No items match this filter.</p>
          ) : (
            filteredWebsiteItems.map((item) => {
              const draft = getDraft(item);

              return (
                <article key={item.key} className={`auth-catalog-card ${item.isDeleted ? 'is-deleted' : ''}`}>
                  <div className="auth-catalog-meta">
                    <h3>{item.name}</h3>
                    <p>{item.category} • {item.section}</p>
                    <small>{item.rowTitle}</small>
                  </div>

                  <div className="auth-catalog-grid">
                    <label className="auth-field">
                      <span>Name</span>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(event) => handleDraftChange(item, 'name', event.target.value)}
                      />
                    </label>

                    <label className="auth-field">
                      <span>Price</span>
                      <input
                        type="text"
                        value={draft.price}
                        onChange={(event) => handleDraftChange(item, 'price', event.target.value)}
                      />
                    </label>

                    <label className="auth-field">
                      <span>Sale tag</span>
                      <input
                        type="text"
                        placeholder="Top Sale / Black Friday"
                        value={draft.saleTag}
                        onChange={(event) => handleDraftChange(item, 'saleTag', event.target.value)}
                      />
                    </label>

                    <label className="auth-field auth-field-full">
                      <span>Image path</span>
                      <input
                        type="text"
                        value={draft.img}
                        onChange={(event) => handleDraftChange(item, 'img', event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="auth-catalog-actions">
                    <button type="button" className="primary-button" onClick={() => handleSaveWebsiteItem(item)}>
                      Save changes
                    </button>

                    {item.isDeleted ? (
                      <button type="button" className="secondary-button" onClick={() => handleRestoreWebsiteItem(item)}>
                        Restore item
                      </button>
                    ) : (
                      <button type="button" className="startshopping-remove" onClick={() => handleDeleteWebsiteItem(item)}>
                        Delete from website
                      </button>
                    )}

                    <button type="button" className="secondary-button" onClick={() => handleResetWebsiteItem(item)}>
                      Reset
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </details>
    </div>
  );

  const renderUserPanel = () => {
    if (isUserLoggedIn) {
      return (
        <div className="auth-form-shell">
          <h2>Welcome, {authSession.name}</h2>
          <p>Your user account is logged in locally on this browser.</p>
          <div className="auth-actions">
            <button type="button" className="primary-button" onClick={() => onNavigate('gallery')}>
              Continue shopping
            </button>
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      );
    }

    if (hasActiveSession && !isUserLoggedIn) {
      return (
        <div className="auth-form-shell">
          <h2>User Login</h2>
          <p>Admin is currently logged in. Logout first, then login as user.</p>
          <div className="auth-actions">
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Logout admin
            </button>
          </div>
        </div>
      );
    }

    return (
      <section className="auth-compact-card" aria-label="User auth form">
        <h2>
          {mode === 'login'
            ? 'Nice to see you!'
            : otpStep
            ? 'Verify Your Email'
            : 'Create account'}
        </h2>

        {/* --- REGISTRATION INPUTS (STEP 1) --- */}
        {mode === 'register' && !otpStep && (
          <label className="auth-field">
            <span>User name</span>
            <input
              type="text"
              placeholder="Your username"
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
        )}

        {/* --- EMAIL & PASSWORD INPUTS (For Login and Register Step 1) --- */}
        {!otpStep && (
          <>
            <label className="auth-field">
              <span>{mode === 'login' ? 'Email or phone number' : 'Email'}</span>
              <input
                type="email"
                placeholder={mode === 'login' ? 'Email or phone number' : 'Your email'}
                value={userForm.email}
                onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>
          </>
        )}

        {/* --- OTP CODE INPUT (STEP 2) --- */}
        {mode === 'register' && otpStep && (
          <>
            <p style={{ fontSize: '0.88rem', opacity: 0.85, marginBottom: '12px' }}>
              We've sent a 6-digit verification code to <strong>{userForm.email}</strong>.
            </p>
            <label className="auth-field">
              <span>6-Digit Verification Code</span>
              <input
                type="text"
                placeholder="e.g. 123456"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
            </label>
            <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '12px' }}>
              <button
                type="button"
                className="auth-text-link"
                onClick={handleResendOtp}
              >
                Resend OTP
              </button>
            </div>
          </>
        )}

        {/* --- CHECKBOX / EXTRA LINKS --- */}
        {mode === 'login' && (
          <div className="auth-inline-row">
            <label className="auth-checkline">
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="auth-text-link"
              onClick={() => setNotice('Password reset needs backend support.')}
            >
              Forgot password?
            </button>
          </div>
        )}

        {mode === 'register' && !otpStep && (
          <label className="auth-checkline">
            <input type="checkbox" defaultChecked />
            <span>I accept the terms and privacy policy</span>
          </label>
        )}

        {/* --- MAIN ACTION BUTTON --- */}
        <button type="button" className="auth-solid-action" onClick={handleUserAuth}>
          {mode === 'login'
            ? 'Sign in'
            : otpStep
            ? 'Verify Code & Complete Sign Up'
            : 'Send OTP Code'}
        </button>

        {mode === 'login' && (
          <div className="auth-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setNotice('Google login failed or was cancelled.')}
            />
          </div>
        )}

        <p className="auth-switch-row">
          {mode === 'login' ? 'No account yet?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="auth-text-link"
            onClick={() => {
              setMode((prev) => (prev === 'login' ? 'register' : 'login'));
              setOtpStep(false);
              setOtp('');
              setNotice('');
            }}
          >
            {mode === 'login' ? 'Create account' : 'Log in'}
          </button>
        </p>

        <button
          type="button"
          className="auth-guest-link"
          onClick={() => onNavigate('welcome')}
        >
          Continue as guest
        </button>
      </section>
    );
  };

  return (
    <div className="auth-page">
      <header className="page-top-nav">
        <button type="button" className="logo logo-home" onClick={() => onNavigate('welcome')} aria-label="Go to home page">
          <span style={{ color: '#69f2c4' }}>H</span>
          <span style={{ color: '#ffde59' }}>E</span>
          <span style={{ color: '#Ff66c4' }}>R</span>
        </button>
        <Navigation onNavigate={onNavigate} activePage={activePage} />
        {hasActiveSession ? (
          <AuthStatusButton authSession={authSession} onClick={onClose} menuEnabled={false} />
        ) : (
          <button type="button" className="login-button" onClick={onClose}>Close</button>
        )}
      </header>

      {toast && <div className={`auth-toast ${toast.tone}`}>{toast.message}</div>}

      <main className={authMainClassName}>
        <section className="auth-mobile-shell" aria-label="Login role selection">
          <div className="auth-mobile-headline">
            <h1>Login portal</h1>
          </div>

          {notice && <p className="auth-notice">{notice}</p>}

          {hasActiveSession
            ? renderSessionProfileCard()
            : (role === 'admin' ? renderAdminAuthForm() : renderUserPanel())}
        </section>

        {isAdminLoggedIn && renderAdminDashboard()}
      </main>
    </div>
  );
}