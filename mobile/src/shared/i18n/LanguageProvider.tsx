import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocales } from "expo-localization";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { i18n, languages, type Language } from "./i18n";

const storageKey = "zerobuff.language";
export type LanguagePreference = "system" | Language;

const LanguageContext = createContext<{
  language: Language;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  ready: boolean;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locales = useLocales();
  const [preference, setPreferenceState] = useState<LanguagePreference | null>(
    null,
  );
  const [language, setLanguage] = useState<Language | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then(
      (saved) => {
        if (active)
          setPreferenceState(
            saved === "it" || saved === "en" ? saved : "system",
          );
      },
      () => {
        if (active) setPreferenceState("system");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const systemLanguage =
    locales
      .map(({ languageCode }) => languageCode)
      .find((code): code is Language =>
        languages.some((supported) => supported === code),
      ) ?? "en";
  const effectiveLanguage =
    preference === "system" ? systemLanguage : preference;

  useEffect(() => {
    if (!effectiveLanguage) return;
    let current = true;
    void i18n.changeLanguage(effectiveLanguage).then(() => {
      if (current) setLanguage(effectiveLanguage);
    });
    return () => {
      current = false;
    };
  }, [effectiveLanguage]);

  function setPreference(next: LanguagePreference) {
    setPreferenceState(next);
    void AsyncStorage.setItem(storageKey, next).catch(() => {});
  }

  return (
    <LanguageContext.Provider
      value={{
        preference: preference ?? "system",
        language: language ?? "en",
        setPreference,
        ready: language !== null,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("LanguageProvider is missing.");
  return value;
}
