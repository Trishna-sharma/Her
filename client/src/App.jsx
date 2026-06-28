import { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import CategoryPage from './components/CategoryPage.jsx';

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
    <div className="app-container full-bleed">
      {started ? (
        <CategoryPage categories={categories} onBack={() => setStarted(false)} />
      ) : (
        <WelcomeScreen onContinue={() => setStarted(true)} />
      )}
    </div>
  );
}
