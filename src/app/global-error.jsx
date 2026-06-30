"use client";

/**
 * Root-level error boundary — only used if the root layout itself throws.
 * Must render its own <html>/<body> because it replaces the whole tree.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="mt-2 text-sm opacity-70">The application hit an unexpected error.</p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#ea5829] px-6 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
