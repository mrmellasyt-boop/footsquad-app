import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language, TranslationKeys } from "./translations";
// Use Updates for reload on native; fallback gracefully on web
let reloadApp: (() => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Updates = require("expo-updates");
  reloadApp = () => Updates.reloadAsync().catch(() => {});
} catch {
  reloadApp = null;
}

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
        // Apply RTL silently on boot (no reload needed — app is starting fresh)
        const shouldBeRTL = saved === "ar";
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
        }
        setLanguageState(saved as Language);
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);

    const shouldBeRTL = lang === "ar";
    const rtlChanged = I18nManager.isRTL !== shouldBeRTL;

    if (rtlChanged) {
      // Must forceRTL then reload for layout direction to take effect
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      // On native: reload app so RN re-renders with correct direction
      if (Platform.OS !== "web" && reloadApp) {
        // Small delay so AsyncStorage write completes
        setTimeout(() => { reloadApp?.(); }, 300);
      }
    }
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
