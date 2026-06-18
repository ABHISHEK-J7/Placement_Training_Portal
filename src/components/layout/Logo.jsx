import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Torii Minds wordmark with a minimal torii-gate glyph.
 * Inline SVG keeps it crisp at any size and recolours with the theme.
 */
export function Logo({ className }) {
  return (
    <Link
      href="/"
      aria-label="Torii Minds — Home"
      className={cn(
        "group inline-flex items-center gap-2.5 font-bold tracking-tight",
        className,
      )}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-brand transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        {/* Torii gate */}
        <path
          d="M3 6.5c3-1.2 15-1.2 18 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M4 9.5h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M6.5 9.5V20M17.5 9.5V20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg text-foreground">
        Torii<span className="text-brand">Minds</span>
      </span>
    </Link>
  );
}
