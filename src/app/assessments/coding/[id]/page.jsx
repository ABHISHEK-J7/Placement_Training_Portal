"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, DonutChart, BarList } from "@/components/dashboard/charts";
import { apiPost } from "@/lib/apiClient";
import { seesAllStudents, roleLabel, sameDept } from "@/lib/roles";
import { cn } from "@/lib/utils";

const num = (v) => Math.round(Number(v) || 0);
function resultTone(r) {
  if (r === "Pass") return "text-emerald-600 dark:text-emerald-400";
  if (r === "Fail") return "text-red-500";
  return "text-muted";
}
function pctBands(vals) {
  const b = { "0–24%": 0, "25–49%": 0, "50–74%": 0, "75–100%": 0 };
  for (const v of vals) {
    if (v < 25) b["0–24%"] += 1; else if (v < 50) b["25–49%"] += 1; else if (v < 75) b["50–74%"] += 1; else b["75–100%"] += 1;
  }
  return Object.entries(b).filter(([, n]) => n > 0);
}

export default function CodingResultPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("overall");
  const [picked, setPicked] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const d = await apiPost("/coding/report", { test_id: id });
        if (!cancel) setData(d);
      } catch (e) {
        if (!cancel) setError(e.message || "Could not load coding results.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  const seesAll = user ? seesAllStudents(user) : false;
  const test = data?.test || null;
  const hasCoding = test?.has_coding;

  const scoped = useMemo(() => {
    const list = data?.students || [];
    return seesAll ? list : list.filter((s) => sameDept(s.branch, user?.department));
  }, [data, seesAll, user]);

  const stats = useMemo(() => {
    const rows = scoped;
    const done = rows.filter((s) => s.attempted);
    const passed = rows.filter((s) => s.overall_result === "Pass").length;
    const failed = rows.filter((s) => s.overall_result === "Fail").length;
    const avg = (fn) => (done.length ? Math.round(done.reduce((a, s) => a + (Number(fn(s)) || 0), 0) / done.length) : 0);
    return {
      assigned: rows.length,
      attempted: done.length,
      notAttempted: rows.length - done.length,
      passed, failed,
      passRate: done.length ? Math.round((passed / done.length) * 100) : 0,
      avgMcq: avg((s) => s.mcq_percentage),
      avgCoding: avg((s) => s.coding_percentage),
      violations: rows.reduce((a, s) => a + (Number(s.violations) || 0), 0),
    };
  }, [scoped]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scoped.filter((s) =>
      q === "" ? true : (s.roll_no || "").toLowerCase().includes(q) || (s.first_name || "").toLowerCase().includes(q),
    );
    const cmp = {
      overall: (a, b) => (num(b.mcq_percentage) + num(b.coding_percentage)) - (num(a.mcq_percentage) + num(a.coding_percentage)),
      mcq: (a, b) => num(b.mcq_percentage) - num(a.mcq_percentage),
      coding: (a, b) => num(b.coding_percentage) - num(a.coding_percentage),
      name: (a, b) => (a.first_name || "").localeCompare(b.first_name || ""),
    }[sort];
    return [...list].sort(cmp);
  }, [scoped, query, sort]);

  const resultDist = useMemo(() => {
    const b = { Pass: 0, Fail: 0, "Not Attempted": 0 };
    for (const s of scoped) b[s.overall_result === "Pass" ? "Pass" : s.overall_result === "Fail" ? "Fail" : "Not Attempted"] += 1;
    return Object.entries(b).filter(([, n]) => n > 0);
  }, [scoped]);
  const mcqDist = useMemo(() => pctBands(scoped.filter((s) => s.attempted).map((s) => num(s.mcq_percentage))), [scoped]);
  const codingDist = useMemo(() => pctBands(scoped.filter((s) => s.attempted).map((s) => num(s.coding_percentage))), [scoped]);
  const byBranch = useMemo(() => {
    const m = new Map();
    for (const s of scoped) {
      const k = s.branch || "—";
      const e = m.get(k) || { branch: k, n: 0, mcq: 0, code: 0 };
      e.n += 1; e.mcq += num(s.mcq_percentage); e.code += num(s.coding_percentage);
      m.set(k, e);
    }
    return [...m.values()].map((e) => ({ ...e, avgMcq: Math.round(e.mcq / e.n), avgCode: Math.round(e.code / e.n) })).sort((a, b) => b.avgMcq - a.avgMcq);
  }, [scoped]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");
      const aoa = [
        ["Torii Number", "Name", "Branch", "MCQ Correct", "MCQ Total", "MCQ %", "MCQ Result", "Coding %", "Coding Result", "Overall", "Violations"],
        ...rows.map((s) => [s.roll_no, s.first_name || "", s.branch || "", s.mcq_total_correct ?? "", s.mcq_total_questions ?? "", num(s.mcq_percentage), s.mcq_result || "-", num(s.coding_percentage), s.coding_result || "-", s.overall_result || "-", s.violations ?? 0]),
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Coding");
      XLSX.writeFile(wb, `coding-${test?.module_test_name || id}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  const onDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { downloadTablePdf } = await import("@/lib/pdf");
      await downloadTablePdf({
        title: `Coding — ${test?.module_test_name || id}`,
        subtitle: `${rows.length} students`,
        sections: [{
          head: ["Torii Number", "Name", "Branch", "MCQ Correct", "MCQ Total", "MCQ %", "MCQ Result", "Coding %", "Coding Result", "Overall", "Violations"],
          body: rows.map((s) => [s.roll_no, s.first_name || "", s.branch || "", String(s.mcq_total_correct ?? ""), String(s.mcq_total_questions ?? ""), String(num(s.mcq_percentage)), s.mcq_result || "-", String(num(s.coding_percentage)), s.coding_result || "-", s.overall_result || "-", String(s.violations ?? 0)]),
          columnStyles: { 1: { halign: "left" } },
        }],
        orientation: "l",
        filename: `coding-${test?.module_test_name || id}.pdf`,
      });
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
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{test?.module_test_name || "Coding Test"}</h2>
              <Badge tone="brand">Coding</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{test ? [test.module_name, test.technology_name].filter(Boolean).join(" · ") : ""}</p>
          </div>
          <Badge tone="brand">{seesAll ? roleLabel(user.role) : user.department}</Badge>
        </div>
        {test && (
          <div className="mt-3 flex flex-wrap gap-2">
            {test.has_mcq && <Badge tone="neutral">MCQ</Badge>}
            {test.has_coding && <Badge tone="neutral">Coding</Badge>}
          </div>
        )}
      </div>

      {loading ? (
        <Card className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" /></Card>
      ) : error ? (
        <Card className="px-6 py-16 text-center"><h3 className="text-base font-semibold text-foreground">Couldn’t load results</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted">{error}</p></Card>
      ) : scoped.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No students</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{seesAll ? "No students are assigned to this test." : `No students from your department (${user.department}) are assigned to this test.`}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <StatCard label="Assigned" value={stats.assigned} hint={seesAll ? "Total" : user.department} />
            <StatCard label="Attempted" value={stats.attempted} hint={`${stats.notAttempted} pending`} />
            <StatCard label="Pass Rate" value={`${stats.passRate}%`} hint={`${stats.passed} passed · ${stats.failed} failed`} />
            <StatCard label="Avg MCQ" value={`${stats.avgMcq}%`} hint="Of attempted" />
            {hasCoding && <StatCard label="Avg Coding" value={`${stats.avgCoding}%`} hint="Of attempted" />}
            <StatCard label="Violations" value={stats.violations} hint="Total flagged" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DonutChart title="Result breakdown" data={resultDist} />
            {hasCoding ? <BarList title="Coding score distribution" data={codingDist} /> : <BarList title="MCQ score distribution" data={mcqDist} />}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="MCQ score distribution" data={mcqDist} />
            {byBranch.length > 1 ? (
              <BarList title="Average MCQ % by department" data={byBranch.map((b) => [b.branch, b.avgMcq])} />
            ) : (
              <Card className="flex flex-col justify-center p-5">
                <p className="text-sm font-medium text-muted">Attempted</p>
                <p className="mt-2 text-4xl font-bold text-foreground">{stats.attempted}<span className="text-lg text-muted">/{stats.assigned}</span></p>
                <p className="mt-1 text-xs text-muted">{stats.notAttempted} not attempted yet</p>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Student results</h3>
                <p className="text-xs text-muted">{rows.length} students · click a row for the full report</p>
              </div>
              <div className="flex items-center gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Torii or name…" className="h-10 w-52 rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-full border border-border bg-surface px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="overall">Sort: Overall</option>
                  <option value="mcq">Sort: MCQ</option>
                  <option value="coding">Sort: Coding</option>
                  <option value="name">Sort: Name</option>
                </select>
                <Button variant="secondary" size="sm" onClick={onDownload} disabled={downloading || rows.length === 0}>⬇ Excel</Button>
                <Button size="sm" onClick={onDownloadPdf} disabled={downloading || rows.length === 0}>{downloading ? "…" : "⬇ PDF"}</Button>
              </div>
            </div>
            <div className="max-h-[65vh] overflow-auto scrollbar-thin">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    {["#", "Torii Number", "Name", "Branch", "MCQ", "Coding", "Overall", "Viol."].map((h, i) => (
                      <th key={h} className={cn("sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", i >= 4 && "text-center")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((s, i) => (
                    <tr key={s._id} onClick={() => setPicked(s)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-3 text-muted">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{s.roll_no}</td>
                      <td className="px-4 py-3 text-foreground">{s.first_name || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3">{s.branch ? <Badge tone="neutral">{s.branch}</Badge> : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-center">{s.attempted ? <span className={cn("font-semibold", resultTone(s.mcq_result))}>{num(s.mcq_percentage)}%</span> : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-center">{s.attempted && test?.has_coding ? <span className={cn("font-semibold", resultTone(s.coding_result))}>{num(s.coding_percentage)}%</span> : <span className="text-muted">—</span>}</td>
                      <td className={cn("px-4 py-3 text-center text-xs font-semibold", resultTone(s.overall_result))}>{s.overall_result || "—"}</td>
                      <td className="px-4 py-3 text-center text-muted">{s.violations || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {picked && <StudentReportModal student={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}

function StudentReportModal({ student, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    apiPost("/coding/student", { result_id: student._id })
      .then((d) => { if (!cancel) setReport(d.report || null); })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [student]);

  const s = report?.summary || {};
  const mcq = report?.mcq_result || {};
  const coding = report?.coding_result || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-card-hover sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{student.first_name || student.roll_no}</h3>
            <p className="text-xs text-muted"><span className="font-mono">{student.roll_no}</span>{student.branch ? ` · ${student.branch}` : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-5 scrollbar-thin">
          {loading ? (
            <div className="grid place-items-center py-10"><div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-brand" /></div>
          ) : !report ? (
            <p className="py-8 text-center text-sm text-muted">No detailed report available.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat label="Overall" value={s.overall_result || "—"} tone={resultTone(s.overall_result)} />
                <MiniStat label="MCQ" value={`${num(s.mcq_percentage)}%`} />
                <MiniStat label="Coding" value={`${num(s.coding_percentage)}%`} />
                <MiniStat label="Violations" value={s.violations ?? 0} />
                <MiniStat label="Re-submits" value={s.already_submitted_count ?? 0} />
              </div>
              <div className="rounded-xl border border-border p-4 text-sm">
                <p className="font-semibold text-foreground">MCQ</p>
                <p className="mt-1 text-muted">Correct {mcq.total_correct ?? 0}/{mcq.total_questions ?? 0} · Wrong {mcq.wrong_questions ?? 0} · Skipped {mcq.skipped_questions ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border p-4 text-sm">
                <p className="font-semibold text-foreground">Coding</p>
                <p className="mt-1 text-muted">Score {coding.earned_score ?? 0}/{coding.total_score ?? 0} · Problems {coding.total_problems ?? 0}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
      <p className={cn("text-lg font-bold", tone || "text-foreground")}>{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
