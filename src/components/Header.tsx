import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="bg-teal-700 text-white shadow-md">
      <div className="container mx-auto p-4 flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-xl md:text-3xl font-bold">{t.header.title}</h1>
          <p className="text-xs md:text-sm mt-1 text-teal-200">{t.header.subtitle}</p>
          <p className="text-xs md:text-sm mt-2 font-semibold text-teal-100">{t.header.author}</p>
        </div>
        <button
          onClick={toggleLanguage}
          className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>
    </header>
  );
};

export default Header;