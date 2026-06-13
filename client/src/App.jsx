import { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';

const categories = [
  'Jewellery',
  'Clothing',
  'Skin Care',
  'Makeup',
  'Shoes',
  'Lehenga'
];

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="app-container">
      {started ? (
        <main>
          <header className="app-header">
            <div>
              <p className="eyebrow">Her by Mou</p>
              <h1>Bangladeshi shopping made simple</h1>
            </div>
            <button className="primary-button" onClick={() => setStarted(false)}>
              Back
            </button>
          </header>

          <section className="intro-card">
            <h2>Explore everyday favorites</h2>
            <p>Browse jewellery, clothing, skin care, makeup, shoes, and lehenga collections.</p>
          </section>

          <section className="category-grid">
            {categories.map((category) => (
              <article key={category} className="category-card">
                <h3>{category}</h3>
                <p>Shop the latest styles and accessories.</p>
              </article>
            ))}
          </section>
        </main>
      ) : (
        <WelcomeScreen onContinue={() => setStarted(true)} />
      )}
    </div>
  );
}
