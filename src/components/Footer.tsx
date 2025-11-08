import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { WhatsAppIcon } from './Icons';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  const whatsappNumber = '967780804012';

  return (
    <footer className="bg-slate-800 text-white text-center p-4 mt-8">
      <p>{t.footer.copyright}</p>
      <a 
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 font-mono hover:text-teal-300 transition-colors"
        dir="ltr"
      >
        <WhatsAppIcon />
        <span>{t.footer.contact}</span>
      </a>
    </footer>
  );
};

export default Footer;