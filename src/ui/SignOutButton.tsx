"use client";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { linkButton } from "./styles";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createBrowserSupabase().auth.signOut({ scope: "local" });
    // Full page load: a client-side route change would bring back the login form exactly as it was
    // left (Next keeps visited pages alive), including a still-disabled Sign in button.
    window.location.replace("/login");
  }

  return (
    <button type="button" data-testid="sign-out" onClick={signOut} disabled={busy} className={linkButton}>
      Sign out
    </button>
  );
}
