// Writes .env.local from .env.example plus the keys of the running local Supabase stack.
// Usage: npm run env:local   (after: npx supabase start)
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const status = execSync("npx supabase status -o env", { encoding: "utf8" });
const local = Object.fromEntries(
  status
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const fromStack = {
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY ?? local.PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY ?? local.SECRET_KEY,
};

const lines = readFileSync(".env.example", "utf8")
  .split(/\r?\n/)
  .map((line) => {
    const key = line.split("=")[0];
    return key in fromStack && fromStack[key] ? `${key}=${fromStack[key]}` : line;
  });

writeFileSync(".env.local", lines.join("\n"));
console.log("Wrote .env.local");
