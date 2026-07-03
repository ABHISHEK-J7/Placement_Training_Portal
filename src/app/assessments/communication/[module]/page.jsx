"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, DonutChart, BarList } from "@/components/dashboard/charts";
import { apiGet } from "@/lib/apiClient";
import { seesAllStudents, roleLabel, sameDept } from "@/lib/roles";
import { cn } from "@/lib/utils";

const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
function accTone(a) {
  if (a >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (a >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}
function fmtDur(sec) {
  const s = num(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function accBands(vals) {
  const b = { "0–24%": 0, "25–49%": 0, "50–74%": 0, "75–100%": 0 };
  for (const v of vals) { if (v < 25) b["0–24%"] += 1; else if (v < 50) b["25–49%"] += 1; else if (v < 75) b["50–74%"] += 1; else b["75–100%"] += 1; }
  return Object.entries(b).filter(([, n]) => n > 0);
}

export default function CommunicationResultPage() {
  const { module: rawModule } = useParams();
  const moduleName = decodeURIComponent(rawModule || "");
  const { user } = useAuth();

  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("accuracy");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const d = await apiGet("/communication");
        if (cancel) return;
        if (!d.ok) setError(d.error || "Communication results are unavailable.");
        setAttempts((d.attempts || []).filter((a) => (a.collectionName || "") === moduleName));
      } catch (e) {
        if (!cancel) setError(e.message || "Could not load communication results.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [moduleName]);

  const seesAll = user ? seesAllStudents(user) : false;

  const scoped = useMemo(() => {
    const list = attempts || [];
    return seesAll ? list : list.filter((a) => sameDept(a.branch, user?.department));
  }, [attempts, seesAll, user]);

  const stats = useMemo(() => {
    const rows = scoped;
    const withAcc = rows.filter((r) => r.accuracy != null);
    const students = new Set(rows.map((r) => r._id)).size;
    return {
      attempts: rows.length,
      students,
      avgAccuracy: withAcc.length ? Math.round(withAcc.reduce((a, r) => a + Number(r.accuracy), 0) / withAcc.length) : 0,
      avgDuration: rows.length ? Math.round(rows.reduce((a, r) => a + (Number(r.duration) || 0), 0) / rows.length) : 0,
    };
  }, [scoped]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scoped.filter((r) =>
      q === "" ? true : (r.roll_no || "").toLowerCase().includes(q) || (r.first_name || "").toLowerCase().includes(q),
    );
    const cmp = {
      accuracy: (a, b) => num(b.accuracy) - num(a.accuracy),
      duration: (a, b) => num(a.duration) - num(b.duration),
      name: (a, b) => (a.first_name || "").localeCompare(b.first_name || ""),
      date: (a, b) => String(b.attempted_date || "").localeCompare(String(a.attempted_date || "")),
    }[sort];
    return [...list].sort(cmp);
  }, [scoped, query, sort]);

  const accDist = useMemo(() => accBands(scoped.filter((r) => r.accuracy != null).map((r) => num(r.accuracy))), [scoped]);
  const byBranch = useMemo(() => {
    const m = new Map();
    for (const r of scoped) {
      const k = r.branch || "—";
      const e = m.get(k) || { branch: k, n: 0, acc: 0 };
      e.n += 1; e.acc += num(r.accuracy);
      m.set(k, e);
    }
    return [...m.values()].map((e) => ({ branch: e.branch, students: e.n, avgAccuracy: Math.round(e.acc / e.n) })).sort((a, b) => b.avgAccuracy - a.avgAccuracy);
  }, [scoped]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");
      const aoa = [
        ["Roll No", "Name", "Branch", "Accuracy", "Duration (s)", "Attempted"],
        ...rows.map((r) => [r.roll_no, r.first_name || "", r.branch || "", num(r.accuracy), num(r.duration), r.attempted_date || ""]),
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Communication");
      XLSX.writeFile(wb, `communication-${moduleName}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link href="/assessments" className="text-sm text-muted hover:text-brand">← Assessments</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{moduleName || "Communication"}</h2>
              <Badge tone="brand">Communication</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">Myna communication module results.</p>
          </div>
          <Badge tone="brand">{seesAll ? roleLabel(user.role) : user.department}</Badge>
        </div>
      </div>

      {loading ? (
        <Card className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" /></Card>
      ) : scoped.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No attempts</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{error || (seesAll ? "No students have attempted this module in the selected period." : `No students from your department (${user.department}) attempted this module.`)}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students" value={stats.students} hint={seesAll ? "Attempted" : user.department} />
            <StatCard label="Attempts" value={stats.attempts} hint="Total records" />
            <StatCard label="Avg Accuracy" value={`${stats.avgAccuracy}%`} hint="Across attempts" />
            <StatCard label="Avg Time" value={fmtDur(stats.avgDuration)} hint="Per attempt" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DonutChart title="Accuracy distribution" data={accDist} />
            {byBranch.length > 1 ? (
              <BarList title="Average accuracy by department" data={byBranch.map((b) => [b.branch, b.avgAccuracy])} />
            ) : (
              <Card className="flex flex-col justify-center p-5">
                <p className="text-sm font-medium text-muted">Average accuracy</p>
                <p className={cn("mt-2 text-4xl font-bold", accTone(stats.avgAccuracy))}>{stats.avgAccuracy}%</p>
                <p className="mt-1 text-xs text-muted">{stats.attempts} attempts by {stats.students} students</p>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Attempts</h3>
                <p className="text-xs text-muted">{rows.length} record{rows.length === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roll or name…" className="h-10 w-52 rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-full border border-border bg-surface px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="accuracy">Sort: Accuracy</option>
                  <option value="duration">Sort: Time</option>
                  <option value="date">Sort: Date</option>
                  <option value="name">Sort: Name</option>
                </select>
                <Button size="sm" onClick={onDownload} disabled={downloading || rows.length === 0}>{downloading ? "…" : "⬇ Excel"}</Button>
              </div>
            </div>
            <div className="max-h-[65vh] overflow-auto scrollbar-thin">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    {["#", "Roll No", "Name", "Branch", "Accuracy", "Time", "Attempted"].map((h, i) => (
                      <th key={h} className={cn("sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", i >= 4 && i <= 5 && "text-center")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={`${r._id}-${i}`} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-3 text-muted">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.roll_no || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-foreground">{r.first_name || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3">{r.branch ? <Badge tone="neutral">{r.branch}</Badge> : <span className="text-muted">—</span>}</td>
                      <td className={cn("px-4 py-3 text-center font-semibold", accTone(num(r.accuracy)))}>{r.accuracy != null ? `${num(r.accuracy)}%` : "—"}</td>
                      <td className="px-4 py-3 text-center text-muted">{fmtDur(r.duration)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{r.attempted_date || "—"}</td>
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
