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
  return String(value || '').trim();
}

const CURRENCY_OPTIONS = [
  { code: 'BDT', symbol: '৳', label: '৳ BDT' },
  { code: 'USD', symbol: '$', label: '$ USD' },
  { code: 'EUR', symbol: '€', label: '€ EUR' },
  { code: 'GBP', symbol: '£', label: '£ GBP' },
  { code: 'INR', symbol: '₹', label: '₹ INR' },
  { code: 'CUSTOM', symbol: '', label: 'Custom symbol' },
];

const DEFAULT_CURRENCY_CODE = 'BDT';

function getCurrencySymbol(code, customSymbol) {
  if (code === 'CUSTOM') return String(customSymbol || '').trim();
  const match = CURRENCY_OPTIONS.find((option) => option.code === code);
  return match ? match.symbol : '';
}

function combinePrice(code, customSymbol, amount) {
  const symbol = getCurrencySymbol(code, customSymbol);
  const cleanAmount = String(amount || '').trim();
  return `${symbol}${cleanAmount}`;
}

// Splits a stored price string like "৳900" or "$45.50" back into
// a currency code + raw numeric amount, so existing items can be edited.
function parsePriceValue(raw) {
  const str = String(raw || '').trim();
  const match = str.match(/^([^\d]*)([\d.,]*)$/);
  const symbol = match ? match[1].trim() : '';
  const amount = match ? match[2].trim() : str;

  const known = CURRENCY_OPTIONS.find((option) => option.code !== 'CUSTOM' && option.symbol === symbol);
  if (known) {
    return { currency: known.code, customSymbol: '', amount };
  }
  if (symbol) {
    return { currency: 'CUSTOM', customSymbol: symbol, amount };
  }
  return { currency: DEFAULT_CURRENCY_CODE, customSymbol: '', amount };
}

function splitCommaList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function uploadImageDirectToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured for gallery uploads.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    formData
  );

  const secureUrl = response?.data?.secure_url;
  if (!secureUrl) {
    throw new Error('Upload succeeded but no image URL was returned.');
  }

  return secureUrl;
}

function validateImageFile(file) {
  if (!file) return 'No file selected.';
  if (file.size > 10 * 1024 * 1024) return 'Image must be 10MB or smaller.';
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) return 'Please upload JPG, PNG, WEBP, or GIF images only.';
  return '';
}

export default function AuthPortal({
  onNavigate,
  activePage,
  authSession,
  onAuthChange,
  initialRole = 'admin',
  onClose = () => onNavigate('welcome'),
  theme,
  onToggleTheme,
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
    currency: DEFAULT_CURRENCY_CODE,
    customCurrency: '',
    sizes: '',
    section: 'Admin Picks',
    subSection: 'Everyday Edit',
    image: 'new-arrival.png',
    category: 'Clothing',
    description: '',
    colors: '',
    stock: '',
    rating: '',
    gallery: [],
  });

  const [catalogueQuery, setCatalogueQuery] = useState('');
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState('All');
  const [drafts, setDrafts] = useState({});
  const [isUploadingItemImage, setIsUploadingItemImage] = useState(false);
  const [selectedUploadFileName, setSelectedUploadFileName] = useState('');
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const [uploadingCatalogueGalleryKey, setUploadingCatalogueGalleryKey] = useState('');
  const hasUploadedItemImage = itemForm.image && itemForm.image !== 'new-arrival.png';

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
    const price = combinePrice(itemForm.currency, itemForm.customCurrency, itemForm.price);
    const sizes = String(itemForm.sizes || '').trim();
    const section = String(itemForm.section || '').trim();
    const subSection = String(itemForm.subSection || '').trim();
    const category = String(itemForm.category || '').trim();

    if (!name || !String(itemForm.price || '').trim() || !category) {
      setNotice('Add item name, price, and category.');
      return;
    }

    if (isUploadingItemImage || isUploadingGalleryImage) {
      setNotice('Please wait until the image upload finishes.');
      return;
    }

    if (selectedUploadFileName && !hasUploadedItemImage) {
      setNotice('Image is selected but not uploaded yet. Upload must finish before adding item.');
      return;
    }

    addAdminItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      price,
      sizes,
      section: section || 'Admin Picks',
      subSection: subSection || 'Everyday Edit',
      img: itemForm.image || 'new-arrival.png',
      category,
      description: String(itemForm.description || '').trim(),
      colors: String(itemForm.colors || '').trim(),
      stock: String(itemForm.stock || '').trim(),
      rating: String(itemForm.rating || '').trim(),
      gallery: itemForm.gallery,
    });

    setItemForm({
      name: '',
      price: '',
      currency: DEFAULT_CURRENCY_CODE,
      customCurrency: '',
      sizes: '',
      section: 'Admin Picks',
      subSection: 'Everyday Edit',
      image: 'new-arrival.png',
      category: 'Clothing',
      description: '',
      colors: '',
      stock: '',
      rating: '',
      gallery: [],
    });
    setSelectedUploadFileName('');
    setInventoryVersion((value) => value + 1);
    setNotice('');
    showToast('Item added to website catalogue.', 'success');
  };

  const handleItemImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedUploadFileName(file.name || '');

    if (file.size > 10 * 1024 * 1024) {
      setNotice('Image must be 10MB or smaller.');
      event.target.value = '';
      setSelectedUploadFileName('');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setNotice('Please upload JPG, PNG, WEBP, or GIF images only.');
      event.target.value = '';
      setSelectedUploadFileName('');
      return;
    }

    const rawBase = import.meta.env.VITE_API_URL || 'https://her-by-mou-backend.vercel.app';
    const apiBase = rawBase.replace(/\/+$/, '');
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

    const createPayload = (fieldName) => {
      const formData = new FormData();
      formData.append(fieldName, file);
      return formData;
    };

    try {
      setIsUploadingItemImage(true);
      setNotice('Uploading image...');

      let response;
      let lastError;
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

      if (uploadPreset && cloudName) {
        try {
          const payload = createPayload('file');
          payload.append('upload_preset', uploadPreset);

          response = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            payload,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        try {
          const signatureResponse = await axios.get(`${apiBase}/api/uploads/cloudinary-signature`);
          const {
            apiKey,
            signature,
            timestamp,
            folder,
            uploadUrl,
          } = signatureResponse.data || {};

          if (!apiKey || !signature || !timestamp || !folder || !uploadUrl) {
            throw new Error('Cloudinary signature data is missing.');
          }

          const payload = createPayload('file');
          payload.append('api_key', apiKey);
          payload.append('timestamp', String(timestamp));
          payload.append('signature', signature);
          payload.append('folder', folder);

          response = await axios.post(uploadUrl, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        try {
          const payload = createPayload('image');
          response = await axios.post(`${apiBase}/api/uploads/image`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw lastError || new Error('Image upload failed.');
      }

      const imageUrl = response?.data?.url;
      const secureUrl = response?.data?.secure_url || imageUrl;
      if (!secureUrl) {
        setNotice('Upload succeeded but no image URL was returned.');
        return;
      }

      setItemForm((previous) => ({ ...previous, image: secureUrl }));
      setSelectedUploadFileName('');
      setNotice('');
      showToast('Image uploaded and linked to item.', 'success');
    } catch (error) {
      console.error('Image upload failed:', error);
      const message = error?.response?.data?.message || error?.message || 'Image upload failed.';
      setNotice(message);
    } finally {
      setIsUploadingItemImage(false);
    }
  };

  const handleAddGalleryImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setNotice(validationError);
      event.target.value = '';
      return;
    }

    try {
      setIsUploadingGalleryImage(true);
      setNotice('Uploading gallery image...');

      const secureUrl = await uploadImageDirectToCloudinary(file);

      setItemForm((previous) => ({
        ...previous,
        gallery: [...previous.gallery, secureUrl],
      }));
      setNotice('');
      showToast('Gallery image added.', 'success');
    } catch (error) {
      console.error('Gallery image upload failed:', error?.response?.data || error);
      const cloudinaryMessage = error?.response?.data?.error?.message;
      setNotice(cloudinaryMessage || error?.message || 'Gallery image upload failed.');
    } finally {
      setIsUploadingGalleryImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveGalleryImage = (index) => {
    setItemForm((previous) => ({
      ...previous,
      gallery: previous.gallery.filter((_, i) => i !== index),
    }));
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
    drafts[item.key] || (() => {
      const parsedPrice = parsePriceValue(item.price);
      return {
        name: item.name,
        priceAmount: parsedPrice.amount,
        currency: parsedPrice.currency,
        customCurrency: parsedPrice.customSymbol,
        img: item.img || item.image || 'new-arrival.png',
        saleTag: item.saleTag || '',
        description: item.description || '',
        colors: (item.colors || []).join(', '),
        sizes: (item.sizes || []).join(', '),
        stock: item.stock || '',
        rating: item.rating || '',
        gallery: item.gallery && item.gallery.length ? item.gallery : [item.img || 'new-arrival.png'],
      };
    })()
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

  const handleAddCatalogueGalleryImage = async (item, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setNotice(validationError);
      event.target.value = '';
      return;
    }

    try {
      setUploadingCatalogueGalleryKey(item.key);
      setNotice('Uploading gallery image...');

      const secureUrl = await uploadImageDirectToCloudinary(file);
      const draft = getDraft(item);

      handleDraftChange(item, 'gallery', [...draft.gallery, secureUrl]);
      setNotice('');
      showToast('Gallery image added. Remember to Save changes.', 'success');
    } catch (error) {
      console.error('Gallery image upload failed:', error?.response?.data || error);
      const cloudinaryMessage = error?.response?.data?.error?.message;
      setNotice(cloudinaryMessage || error?.message || 'Gallery image upload failed.');
    } finally {
      setUploadingCatalogueGalleryKey('');
      event.target.value = '';
    }
  };

  const handleRemoveCatalogueGalleryImage = (item, index) => {
    const draft = getDraft(item);
    handleDraftChange(item, 'gallery', draft.gallery.filter((_, i) => i !== index));
  };

  const handleSaveWebsiteItem = (item) => {
    const draft = getDraft(item);
    const finalImg = String(draft.img || '').trim() || 'new-arrival.png';
    const finalGallery = draft.gallery && draft.gallery.length ? draft.gallery : [finalImg];
    const finalPrice = combinePrice(draft.currency, draft.customCurrency, draft.priceAmount) || item.price;

    upsertCatalogueItemOverride(item.meta, {
      name: String(draft.name || '').trim() || item.name,
      price: finalPrice,
      img: finalImg,
      saleTag: String(draft.saleTag || '').trim(),
      description: String(draft.description || '').trim(),
      colors: splitCommaList(draft.colors),
      sizes: splitCommaList(draft.sizes),
      stock: String(draft.stock || '').trim(),
      rating: String(draft.rating || '').trim(),
      gallery: finalGallery,
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
            <div className="auth-price-row">
              <input
                type="text"
                inputMode="decimal"
                placeholder="250"
                value={itemForm.price}
                onChange={(event) => setItemForm((prev) => ({ ...prev, price: event.target.value }))}
              />
              <select
                value={itemForm.currency}
                onChange={(event) => setItemForm((prev) => ({ ...prev, currency: event.target.value }))}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </div>
            {itemForm.currency === 'CUSTOM' && (
              <input
                type="text"
                placeholder="Type your currency symbol, e.g. Tk"
                value={itemForm.customCurrency}
                onChange={(event) => setItemForm((prev) => ({ ...prev, customCurrency: event.target.value }))}
                style={{ marginTop: '0.4rem' }}
              />
            )}
          </label>
          <label className="auth-field">
            <span>Sizes</span>
            <input
              type="text"
              placeholder="S, M, L, XL  or  500 ML"
              value={itemForm.sizes}
              onChange={(event) => setItemForm((prev) => ({ ...prev, sizes: event.target.value }))}
            />
          </label>
          <label className="auth-field auth-field-full">
            <span>Description (optional)</span>
            <input
              type="text"
              placeholder="What makes this product worth buying"
              value={itemForm.description}
              onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label className="auth-field auth-field-full">
            <span>Colors (optional, comma separated)</span>
            <input
              type="text"
              placeholder="Leave blank if not applicable, e.g. skincare"
              value={itemForm.colors}
              onChange={(event) => setItemForm((prev) => ({ ...prev, colors: event.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span>Stock quantity (optional)</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 5"
              value={itemForm.stock}
              onChange={(event) => setItemForm((prev) => ({ ...prev, stock: event.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span>Rating (optional, 0-5)</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="e.g. 4.5"
              value={itemForm.rating}
              onChange={(event) => setItemForm((prev) => ({ ...prev, rating: event.target.value }))}
            />
          </label>

          <label className="auth-field">
            <span>Category</span>
            <select
              value={itemForm.category}
              onChange={(event) => setItemForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {addItemCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label className="auth-field">
            <span>Section</span>
            <select
              value={itemForm.section}
              onChange={(event) => setItemForm((prev) => ({ ...prev, section: event.target.value }))}
            >
              {addItemSectionOptions.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </label>

          {/* ================= NEW SUB-SECTION DROPDOWN ================= */}
          <label className="auth-field">
            <span>Sub-Section / Edit Type</span>
            <select
              value={itemForm.subSection}
              onChange={(event) => setItemForm((prev) => ({ ...prev, subSection: event.target.value }))}
            >
              <option value="Everyday Edit">Everyday Edit</option>
              <option value="Party Edit">Party Edit</option>
              <option value="Festive Edit">Festive Edit</option>
              <option value="Premium Edit">Premium Edit</option>
            </select>
          </label>
          {/* ============================================================= */}

          <div className="auth-field auth-field-full">
            <span>Upload Image (Max 10MB)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleItemImageUpload}
              disabled={isUploadingItemImage}
            />
            <small>Choose a file to upload it directly to Cloudinary.</small>
          </div>

          <div className="auth-field auth-field-full">
            <span>Add Gallery Images (Optional, upload one at a time)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAddGalleryImage}
              disabled={isUploadingGalleryImage}
            />
            {itemForm.gallery.length > 0 && (
              <div className="auth-gallery-preview-grid">
                {itemForm.gallery.map((imgUrl, idx) => (
                  <div key={idx} className="auth-gallery-preview-item">
                    <img src={imgUrl} alt={`Gallery item ${idx + 1}`} />
                    <button
                      type="button"
                      className="auth-remove-gallery-btn"
                      onClick={() => handleRemoveGalleryImage(idx)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="auth-form-submit-row">
            <button type="submit" className="primary-button" disabled={isUploadingItemImage}>
              Add Item
            </button>
          </div>
        </form>
      </details>

      <details className="auth-admin-section" open>
        <summary>Manage Website Catalogue ({filteredWebsiteItems.length} items)</summary>

        <div className="auth-catalogue-filters">
          <input
            type="text"
            placeholder="Search items by name, section..."
            value={catalogueQuery}
            onChange={(e) => setCatalogueQuery(e.target.value)}
          />

          <select
            value={catalogueCategoryFilter}
            onChange={(e) => setCatalogueCategoryFilter(e.target.value)}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="auth-catalogue-grid">
          {filteredWebsiteItems.map((item) => {
            const draft = getDraft(item);
            const isDeleted = item.isDeleted;

            return (
              <div key={item.key} className={`auth-catalogue-card ${isDeleted ? 'is-deleted' : ''}`}>
                <div className="auth-catalogue-card-head">
                  <span className="auth-badge">{item.category}</span>
                  <span className="auth-badge-section">{item.section} &rsaquo; {item.rowTitle}</span>
                  {isDeleted && <span className="auth-badge-hidden">Hidden</span>}
                </div>

                <div className="auth-catalogue-card-body">
                  <div className="auth-catalogue-thumb">
                    <img src={draft.img} alt={draft.name} />
                  </div>

                  <div className="auth-catalogue-inputs">
                    <label>
                      <span>Item Name</span>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => handleDraftChange(item, 'name', e.target.value)}
                      />
                    </label>

                    <div className="auth-price-row">
                      <label>
                        <span>Price Amount</span>
                        <input
                          type="text"
                          value={draft.priceAmount}
                          onChange={(e) => handleDraftChange(item, 'priceAmount', e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Currency</span>
                        <select
                          value={draft.currency}
                          onChange={(e) => handleDraftChange(item, 'currency', e.target.value)}
                        >
                          {CURRENCY_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {draft.currency === 'CUSTOM' && (
                      <label>
                        <span>Custom Symbol</span>
                        <input
                          type="text"
                          value={draft.customCurrency}
                          onChange={(e) => handleDraftChange(item, 'customCurrency', e.target.value)}
                        />
                      </label>
                    )}

                    <label>
                      <span>Image URL</span>
                      <input
                        type="text"
                        value={draft.img}
                        onChange={(e) => handleDraftChange(item, 'img', e.target.value)}
                      />
                    </label>

                    <label>
                      <span>Sale Tag</span>
                      <input
                        type="text"
                        placeholder="e.g. 20% OFF"
                        value={draft.saleTag}
                        onChange={(e) => handleDraftChange(item, 'saleTag', e.target.value)}
                      />
                    </label>

                    <label>
                      <span>Description</span>
                      <input
                        type="text"
                        value={draft.description}
                        onChange={(e) => handleDraftChange(item, 'description', e.target.value)}
                      />
                    </label>

                    <label>
                      <span>Colors (comma separated)</span>
                      <input
                        type="text"
                        value={draft.colors}
                        onChange={(e) => handleDraftChange(item, 'colors', e.target.value)}
                      />
                    </label>

                    <label>
                      <span>Sizes (comma separated)</span>
                      <input
                        type="text"
                        value={draft.sizes}
                        onChange={(e) => handleDraftChange(item, 'sizes', e.target.value)}
                      />
                    </label>

                    <div className="auth-price-row">
                      <label>
                        <span>Stock</span>
                        <input
                          type="number"
                          value={draft.stock}
                          onChange={(e) => handleDraftChange(item, 'stock', e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Rating</span>
                        <input
                          type="number"
                          step="0.1"
                          value={draft.rating}
                          onChange={(e) => handleDraftChange(item, 'rating', e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="auth-field">
                      <span>Gallery Images</span>
                      <div className="auth-gallery-preview-grid">
                        {draft.gallery.map((imgUrl, idx) => (
                          <div key={idx} className="auth-gallery-preview-item">
                            <img src={imgUrl} alt={`Gallery ${idx + 1}`} />
                            <button
                              type="button"
                              className="auth-remove-gallery-btn"
                              onClick={() => handleRemoveCatalogueGalleryImage(item, idx)}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleAddCatalogueGalleryImage(item, e)}
                        disabled={uploadingCatalogueGalleryKey === item.key}
                        style={{ marginTop: '0.4rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-catalogue-card-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleSaveWebsiteItem(item)}
                  >
                    Save Changes
                  </button>

                  {isDeleted ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleRestoreWebsiteItem(item)}
                    >
                      Restore Item
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteWebsiteItem(item)}
                    >
                      Hide Item
                    </button>
                  )}

                  <button
                    type="button"
                    className="auth-text-link"
                    onClick={() => handleResetWebsiteItem(item)}
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );

  const renderUserAuthForm = () => (
    <section className="auth-compact-card" aria-label="User auth form">
      <h2>{mode === 'login' ? 'Welcome back!' : 'Create your account'}</h2>

      {mode === 'register' && !otpStep && (
        <label className="auth-field">
          <span>Full Name</span>
          <input
            type="text"
            placeholder="John Doe"
            value={userForm.name}
            onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>
      )}

      {!otpStep && (
        <>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>
        </>
      )}

      {/* OTP Input Field */}
      {otpStep && (
        <label className="auth-field">
          <span>Enter 6-Digit OTP</span>
          <input
            type="text"
            maxLength="6"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            type="button"
            className="auth-text-link"
            style={{ marginTop: '0.4rem', textAlign: 'left' }}
            onClick={handleResendOtp}
          >
            Resend OTP
          </button>
        </label>
      )}

      <button type="button" className="auth-solid-action" onClick={handleUserAuth}>
        {mode === 'login' ? 'Sign in' : otpStep ? 'Verify OTP & Sign up' : 'Send OTP'}
      </button>

      {!otpStep && (
        <div className="auth-google-wrapper" style={{ marginTop: '1rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setNotice('Google Sign-In failed. Please try again.')}
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

  return (
    <div className="auth-page-wrapper">
      <Navigation
        activePage={activePage}
        onNavigate={onNavigate}
        authSession={authSession}
        onAuthChange={onAuthChange}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <main className={authMainClassName}>
        {toast && (
          <div className={`auth-toast auth-toast-${toast.tone}`} role="status">
            {toast.message}
          </div>
        )}

        {notice && (
          <div className="auth-notice-banner" role="alert">
            {notice}
          </div>
        )}

        {hasActiveSession ? (
          isAdminLoggedIn ? (
            renderAdminDashboard()
          ) : (
            renderSessionProfileCard()
          )
        ) : (
          <div className="auth-tabs-wrapper">
            <div className="auth-role-tabs">
              <button
                type="button"
                className={`auth-tab ${role === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setRole('admin');
                  setNotice('');
                }}
              >
                Admin
              </button>
              <button
                type="button"
                className={`auth-tab ${role === 'user' ? 'active' : ''}`}
                onClick={() => {
                  setRole('user');
                  setNotice('');
                }}
              >
                User
              </button>
            </div>

            {role === 'admin' ? renderAdminAuthForm() : renderUserAuthForm()}
          </div>
        )}
      </main>
    </div>
  );
}