import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  eslintReact.configs["recommended-typescript"],
  reactHooks.configs.flat.recommended,
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "import-x": importX,
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@eslint-react/exhaustive-deps": "off",
      "@eslint-react/rules-of-hooks": "off",
      complexity: ["error", 12],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "error",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["**/__tests__/**", "src/test/**"],
    rules: { "max-lines-per-function": "off" },
  },
];
