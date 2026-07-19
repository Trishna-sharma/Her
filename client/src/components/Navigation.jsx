import React, { useEffect, useRef, useState } from 'react';

const navItems = [
  { label: 'Home', page: 'welcome' },
  { label: 'Products', page: 'category' },
  { label: 'Gallery', page: 'gallery' },
  { label: 'Contact', page: 'contact' },
  { label: 'Your Cart', page: 'startshopping' },
];

export default function Navigation({ onNavigate, activePage }) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [activePage]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (!shellRef.current) return;
      if (!shellRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const handleNav = (page) => {
    setOpen(false);
    onNavigate(page);
  };

  return (
    <div className="nav-shell" ref={shellRef}>
      <button
        type="button"
        className={`nav-toggle ${open ? 'open' : ''}`}
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="hamburger" />
      </button>

      <nav className={`page-links ${open ? 'open' : ''}`}>
        {navItems.map((item) => (
          <button
            key={item.page + item.label}
            type="button"
            className={`nav-link ${activePage === item.page ? 'active' : ''}`}
            onClick={() => handleNav(item.page)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
