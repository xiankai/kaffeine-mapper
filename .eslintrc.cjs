module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "import",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    // React rules
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off", // Using TypeScript instead

    // General rules
    "no-unused-vars": "off", // Replaced by @typescript-eslint/no-unused-vars
    "no-console": "warn",

    // TypeScript rules
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    complexity: ["error", 12],
    "max-depth": ["error", 4],
    "max-lines-per-function": ["error", { max: 100, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    {
      files: ["**/__tests__/**", "src/test/**"],
      rules: { "max-lines-per-function": "off" },
    },
  ],
};
