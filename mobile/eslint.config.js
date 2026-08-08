// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*"],
  },
  {
    rules: {
      // Data screens load Supabase results on mount; this is intentional for the foundation.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
