import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20",
  neutral: "bg-surface-2 text-muted ring-1 ring-inset ring-border",
  outline: "text-foreground/80 ring-1 ring-inset ring-border",
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
