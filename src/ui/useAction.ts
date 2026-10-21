"use client";
// Tracks one async form action: idle, pending, ok with a value, or a displayable error.
import { useCallback, useState } from "react";
import { describeError, type FormError } from "./api";

export type ActionState<T> =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ok"; value: T }
  | { status: "error"; error: FormError };

export function useAction<T>() {
  const [state, setState] = useState<ActionState<T>>({ status: "idle" });

  const run = useCallback(async (fn: () => Promise<T>): Promise<boolean> => {
    setState({ status: "pending" });
    try {
      setState({ status: "ok", value: await fn() });
      return true;
    } catch (err) {
      setState({ status: "error", error: describeError(err) });
      return false;
    }
  }, []);

  return { state, run };
}
