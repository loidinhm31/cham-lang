import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en/translation.json";
import vi from "@/i18n/locales/vi/translation.json";

// Get saved language from localStorage or default to "en"
const savedLanguage = localStorage.getItem("app_language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    vi: {
      translation: vi,
    },
  },
  lng: savedLanguage, // use saved language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
