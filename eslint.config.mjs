// ESLint flat config for the Forma workspaces (the shared Node profile runs `npm run lint --workspaces`,
// each workspace linting its own src/ from here). typescript-eslint's recommended rules only: this repository
// is not yet on the Kingsrook layout (K22-CODE-TS), so layout rules are deliberately not enabled here.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // An underscore prefix marks a parameter kept for the signature but not used.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
);
