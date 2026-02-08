import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "chameleon" | "simple";

// Custom event name for theme changes (used by ShadowWrapper in qm-center-app)
export const CHAM_LANG_THEME_EVENT = "cham-lang-theme-change";
export const CHAM_LANG_THEME_STORAGE_KEY = "cham-lang-theme";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /**
   * When true, the app is embedded in another app (e.g., qm-center).
   * In embedded mode, theme changes are dispatched via custom events
   * instead of modifying document.documentElement directly.
   * This prevents theme conflicts between multiple embedded apps.
   */
  embedded?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  embedded = false,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem(CHAM_LANG_THEME_STORAGE_KEY);
    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "chameleon" ||
      savedTheme === "simple"
    ) {
      return savedTheme;
    }

    // Default to light if no preference found
    return "light";
  });

  useEffect(() => {
    // Save to localStorage (always)
    localStorage.setItem(CHAM_LANG_THEME_STORAGE_KEY, theme);

    if (embedded) {
      // In embedded mode, dispatch custom event for ShadowWrapper to handle
      // This avoids modifying document.documentElement which would affect other apps
      window.dispatchEvent(
        new CustomEvent(CHAM_LANG_THEME_EVENT, {
          detail: { theme },
        }),
      );
    } else {
      // In standalone mode, apply theme to document element directly
      const root = window.document.documentElement;

      // Set data-theme attribute
      root.setAttribute("data-theme", theme);

      // Remove all previous theme classes
      root.classList.remove("dark", "chameleon", "simple");

      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "chameleon") {
        root.classList.add("chameleon");
      } else if (theme === "simple") {
        root.classList.add("simple");
      }
    }
  }, [theme, embedded]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
