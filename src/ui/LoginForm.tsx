"use client";
import { useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { button, card } from "./styles";
import { TextField } from "./TextField";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Sign-in failed. Check the email and password and try again.");
      setBusy(false);
      return;
    }
    // A full page load, not a client-side route change: the router may hold the redirect to /login
    // it cached before sign-in, which left the attendant needing a manual refresh.
    window.location.replace("/");
  }

  return (
    <section className={`${card} w-full max-w-sm`} aria-labelledby="login-heading">
      <h1 id="login-heading" className="text-2xl font-bold text-slate-900">
        Attendant sign in
      </h1>
      <form data-testid="login-form" onSubmit={submit} className="mt-4 space-y-4">
        <TextField id="login-email" testId="login-email" label="Email" type="email" autoComplete="username"
          value={email} onChange={setEmail} />
        <TextField id="login-password" testId="login-password" label="Password" type="password"
          autoComplete="current-password" value={password} onChange={setPassword} />
        <button type="submit" data-testid="login-submit" disabled={busy} className={`${button} w-full`}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div aria-live="polite" className="empty:hidden">
        {error && (
          <p data-testid="login-error"
            className="mt-4 rounded-lg border border-red-700 bg-red-50 px-3 py-2 font-medium text-red-900">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
