import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      {
        resolve: { alias },
        // API tests share one lot, so they run one file at a time.
        test: { name: "api", include: ["tests/api/**/*.test.ts"], fileParallelism: false, testTimeout: 20000 },
      },
    ],
  },
});
