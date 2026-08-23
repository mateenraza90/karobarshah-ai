import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Several server actions and interface implementations must keep a
      // parameter for signature compatibility (e.g. the React
      // useActionState `(prevState, formData)` contract, or the shared
      // MessagingProvider interface) even when that specific
      // implementation doesn't use it. A leading underscore is this
      // codebase's existing convention for "intentionally unused" — this
      // just makes the linter recognize it instead of flagging every
      // interface-required parameter as dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
