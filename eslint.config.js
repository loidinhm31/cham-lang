import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default [
  {
    ignores: [".eslint.config.js"],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      import: importPlugin,
      react: reactPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        window: true,
        document: true,
        navigator: true,
        URLSearchParams: true,
        URL: true,
        performance: true,
        HTMLCanvasElement: true,
        HTMLImageElement: true,
        HTMLVideoElement: true,
        MediaStream: true,
        cancelAnimationFrame: true,
        requestAnimationFrame: true,
        console: true,
        Image: true,
        setTimeout: true,
        localStorage: true,
        clearTimeout: true,
        indexedDB: true,
        clearInterval: true,
        setInterval: true,
        process: true,
        NodeJS: true,
        sessionStorage: true,
      },
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
        tsconfigRootDir: ".",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "unused-imports/no-unused-imports": "warn",
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      eqeqeq: "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];