"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { copy, type Copy, type Language } from "@/lib/copy";

interface LanguageContextValue {
  language: Language;
  copy: Copy;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "lenzi.language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("sw");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "sw" || stored === "en") {
      queueMicrotask(() => setLanguageState(stored));
    }
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "sw" ? "en" : "sw");
  }, [language, setLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      copy: copy[language] as unknown as Copy,
      setLanguage,
      toggleLanguage,
    }),
    [language, setLanguage, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return value;
}
