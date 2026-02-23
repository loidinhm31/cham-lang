import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "light"
  | "dark"
  | "chameleon"
  | "simple"
  | "cyber"
  | "system";

export type ResolvedTheme = "light" | "dark" | "chameleon" | "simple" | "cyber";

// Custom event name for theme changes (used by ShadowWrapper in qm-hub-app)
export const CHAM_LANG_THEME_EVENT = "cham-lang-theme-change";
export const CHAM_LANG_THEME_STORAGE_KEY = "cham-lang-theme";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  /**
   * When true, the app is embedded in another app (e.g., qm-hub).
   * In embedded mode, theme changes are dispatched via custom events
   * instead of modifying document.documentElement directly.
   * This prevents theme conflicts between multiple embedded apps.
   */
  embedded?: boolean;
  /**
   * Custom event name dispatched when theme changes in embedded mode.
   * Parent app should listen for this event to update shadow DOM styles.
   * @default CHAM_LANG_THEME_EVENT ('cham-lang-theme-change')
   */
  themeEventName?: string;
}

const VALID_THEMES: Theme[] = [
  "light",
  "dark",
  "chameleon",
  "simple",
  "cyber",
  "system",
];

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === "system") return getSystemTheme();
  return theme;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "light",
  storageKey = CHAM_LANG_THEME_STORAGE_KEY,
  embedded = false,
  themeEventName = CHAM_LANG_THEME_EVENT,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme && VALID_THEMES.includes(savedTheme as Theme)) {
      return savedTheme as Theme;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme),
  );

  useEffect(() => {
    localStorage.setItem(storageKey, theme);

    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);

    if (embedded) {
      // In embedded mode, dispatch custom event for ShadowWrapper to handle
      // This avoids modifying document.documentElement which would affect other apps
      window.dispatchEvent(
        new CustomEvent(themeEventName, {
          detail: { theme: resolved },
        }),
      );
    } else {
      // In standalone mode, apply theme to document element directly
      const root = window.document.documentElement;

      // Set data-theme attribute
      root.setAttribute("data-theme", resolved);

      // Remove all previous theme classes
      root.classList.remove("dark", "chameleon", "simple", "cyber");

      if (resolved !== "light") {
        root.classList.add(resolved);
      }
    }
  }, [theme, storageKey, embedded]);

  // Listen for OS theme changes when "system" is selected
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved: ResolvedTheme = e.matches ? "dark" : "light";
      setResolvedTheme(newResolved);

      if (embedded) {
        window.dispatchEvent(
          new CustomEvent(themeEventName, {
            detail: { theme: newResolved },
          }),
        );
      } else {
        const root = window.document.documentElement;
        root.setAttribute("data-theme", newResolved);
        root.classList.remove("dark", "chameleon", "simple", "cyber");
        if (newResolved !== "light") {
          root.classList.add(newResolved);
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, embedded, themeEventName]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
