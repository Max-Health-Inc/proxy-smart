import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "**/lib/api-client/**", "**/lib/mcp-registry-client/**", "public/**"] },
  {
    files: ["**/*.{js,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: __dirname,
        // Don't enforce project-based type checking to avoid include issues
        // ESLint will still do basic TS parsing without full type information
      }
    },
    rules: {
      "no-console": "off", // Allow console.log in backend
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
