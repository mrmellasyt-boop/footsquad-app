import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language, TranslationKeys } from "./translations";

const STORAGE_KEY = "@footsquad_language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: async () => {},
  t: translations.en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && (saved === "en" || saved === "ar" || saved === "fr")) {
        applyLanguage(saved as Language, false);
      }
    });
  }, []);

  const applyLanguage = (lang: Language, persist = true) => {
    setLanguageState(lang);
    const shouldBeRTL = lang === "ar";
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
    }
    if (persist) {
      AsyncStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const setLanguage = async (lang: Language) => {
    applyLanguage(lang, true);
  };

  const isRTL = language === "ar";
  const t = translations[language] as TranslationKeys;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Shorthand hook for translations only
export function useT() {
  return useContext(LanguageContext).t;
}
