import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "chameleon" | "simple";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("cham-lang-theme");
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
    console.log(`Applying theme: ${theme}`);
    // Save to localStorage
    localStorage.setItem("cham-lang-theme", theme);

    // Apply theme to document element
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
  }, [theme]);

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
