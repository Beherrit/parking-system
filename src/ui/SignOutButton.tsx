"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { linkButton } from "./styles";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    await createBrowserSupabase().auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" data-testid="sign-out" onClick={signOut} disabled={busy} className={linkButton}>
      Sign out
    </button>
  );
}
