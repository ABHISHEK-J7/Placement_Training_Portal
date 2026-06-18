"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { TimetableTable } from "./TimetableTable";
import { SyllabusTable } from "./SyllabusTable";

/** Picks an icon for each assessment by its title. */
function AssessmentIcon({ title }) {
  if (title.toLowerCase().includes("pre")) {
    // Flag — pre-assessment
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (title.toLowerCase().includes("grand")) {
    // Trophy — grand test
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 20h6M12 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Clock — daily test
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProgramExplorer({ programs, initialSlug }) {
  const [active, setActive] = useState(initialSlug);
  const program = programs.find((p) => p.slug === active) ?? programs[0];

  const select = (slug) => {
    setActive(slug);
    // Keep the URL shareable without a full navigation / scroll jump.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("track", slug);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Training programs"
        className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1"
      >
        {programs.map((p) => {
          const selected = p.slug === active;
          return (
            <button
              key={p.slug}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${p.slug}`}
              id={`tab-${p.slug}`}
              onClick={() => select(p.slug)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-brand text-white shadow-sm"
                  : "text-foreground/70 hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {p.title}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${program.slug}`}
        aria-labelledby={`tab-${program.slug}`}
        className="mt-8 animate-fade-up"
      >
        {/* Overview */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{program.tagline}</Badge>
              {program.tracks.map((t) => (
                <Badge key={t} tone="brand">
                  {t}
                </Badge>
              ))}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {program.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {program.description}
            </p>
          </div>
          <Card className="shrink-0 px-5 py-4">
            <dl className="space-y-2 text-sm">
              {[
                { label: "Duration", value: `${program.durationDays} days` },
                { label: "Daily Test", value: "8–9 PM" },
                { label: "Pre-Assessment", value: "Day 1" },
                { label: "Grand Test", value: "6th & 12th days" },
              ].map((fact) => (
                <div key={fact.label} className="flex items-center justify-between gap-8">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="font-semibold text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        {/* Timetable */}
        <section className="mt-10" aria-label="Daily timetable">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Daily Timetable</h3>
          <div className="grid gap-5">
            {program.timetables.map((tt) => (
              <TimetableTable key={tt.batch} timetable={tt} />
            ))}
          </div>
        </section>

        {/* Syllabus */}
        <section className="mt-10" aria-label="Day-wise syllabus">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Day-wise Syllabus</h3>
            <p className="text-sm text-muted">
              {program.durationDays}-day track across{" "}
              {program.tracks.join(", ").replace(/, ([^,]*)$/, " & $1")}.
            </p>
          </div>
          <SyllabusTable program={program} />
        </section>

        {/* Assessments */}
        <section className="mt-10" aria-label="Assessments">
          <h3 className="mb-1 text-lg font-semibold text-foreground">Assessments</h3>
          <p className="mb-4 text-sm text-muted">
            Three assessment touchpoints frame the program — a one-time pre-assessment
            on Day 1, a test at the end of every day, and two milestone grand tests on
            Days 6 &amp; 12.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {program.assessments.map((a) => (
              <Card key={a.title} className="flex gap-4 p-5">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                >
                  <AssessmentIcon title={a.title} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-foreground">{a.title}</h4>
                    <Badge tone="outline">{a.timing}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {a.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
