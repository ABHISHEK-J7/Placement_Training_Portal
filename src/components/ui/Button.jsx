import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-600 hover:shadow-card active:scale-[0.98]",
  secondary:
    "border border-border bg-surface text-foreground hover:border-brand/50 hover:text-brand active:scale-[0.98]",
  ghost: "text-foreground/80 hover:bg-surface-2 hover:text-foreground",
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

/**
 * Polymorphic button: renders an <a> (external), a Next <Link> (internal href),
 * or a <button> otherwise.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  external,
  ...rest
}) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
