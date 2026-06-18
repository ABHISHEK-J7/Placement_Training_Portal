import { cn } from "@/lib/utils";

export function Card({ className, interactive = false, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-card",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}
