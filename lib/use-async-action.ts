import { useTransition } from "react";

// Wraps a fire-and-forget async handler (server action calls, mostly) with a
// pending flag so callers can disable the triggering button and show a
// spinner instead of letting a second click fire the same action again.
export function useAsyncAction<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
) {
  const [pending, startTransition] = useTransition();
  function run(...args: Args) {
    startTransition(() => fn(...args));
  }
  return [pending, run] as const;
}
