import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { translations } from '../i18n/locales.ts';

const Footer: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <footer className="bg-slate-800 text-white text-center p-4 mt-8">
      <p>{t.footer.copyright}</p>
      <p className="mt-2 font-mono" dir="ltr">{t.footer.contact}</p>
    </footer>
  );
};

export default Footer;