import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { format as formatDate, formatDistance, formatRelative } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

// Import translation files
import enTranslations from './locales/en/common.json';
import esTranslations from './locales/es/common.json';
import enBasketball from './locales/en/basketball.json';
import esBasketball from './locales/es/basketball.json';
import enRegistration from './locales/en/registration.json';
import esRegistration from './locales/es/registration.json';
import enScoring from './locales/en/scoring.json';
import esScoring from './locales/es/scoring.json';

// Language configurations
export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    locale: enUS,
    direction: 'ltr',
    numberFormat: {
      decimal: '.',
      thousand: ',',
      currency: '$'
    }
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    locale: es,
    direction: 'ltr',
    numberFormat: {
      decimal: ',',
      thousand: '.',
      currency: '$'
    }
  }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Default language
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Fallback language
const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

// Initialize i18n
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enTranslations,
        basketball: enBasketball,
        registration: enRegistration,
        scoring: enScoring
      },
      es: {
        common: esTranslations,
        basketball: esBasketball,
        registration: esRegistration,
        scoring: esScoring
      }
    },
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: ['common', 'basketball', 'registration', 'scoring'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lys_language',
      checkWhitelist: true
    },

    interpolation: {
      escapeValue: false, // React already escapes values
      format: (value, format, lng) => {
        if (!format) return value;
        
        const language = (lng || DEFAULT_LANGUAGE) as SupportedLanguage;
        const locale = SUPPORTED_LANGUAGES[language].locale;
        
        // Date formatting
        if (format === 'date') {
          return formatDate(new Date(value), 'P', { locale });
        }
        if (format === 'time') {
          return formatDate(new Date(value), 'p', { locale });
        }
        if (format === 'datetime') {
          return formatDate(new Date(value), 'Pp', { locale });
        }
        if (format === 'relative') {
          return formatRelative(new Date(value), new Date(), { locale });
        }
        if (format === 'distance') {
          return formatDistance(new Date(value), new Date(), { locale, addSuffix: true });
        }
        
        // Number formatting
        if (format === 'number') {
          const config = SUPPORTED_LANGUAGES[language].numberFormat;
          return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US').format(value);
        }
        if (format === 'currency') {
          return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
        if (format === 'percent') {
          return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
          }).format(value / 100);
        }
        
        return value;
      }
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed',
      nsMode: 'default'
    },

    debug: process.env.NODE_ENV === 'development',
    
    // Performance optimizations
    load: 'languageOnly',
    preload: [DEFAULT_LANGUAGE],
    
    // Accessibility
    returnEmptyString: false,
    returnNull: false,
    
    // Caching
    saveMissing: process.env.NODE_ENV === 'development',
    updateMissing: process.env.NODE_ENV === 'development',
    
    // Key separator for nested translations
    keySeparator: '.',
    
    // Namespace separator
    nsSeparator: ':',
    
    // Plural separator
    pluralSeparator: '_',
    
    // Context separator
    contextSeparator: '_'
  });

// Helper functions
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage;
};

export const setLanguage = async (language: SupportedLanguage) => {
  await i18n.changeLanguage(language);
  localStorage.setItem('lys_language', language);
  
  // Update HTML lang attribute
  document.documentElement.lang = language;
  
  // Update direction if needed (for future RTL support)
  document.documentElement.dir = SUPPORTED_LANGUAGES[language].direction;
};

export const getLanguageConfig = (language?: SupportedLanguage) => {
  const lang = language || getCurrentLanguage();
  return SUPPORTED_LANGUAGES[lang];
};

// Translation helpers
export const t = i18n.t.bind(i18n);
export const exists = i18n.exists.bind(i18n);

// Format helpers with language awareness
export const formatters = {
  date: (date: Date | string, language?: SupportedLanguage) => {
    const locale = getLanguageConfig(language).locale;
    return formatDate(new Date(date), 'P', { locale });
  },
  
  time: (date: Date | string, language?: SupportedLanguage) => {
    const locale = getLanguageConfig(language).locale;
    return formatDate(new Date(date), 'p', { locale });
  },
  
  dateTime: (date: Date | string, language?: SupportedLanguage) => {
    const locale = getLanguageConfig(language).locale;
    return formatDate(new Date(date), 'Pp', { locale });
  },
  
  relative: (date: Date | string, language?: SupportedLanguage) => {
    const locale = getLanguageConfig(language).locale;
    return formatRelative(new Date(date), new Date(), { locale });
  },
  
  distance: (date: Date | string, language?: SupportedLanguage) => {
    const locale = getLanguageConfig(language).locale;
    return formatDistance(new Date(date), new Date(), { locale, addSuffix: true });
  },
  
  number: (value: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US').format(value);
  },
  
  currency: (value: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  },
  
  percent: (value: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
};

// Basketball-specific formatters
export const basketballFormatters = {
  score: (home: number, away: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    if (lang === 'es') {
      return `${home} - ${away}`;
    }
    return `${home}-${away}`;
  },
  
  quarter: (quarter: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    if (quarter === 5) {
      return t('basketball:overtime', { lng: lang });
    }
    return t('basketball:quarter', { quarter, lng: lang });
  },
  
  foulCount: (fouls: number, limit: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    return t('basketball:fouls', { fouls, limit, lng: lang });
  },
  
  timeoutCount: (used: number, total: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    return t('basketball:timeouts', { used, total, lng: lang });
  },
  
  playerStats: (points: number, rebounds: number, assists: number, language?: SupportedLanguage) => {
    const lang = language || getCurrentLanguage();
    if (lang === 'es') {
      return `${points} pts, ${rebounds} reb, ${assists} ast`;
    }
    return `${points} PTS, ${rebounds} REB, ${assists} AST`;
  }
};

// Component text helpers
export const getComponentText = (namespace: string) => {
  return (key: string, options?: any) => {
    return t(`${namespace}:${key}`, options);
  };
};

// Validation message helpers
export const getValidationMessage = (type: string, params?: any) => {
  return t(`validation:${type}`, params);
};

// Error message helpers
export const getErrorMessage = (code: string, fallback?: string) => {
  const key = `errors:${code}`;
  if (exists(key)) {
    return t(key);
  }
  return fallback || t('errors:generic');
};

// Success message helpers
export const getSuccessMessage = (action: string) => {
  return t(`success:${action}`);
};

// Export the i18n instance
export default i18n;