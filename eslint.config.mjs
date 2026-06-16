import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Note: only `**/dist/**` is included (not the bare `dist/**`) so a
  // future top-level `dist/` directory at the repo root is still
  // linted, while every package's `dist/` output is skipped.
  globalIgnores([
    ".next/**",
    ".codex-security-scans/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/dist/**",
    "public/widget.js",
  ]),
]);

export default eslintConfig;
