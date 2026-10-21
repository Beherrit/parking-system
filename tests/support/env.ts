// Test settings, read from .env.local (see .env.example). Fails fast when one is missing.
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) loadEnvFile(".env.local");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Run: npm run env:local`);
  return value;
}

export const testEnv = {
  baseUrl: process.env.BASE_URL ?? "http://localhost:3000",
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  attendantEmail: required("E2E_ATTENDANT_EMAIL"),
  attendantEmail2: required("E2E_ATTENDANT_EMAIL_2"),
  attendantPassword: required("E2E_ATTENDANT_PASSWORD"),
};
