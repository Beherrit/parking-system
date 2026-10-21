// Creates (or resets the password of) the demo attendant accounts on a hosted Supabase project.
// Usage: node scripts/create-attendants.mjs <env-file> [<env-file> ...]
// The env file needs NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// DEMO_ATTENDANT_EMAILS (comma separated) and DEMO_ATTENDANT_PASSWORD. Nothing secret is printed.
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

// Every file passed on the command line is loaded, for example the pulled Vercel env plus .env.demo.
for (const file of process.argv.slice(2)) loadEnvFile(file);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emails = (process.env.DEMO_ATTENDANT_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
const password = process.env.DEMO_ATTENDANT_PASSWORD;
if (!url || !serviceKey || emails.length === 0 || !password) {
  throw new Error("Missing Supabase URL, service role key, DEMO_ATTENDANT_EMAILS or DEMO_ATTENDANT_PASSWORD");
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

for (const email of emails) {
  const existing = list.users.find((u) => u.email === email);
  const { error } = existing
    ? await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`${existing ? "Updated" : "Created"} ${email}`);
}
