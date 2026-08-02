import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const typescriptRecommended = typescriptEslint.configs["flat/recommended"].map(
  (config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  }),
);

export default [
  {
    ignores: ["dist", "node_modules", "src/wasm/generated"],
  },
  js.configs.recommended,
  ...typescriptRecommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      ...reactHooks.configs.flat.recommended.plugins,
      ...reactRefresh.configs.vite.plugins,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: ["*.config.ts", "scripts/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
