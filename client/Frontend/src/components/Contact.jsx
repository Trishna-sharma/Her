import React, { useState } from 'react';
import Navigation from './Navigation.jsx';
import AuthStatusButton from './AuthStatusButton.jsx';

const WHATSAPP_NUMBER = '8801853314954';

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

export default function ContactPage({ onNavigate, activePage, onLoginClick, authSession, theme, onToggleTheme }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const message = [
      'Hello Her by Mou,',
      '',
      `Name: ${form.name || '-'}`,
      `Email: ${form.email || '-'}`,
      `Subject: ${form.subject || '-'}`,
      '',
      form.message || 'I would like to know more about your collections and ordering process.',
      '',
      'I understand orders are handled through WhatsApp.',
    ].join('\n');

    openWhatsApp(message);
  };

  return (
    <div className="contact-page">
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

      <main className="contact-main">
        <section className="contact-hero">
          <h1>Let us style your next look together.</h1>
        </section>

        <section className="contact-form-shell">
          <div className="contact-quick-whatsapp">
            <div className="contact-whatsapp-title">
              <span className="contact-whatsapp-icon" aria-hidden="true">
                <WhatsAppIcon />
              </span>
              <strong>WhatsApp</strong>
              <span>01853314954</span>
            </div>
            <button
              type="button"
              className="secondary-button contact-whatsapp-button"
              onClick={() => openWhatsApp('Hello Her by Mou, I want to place an order via WhatsApp.')}
            >
              Chat now
            </button>
          </div>

          <section className="contact-form-card" aria-label="Contact form">
            <div className="contact-form-head">
              <h2>Send a message</h2>
              <p>Tell us what you need and we will get back quickly.</p>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <label className="contact-field">
                <span>Name</span>
                <input type="text" placeholder="Your full name" value={form.name} onChange={handleChange('name')} />
              </label>

              <label className="contact-field">
                <span>Email</span>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} />
              </label>

              <label className="contact-field">
                <span>Subject</span>
                <input type="text" placeholder="Order, sizing, custom request..." value={form.subject} onChange={handleChange('subject')} />
              </label>

              <label className="contact-field contact-field-full">
                <span>Message</span>
                <textarea rows="5" placeholder="Write your message here..." value={form.message} onChange={handleChange('message')} />
              </label>

              <div className="contact-form-actions">
                <button type="submit" className="primary-button">Send on WhatsApp</button>
                <button type="button" className="secondary-button" onClick={() => onNavigate('gallery')}>
                  Browse gallery
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}