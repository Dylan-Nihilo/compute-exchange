import {dirname} from "node:path";
import {fileURLToPath} from "node:url";

import {FlatCompat} from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "coverage/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/lib/mock/**", "src/lib/auth/service.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {name: "@/lib/auth/service", message: "Use @/lib/auth/contracts in product code."},
            {name: "@/lib/auth/service.ts", message: "Use @/lib/auth/contracts in product code."},
            {name: "./service", message: "Use ./contracts in product code."},
            {name: "./service.ts", message: "Use ./contracts in product code."},
            {name: "../auth/service", message: "Use ../auth/contracts in product code."},
            {name: "../auth/service.ts", message: "Use ../auth/contracts in product code."},
            {name: "./auth/service", message: "Use ./auth/contracts in product code."},
            {name: "./auth/service.ts", message: "Use ./auth/contracts in product code."},
          ],
          patterns: [{group: ["**/mock/**"], message: "Mock modules are test-only."}],
        },
      ],
    },
  },
];

export default eslintConfig;
