import type { ReactNode } from "react";
import type { ActionState } from "./useAction";

interface Props<T> {
  prefix: string; // region is `${prefix}-result`, error is `${prefix}-error`
  state: ActionState<T>;
  children: (value: T) => ReactNode;
}

/** A polite live region that is always in the DOM, so screen readers announce what appears in it. */
export function ResultRegion<T>({ prefix, state, children }: Props<T>) {
  return (
    <div data-testid={`${prefix}-result`} aria-live="polite" className="mt-4 empty:mt-0">
      {state.status === "ok" && children(state.value)}
      {state.status === "error" && (
        <p
          data-testid={`${prefix}-error`}
          data-code={state.error.code}
          className="rounded-lg border border-red-700 bg-red-50 px-3 py-2 text-base font-medium text-red-900"
        >
          {state.error.message}
        </p>
      )}
    </div>
  );
}
