/**
 * Font Size Service
 * Manages global font size settings for accessibility
 */

export type FontSizeOption = "small" | "medium" | "large" | "extra-large";

interface FontSizeConfig {
  value: FontSizeOption;
  scale: number;
  label: string;
}

const FONT_SIZE_CONFIGS: Record<FontSizeOption, FontSizeConfig> = {
  small: { value: "small", scale: 0.875, label: "Small" },
  medium: { value: "medium", scale: 1, label: "Medium (Default)" },
  large: { value: "large", scale: 1.125, label: "Large" },
  "extra-large": { value: "extra-large", scale: 1.25, label: "Extra Large" },
};

const STORAGE_KEY = "app_font_size";
const DEFAULT_FONT_SIZE: FontSizeOption = "medium";

export class FontSizeService {
  /**
   * Get current font size setting
   */
  static getFontSize(): FontSizeOption {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && this.isValidFontSize(stored)) {
      return stored as FontSizeOption;
    }
    return DEFAULT_FONT_SIZE;
  }

  /**
   * Set font size and apply to document
   */
  static setFontSize(size: FontSizeOption): void {
    if (!this.isValidFontSize(size)) {
      console.error(`Invalid font size: ${size}`);
      return;
    }

    localStorage.setItem(STORAGE_KEY, size);
    this.applyFontSize(size);
  }

  /**
   * Apply font size to document root
   */
  static applyFontSize(size: FontSizeOption): void {
    const config = FONT_SIZE_CONFIGS[size];
    const rootElement = document.documentElement;

    // Apply font size scale using CSS custom property
    rootElement.style.setProperty("--font-scale", config.scale.toString());

    // Add data attribute for potential CSS targeting
    rootElement.setAttribute("data-font-size", size);

    // Apply font size by scaling the base font size
    // Default base is 16px, so we multiply by scale
    const baseFontSize = 16;
    const scaledSize = baseFontSize * config.scale;
    rootElement.style.fontSize = `${scaledSize}px`;
  }

  /**
   * Initialize font size on app start
   */
  static initialize(): void {
    const currentSize = this.getFontSize();
    this.applyFontSize(currentSize);
  }

  /**
   * Get all available font size options
   */
  static getOptions(): FontSizeConfig[] {
    return Object.values(FONT_SIZE_CONFIGS);
  }

  /**
   * Get config for specific font size
   */
  static getConfig(size: FontSizeOption): FontSizeConfig {
    return FONT_SIZE_CONFIGS[size];
  }

  /**
   * Increase font size (move to next larger size)
   */
  static increase(): FontSizeOption {
    const current = this.getFontSize();
    const sizes: FontSizeOption[] = ["small", "medium", "large", "extra-large"];
    const currentIndex = sizes.indexOf(current);

    if (currentIndex < sizes.length - 1) {
      const newSize = sizes[currentIndex + 1];
      this.setFontSize(newSize);
      return newSize;
    }

    return current;
  }

  /**
   * Decrease font size (move to next smaller size)
   */
  static decrease(): FontSizeOption {
    const current = this.getFontSize();
    const sizes: FontSizeOption[] = ["small", "medium", "large", "extra-large"];
    const currentIndex = sizes.indexOf(current);

    if (currentIndex > 0) {
      const newSize = sizes[currentIndex - 1];
      this.setFontSize(newSize);
      return newSize;
    }

    return current;
  }

  /**
   * Reset to default font size
   */
  static reset(): void {
    this.setFontSize(DEFAULT_FONT_SIZE);
  }

  /**
   * Check if string is a valid font size option
   */
  private static isValidFontSize(size: string): boolean {
    return size in FONT_SIZE_CONFIGS;
  }
}
