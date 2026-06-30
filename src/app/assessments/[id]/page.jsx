"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/charts";
import { apiGet, apiPost } from "@/lib/apiClient";
import { directoryMap } from "@/lib/attendanceData";
import { seesAllStudents, roleLabel } from "@/lib/roles";
import {
  enrichResults,
  resultStats,
  parseDateTime,
  levelLabel,
  typeLabel,
  fmtTime,
} from "@/lib/assessments";
import { cn } from "@/lib/utils";

function scoreTone(s) {
  if (s < 0) return "text-red-500";
  if (s === 0) return "text-muted";
  return "text-emerald-600 dark:text-emerald-400";
}
function accTone(a) {
  if (a >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (a >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}

export default function AssessmentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  // "daily" | "grand" — carried from the catalog via ?type=
  const [type] = useState(() => {
    if (typeof window === "undefined") return "daily";
    return new URLSearchParams(window.location.search).get("type") === "grand" ? "grand" : "daily";
  });
  const isGrand = type === "grand";

  const [meta, setMeta] = useState(null);
  const [rawRows, setRawRows] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("score");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const [cat, det, dir] = await Promise.all([
          apiGet(`/assessments?type=${type}`).catch(() => ({ assessments: [] })),
          apiPost("/assessments/details", { assessment: id, type }),
          apiGet("/students").catch(() => ({ students: [] })),
        ]);
        if (cancel) return;
        setMeta((cat.assessments || []).find((a) => a.id === id) || null);
        setRawRows(det.result || []);
        setDirectory(dir.students || []);
      } catch (e) {
        if (!cancel) setError(e.message || "Could not load assessment results.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id, type]);

  const seesAll = user ? seesAllStudents(user) : false;
  const dirMap = useMemo(() => directoryMap(directory), [directory]);

  const allRows = useMemo(() => (rawRows ? enrichResults(rawRows, dirMap) : []), [rawRows, dirMap]);
  const scoped = useMemo(
    () => (seesAll ? allRows : allRows.filter((r) => r.branch === user?.department)),
    [allRows, seesAll, user],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scoped.filter((r) =>
      q === "" ? true : (r.torii || "").toLowerCase().includes(q) || (r.name || "").toLowerCase().includes(q) || (r.usn || "").toLowerCase().includes(q),
    );
    const cmp = {
      score: (a, b) => b.score - a.score,
      accuracy: (a, b) => b.accuracy - a.accuracy,
      time: (a, b) => a.time - b.time,
      name: (a, b) => (a.name || "").localeCompare(b.name || ""),
    }[sort];
    return [...list].sort(cmp);
  }, [scoped, query, sort]);

  const stats = useMemo(() => resultStats(scoped, meta?.questions), [scoped, meta]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      const { downloadAssessmentExcel } = await import("@/lib/assessmentsExport");
      await downloadAssessmentExcel({ rows, filename: `${isGrand ? "grand-" : ""}assessment-${meta?.title || id}.xlsx` });
    } finally {
      setDownloading(false);
    }
  };

  if (!user) return null;

  const subtitle = meta
    ? [isGrand ? null : meta.module, meta.technology, meta.batch, meta.start ? parseDateTime(meta.start).dateLabel : null]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link href="/assessments" className="text-sm text-muted hover:text-brand">← Assessments</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{meta?.title || "Assessment"}</h2>
              <Badge tone={isGrand ? "brand" : "neutral"}>{isGrand ? "Grand" : "Daily"}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          <Badge tone="brand">{seesAll ? roleLabel(user.role) : user.department}</Badge>
        </div>
        {meta && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="neutral">Level: {levelLabel(meta.level)}</Badge>
            <Badge tone="neutral">Type: {typeLabel(meta.testType)}</Badge>
            <Badge tone="neutral">{meta.questions} questions</Badge>
            {isGrand && meta.topicCount > 0 && <Badge tone="neutral">{meta.topicCount} topics</Badge>}
            {isGrand && meta.duration ? <Badge tone="neutral">{meta.duration} min</Badge> : null}
            {!isGrand && meta.college && meta.college !== "—" && <Badge tone="neutral">{meta.college}</Badge>}
          </div>
        )}
      </div>

      {loading ? (
        <Card className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" /></Card>
      ) : error ? (
        <Card className="px-6 py-16 text-center"><h3 className="text-base font-semibold text-foreground">Couldn’t load results</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted">{error}</p></Card>
      ) : scoped.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No students yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {(rawRows || []).length === 0 ? "No students have attended this assessment yet." : `No students from your department (${user.department}) attended this assessment.`}
          </p>
        </Card>
      ) : (
        <>
          {/* Summary — total attended + simple result figures */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students Attended" value={stats.attempts} hint={seesAll ? "Total" : user.department} />
            <StatCard label="Avg Score" value={stats.avgScore} hint={`Max ${stats.maxScore} · Min ${stats.minScore}`} />
            <StatCard label="Pass Rate" value={`${stats.passRate}%`} hint={`${stats.passCount} ≥ 40% correct`} />
            <StatCard label="Avg Time" value={fmtTime(stats.avgTime)} hint="Per student" />
          </div>

          {/* Student results table */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Student results</h3>
                <p className="text-xs text-muted">{rows.length} student{rows.length === 1 ? "" : "s"} attended</p>
              </div>
              <div className="flex items-center gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Torii, USN or name…" className="h-10 w-52 rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-full border border-border bg-surface px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="score">Sort: Score</option>
                  <option value="accuracy">Sort: Accuracy</option>
                  <option value="time">Sort: Time</option>
                  <option value="name">Sort: Name</option>
                </select>
                <Button size="sm" onClick={onDownload} disabled={downloading || rows.length === 0}>{downloading ? "Preparing…" : "⬇ Excel"}</Button>
              </div>
            </div>
            <div className="max-h-[65vh] overflow-auto scrollbar-thin">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    {["#", "Torii Number", "USN", "Name", "Branch", "Correct", "Wrong", "Score", "Accuracy", "Time"].map((h, i) => (
                      <th key={h} className={cn("sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", i >= 5 && "text-center")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={r.torii} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-3 text-muted">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.torii}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.usn || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-foreground">{r.name || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3">{r.branch ? <Badge tone="neutral">{r.branch}</Badge> : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400">{r.correct}</td>
                      <td className="px-4 py-3 text-center text-red-500">{r.wrong}</td>
                      <td className={cn("px-4 py-3 text-center font-bold", scoreTone(r.score))}>{r.score}</td>
                      <td className={cn("px-4 py-3 text-center font-semibold", accTone(r.accuracy))}>{r.accuracy}%</td>
                      <td className="px-4 py-3 text-center text-muted">{fmtTime(r.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
