import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20",
  neutral: "bg-surface-2 text-muted ring-1 ring-inset ring-border",
  outline: "text-foreground/80 ring-1 ring-inset ring-border",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/20",
};

export function Badge({ tone = "brand", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
