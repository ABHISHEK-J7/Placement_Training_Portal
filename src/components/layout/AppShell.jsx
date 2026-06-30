"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

/**
 * Application shell + login wall.
 * - On /login: renders the page alone (no nav/footer, no gate).
 * - Everywhere else: requires an authenticated session, otherwise redirects
 *   to /login. While the session is loading it shows a spinner.
 */
export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();

  // Routes that need no login (auth screen + the public feedback form).
  const isPublicRoute = pathname === "/login" || pathname === "/feedback-form";

  useEffect(() => {
    if (!isPublicRoute && ready && !user) {
      router.replace("/login");
    }
  }, [isPublicRoute, ready, user, router]);

  // Public screen — no chrome, no gate.
  if (isPublicRoute) {
    return <main id="main">{children}</main>;
  }

  // Gated area: wait for session, redirect if logged out.
  if (!ready || !user) {
    return (
      <main id="main" className="grid min-h-[70vh] place-items-center">
        <div
          aria-label="Loading"
          className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-brand"
        />
      </main>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
