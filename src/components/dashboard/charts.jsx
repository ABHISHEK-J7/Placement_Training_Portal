"use client";

import { useState } from "react";
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

/** Named accents for tiles / gauges. */
export const ACCENTS = {
  brand: "#ea5829",
  sky: "#0ea5e9",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  teal: "#14b8a6",
  indigo: "#6366f1",
};

/** Threshold colour for a 0–100 percentage (good / watch / risk). */
export function pctColor(p) {
  if (p >= 75) return ACCENTS.emerald;
  if (p >= 50) return ACCENTS.amber;
  return ACCENTS.rose;
}

/** Small chart header with an optional explanatory line. */
function ChartHead({ title, description }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
  );
}

/** Section heading with a plain-language description so any user gets the gist. */
export function SectionTitle({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

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
export function DonutChart({ title, description, data }) {
  const total = data.reduce((s, [, v]) => s + v, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="p-5">
      <ChartHead title={title} description={description} />
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
              <span className="w-9 text-right text-xs text-muted">{Math.round((value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Horizontal bar list. data: [ [label, value], ... ] */
export function BarList({ title, description, data, className, unit = "" }) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  return (
    <Card className={cn("p-5", className)}>
      <ChartHead title={title} description={description} />
      <ul className="mt-4 space-y-3">
        {data.map(([label, value], i) => (
          <li key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate text-foreground/80">{label}</span>
              <span className="font-semibold text-foreground">{value}{unit}</span>
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

/** Accent-topped headline tile (richer than StatCard). */
export function MetricTile({ label, value, hint, icon, accent = "brand" }) {
  const color = ACCENTS[accent] || accent;
  return (
    <Card className="relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

/**
 * Radial gauge for a single ratio. `value` in the same unit as `suffix`; the arc
 * fills value/max. Colour auto-thresholds unless `tone` (accent key) is given.
 */
export function Gauge({ value, max = 100, suffix = "%", label, hint, tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = tone ? ACCENTS[tone] || tone : pctColor(pct);
  return (
    <Card className="flex flex-col items-center gap-3 p-5 text-center">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <g transform="rotate(-90 64 64)">
            <circle cx="64" cy="64" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="12" />
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{value}{suffix}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

/** Ranked horizontal bars with position index, value and share of total. */
export function RankBars({ title, description, data, unit = "", showShare = true }) {
  const total = data.reduce((s, [, v]) => s + v, 0);
  const max = Math.max(1, ...data.map(([, v]) => v));
  return (
    <Card className="p-5">
      <ChartHead title={title} description={description} />
      {data.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {data.map(([label, value], i) => (
            <li key={label}>
              <div className="mb-1.5 flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[11px] font-semibold text-muted">{i + 1}</span>
                <span className="min-w-0 truncate text-foreground/80">{label}</span>
                <span className="ml-auto font-semibold text-foreground">{value}{unit}</span>
                {showShare && total > 0 && (
                  <span className="w-9 text-right text-xs text-muted">{Math.round((value / total) * 100)}%</span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Area/line trend over an ordered series. data: [ [label, value], ... ]. */
export function TrendArea({ title, description, data, unit = "%", baseline = 100 }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = 200;
  const P = { l: 34, r: 12, t: 14, b: 26 };
  const n = data.length;
  const maxV = Math.max(baseline, ...data.map(([, v]) => v));
  const X = (i) => P.l + (n <= 1 ? (W - P.l - P.r) / 2 : (i / (n - 1)) * (W - P.l - P.r));
  const Y = (v) => P.t + (1 - v / maxV) * (H - P.t - P.b);
  const pts = data.map(([, v], i) => [X(i), Y(v)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = n ? `${line} L ${X(n - 1).toFixed(1)} ${H - P.b} L ${X(0).toFixed(1)} ${H - P.b} Z` : "";
  const ticks = [0, Math.round(maxV / 2), maxV];
  const labelIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
  return (
    <Card className="p-5">
      <ChartHead title={title} description={description} />
      {n === 0 ? (
        <p className="mt-6 text-sm text-muted">No data yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" style={{ height: "auto" }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea5829" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ea5829" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={P.l} y1={Y(t)} x2={W - P.r} y2={Y(t)} stroke="rgb(var(--border))" strokeWidth="1" strokeDasharray="3 3" />
              <text x={P.l - 6} y={Y(t) + 3} textAnchor="end" fontSize="10" fill="rgb(var(--muted))">{t}{unit}</text>
            </g>
          ))}
          {area && <path d={area} fill="url(#trendFill)" />}
          <path d={line} fill="none" stroke="#ea5829" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {pts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={hover === i ? 5 : 3} fill="rgb(var(--surface))" stroke="#ea5829" strokeWidth="2" />
              {/* Larger transparent hit area for easier hovering / tapping. */}
              <circle
                cx={x}
                cy={y}
                r="14"
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover((h) => (h === i ? null : i))}
              >
                <title>{`${data[i][0]}: ${data[i][1]}${unit}`}</title>
              </circle>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={i} x={X(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10" fill="rgb(var(--muted))">
              {data[i][0]}
            </text>
          ))}
          {/* Hover tooltip: the percentage on the hovered point. */}
          {hover != null && pts[hover] && (
            <g pointerEvents="none">
              {(() => {
                const [hx, hy] = pts[hover];
                const val = `${data[hover][1]}${unit}`;
                const boxW = 16 + val.length * 8.5;
                const boxX = Math.min(Math.max(hx - boxW / 2, 2), W - boxW - 2);
                const above = hy > 44;
                const boxY = above ? hy - 34 : hy + 12;
                return (
                  <>
                    <rect x={boxX} y={boxY} width={boxW} height={24} rx="6" fill="rgb(var(--foreground))" opacity="0.94" />
                    <text x={boxX + boxW / 2} y={boxY + 16} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="rgb(var(--background))">
                      {val}
                    </text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      )}
    </Card>
  );
}
