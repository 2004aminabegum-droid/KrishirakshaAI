'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../locales/translations';

type TranslationKey = keyof typeof translations['en'];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedLang = localStorage.getItem('krishirakshak_lang') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'bn')) {
        setLanguageState(savedLang);
      }
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('krishirakshak_lang', lang);
  };

  const t = (key: TranslationKey): string => {
    const langDict = translations[language] || translations['en'];
    return (langDict[key] as string) || (translations['en'][key] as string) || String(key);
  };

  // Avoid hydration mismatch by rendering children only after mounting
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: 'en', setLanguage, t: (k) => translations['en'][k] || String(k) }}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
