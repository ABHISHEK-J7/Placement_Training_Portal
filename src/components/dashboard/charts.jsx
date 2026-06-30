import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Shared categorical palette (consistent across light/dark). */
export const PALETTE = [
  "#ea5829", // brand
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
];

/** Headline metric card. */
export function StatCard({ label, value, hint, icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

/** SVG donut chart with legend. data: [ [label, value], ... ] */
export function DonutChart({ title, data }) {
  const total = data.reduce((s, [, v]) => s + v, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
          <g transform="rotate(-90 80 80)">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="20" />
            {data.map(([label, value], i) => {
              const len = (value / total) * circumference;
              const seg = (
                <circle
                  key={label}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth="20"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
          </g>
          <text x="80" y="76" textAnchor="middle" fontSize="26" fontWeight="700" fill="rgb(var(--foreground))">
            {total}
          </text>
          <text x="80" y="96" textAnchor="middle" fontSize="10" fill="rgb(var(--muted))">
            total
          </text>
        </svg>

        <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {data.map(([label, value], i) => (
            <li key={label} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground/80">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Horizontal bar list. data: [ [label, value], ... ] */
export function BarList({ title, data, className }) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  return (
    <Card className={cn("p-5", className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3">
        {data.map(([label, value], i) => (
          <li key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate text-foreground/80">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(value / max) * 100}%`,
                  backgroundColor: PALETTE[i % PALETTE.length],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
