// src/components/WelcomeScreen.jsx
import React from "react";

export default function WelcomeScreen({ onContinue }) {
  return (
    <div className="min-h-screen bg-maroon flex items-center justify-center">
           <h1 className="text-gold text-6xl font-bold">If you see gold on maroon, Tailwind works!</h1>
      <button
        className="bg-gold text-maroon font-bold px-10 py-4 rounded-full hover:scale-105 transition-transform text-xl shadow-lg"
        onClick={onContinue}
      >
        Shop Her Everything
      </button>
      </div>
    
  );
}
