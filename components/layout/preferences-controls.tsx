"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supportedLanguages, type SupportedLanguage, rtlLanguages } from "@/lib/i18n/languages";
import { useRouter } from "next/navigation";

function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof document === "undefined") return "en";
  const lang = (document.documentElement.lang || "en") as SupportedLanguage;
  return supportedLanguages.some((l) => l.code === lang) ? lang : "en";
}

export function PreferencesControls() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const languageOptions = useMemo(() => supportedLanguages, []);

  useEffect(() => {
    setMounted(true);
    setTheme(getInitialTheme());
    setLanguage(getInitialLanguage());
    // keep state in sync if user opens multiple tabs
    const onStorage = (event: StorageEvent) => {
      if (event.key === "erp_theme" && (event.newValue === "light" || event.newValue === "dark")) {
        document.documentElement.classList.toggle("dark", event.newValue === "dark");
        setTheme(event.newValue);
      }
      if (event.key === "erp_lang" && event.newValue) {
        const next = event.newValue as SupportedLanguage;
        if (languageOptions.some((l) => l.code === next)) {
          document.documentElement.lang = next;
          document.documentElement.dir = rtlLanguages.includes(next) ? "rtl" : "ltr";
          setLanguage(next);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [languageOptions]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("erp_theme", next);
    setTheme(next);
  }

  function changeLanguage(next: SupportedLanguage) {
    document.documentElement.lang = next;
    document.documentElement.dir = rtlLanguages.includes(next) ? "rtl" : "ltr";
    localStorage.setItem("erp_lang", next);
    // also store a normal cookie so Server Components can read it after refresh
    document.cookie = `erp_lang=${encodeURIComponent(next)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // Set googtrans cookie for Google Translate widget
    if (next === "en") {
      document.cookie = `googtrans=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      document.cookie = `googtrans=; Path=/; Domain=${window.location.hostname}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    } else {
      document.cookie = `googtrans=/en/${next}; Path=/;`;
      document.cookie = `googtrans=/en/${next}; Path=/; Domain=${window.location.hostname};`;
    }
    setLanguage(next);
    // Reload once so server-rendered labels pick up the new language.
    window.location.reload();
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/erp/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs sm:flex">
        <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <label className="sr-only" htmlFor="erp-language">
          Language
        </label>
        {mounted ? (
          <select
            id="erp-language"
            className="bg-transparent text-xs outline-none"
            value={language}
            onChange={(event) => changeLanguage(event.target.value as SupportedLanguage)}
          >
            {languageOptions.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.englishName}
              </option>
            ))}
          </select>
        ) : (
          <span className="w-20" />
        )}
      </div>

      <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {mounted ? (
          theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />
        ) : (
          <span className="sr-only">Theme</span>
        )}
      </Button>

      <div className="sm:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Language"
          onClick={() => changeLanguage(language === "en" ? "ur" : "en")}
        >
          <Globe2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Log out"
        title="Log out"
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
