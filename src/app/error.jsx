"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Without this, a render error anywhere under the
 * layout makes Next show the cryptic "missing required error components,
 * refreshing…" overlay. This renders a friendly fallback with a retry instead.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    // Surface the real error in the console for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">
        This view hit an unexpected error. You can try again, or head back to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
        >
          Try again
        </button>
        <a
          href="/placement-trainings"
          className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
