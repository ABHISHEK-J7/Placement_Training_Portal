"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet } from "@/lib/apiClient";
import { roleLabel, seesAllStudents } from "@/lib/roles";
import { parseDateTime, levelLabel, typeLabel } from "@/lib/assessments";
import { cn } from "@/lib/utils";

// Only these placement batches are shown on this portal.
const ALLOWED_BATCHES = ["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"];
const ALLOWED = new Set(ALLOWED_BATCHES);

const FIELD =
  "h-10 rounded-full border border-border bg-surface px-4 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30";

const TYPE_TONE = {
  ai: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  general: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  certification: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};
const LEVEL_TONE = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-red-500",
  any: "text-muted",
};

export default function AssessmentsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState("daily"); // "daily" | "grand"
  const [list, setList] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [batchF, setBatchF] = useState("all");
  const [deptF, setDeptF] = useState("all");

  // Directory once.
  useEffect(() => {
    apiGet("/students").then((d) => setDirectory(d.students || [])).catch(() => setDirectory([]));
  }, []);

  // Catalog whenever the toggle changes.
  useEffect(() => {
    let cancel = false;
    setLoaded(false);
    setError("");
    apiGet(`/assessments?type=${mode}`)
      .then((d) => { if (!cancel) setList(d.assessments || []); })
      .catch((e) => { if (!cancel) setError(e.message || "Could not load assessments."); })
      .finally(() => { if (!cancel) setLoaded(true); });
    return () => { cancel = true; };
  }, [mode]);

  const seesAll = user ? seesAllStudents(user) : false;

  const inScope = useMemo(() => list.filter((a) => a.batchList?.some((b) => ALLOWED.has(b))), [list]);

  // batch → set of departments (from the directory).
  const batchDepts = useMemo(() => {
    const m = new Map();
    for (const s of directory) {
      if (!ALLOWED.has(s.batch)) continue;
      if (!m.has(s.batch)) m.set(s.batch, new Set());
      if (s.department) m.get(s.batch).add(s.department);
    }
    return m;
  }, [directory]);

  const deptOptions = useMemo(() => {
    if (!seesAll) return user?.department ? [user.department] : [];
    const set = new Set();
    for (const depts of batchDepts.values()) for (const d of depts) set.add(d);
    return [...set].sort();
  }, [batchDepts, seesAll, user]);

  const effDept = seesAll ? deptF : user?.department || "all";

  const batchOptions = useMemo(
    () => ALLOWED_BATCHES.filter((b) => inScope.some((a) => a.batchList.includes(b))),
    [inScope],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inScope
      .filter((a) => (batchF === "all" ? true : a.batchList.includes(batchF)))
      .filter((a) => (effDept === "all" ? true : a.batchList.some((b) => batchDepts.get(b)?.has(effDept))))
      .filter((a) =>
        q === "" ? true : `${a.title} ${a.topic} ${a.module} ${a.technology}`.toLowerCase().includes(q),
      )
      .sort((a, b) => parseDateTime(b.start).ts - parseDateTime(a.start).ts);
  }, [inScope, batchF, effDept, query, batchDepts]);

  const anyFilter = batchF !== "all" || (seesAll && deptF !== "all") || query !== "";
  const resetFilters = () => { setQuery(""); setBatchF("all"); setDeptF("all"); };
  const switchMode = (m) => { if (m === mode) return; setMode(m); setBatchF("all"); setQuery(""); };

  const isGrand = mode === "grand";

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Assessments</h2>
          <p className="mt-1 text-sm text-muted">
            {loaded ? `${filtered.length} ${isGrand ? "grand" : "daily"} assessment${filtered.length === 1 ? "" : "s"}` : "Loading…"} · click one to see who attended &amp; their results.
          </p>
        </div>
        <Badge tone="brand">{seesAll ? roleLabel(user.role) : user.department}</Badge>
      </div>

      {/* Daily / Grand toggle */}
      <div className="inline-flex rounded-full border border-border bg-surface-2 p-1">
        {[["daily", "Daily Assessments"], ["grand", "Grand Assessments"]].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              mode === m ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters: Department + Batch + search */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        {seesAll ? (
          <select className={FIELD} value={deptF} onChange={(e) => setDeptF(e.target.value)} aria-label="Department">
            <option value="all">All departments</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <Badge tone="neutral">Department · {user.department}</Badge>
        )}
        <select className={FIELD} value={batchF} onChange={(e) => setBatchF(e.target.value)} aria-label="Batch">
          <option value="all">All batches</option>
          {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="relative max-w-xs flex-1">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
        {anyFilter && <button type="button" onClick={resetFilters} className="text-sm font-medium text-brand hover:underline">Reset</button>}
      </Card>

      {!loaded ? (
        <Card className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" /></Card>
      ) : error ? (
        <Card className="px-6 py-16 text-center"><h3 className="text-base font-semibold text-foreground">Couldn’t load assessments</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted">{error}</p></Card>
      ) : filtered.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No {isGrand ? "grand" : "daily"} assessments to show</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {inScope.length === 0
              ? `No ${isGrand ? "grand" : "daily"} assessments have been published for PT_AI_READY_2027, PT_IT_2027 or PT_NON_IT_2027 yet.`
              : "No assessments match the current Department / Batch selection."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[72vh] overflow-auto scrollbar-thin">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  {["#", isGrand ? "Assessment" : "Topic", isGrand ? "Topics" : "Module", "Technology", "Batch", "Level", "Type", "Qs", "Date"].map((h, i) => (
                    <th key={h} className={cn("sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", i === 7 && "text-center")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a, i) => (
                  <tr key={a.id} onClick={() => router.push(`/assessments/${a.id}?type=${mode}`)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3 text-muted">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{a.title}</td>
                    <td className="px-4 py-3 text-muted">{a.isGrand ? `${a.topicCount} topics` : a.module}</td>
                    <td className="px-4 py-3 text-foreground/80">{a.technology}</td>
                    <td className="px-4 py-3">
                      {a.batchList.length > 1
                        ? <span className="text-xs text-foreground/80">{a.batchList.join(", ")}</span>
                        : <Badge tone="neutral">{a.batch}</Badge>}
                    </td>
                    <td className={cn("px-4 py-3 font-medium capitalize", LEVEL_TONE[a.level] || "text-muted")}>{levelLabel(a.level)}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", TYPE_TONE[a.testType] || "bg-surface-2 text-muted")}>{typeLabel(a.testType)}</span></td>
                    <td className="px-4 py-3 text-center text-muted">{a.questions || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{parseDateTime(a.start).dateLabel || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
