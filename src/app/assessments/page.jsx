"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet, apiPost } from "@/lib/apiClient";
import { roleLabel, seesAllStudents, sameDept } from "@/lib/roles";
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

  const [mode, setMode] = useState("daily"); // "daily" | "grand"
  const [list, setList] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [attend, setAttend] = useState({}); // id -> branches[] of attendees
  const [loaded, setLoaded] = useState(false);
  const [countsLoaded, setCountsLoaded] = useState(false);
  const [error, setError] = useState("");

  const [batchF, setBatchF] = useState("all");
  const [deptF, setDeptF] = useState("all");

  useEffect(() => {
    apiGet("/students").then((d) => setDirectory(d.students || [])).catch(() => setDirectory([]));
  }, []);

  // Catalog + per-assessment attendee counts, refetched whenever the toggle changes.
  useEffect(() => {
    let cancel = false;
    setLoaded(false); setCountsLoaded(false); setError(""); setAttend({});
    (async () => {
      let items = [];
      try {
        items = (await apiGet(`/assessments?type=${mode}`)).assessments || [];
      } catch (e) {
        if (!cancel) { setError(e.message || "Could not load assessments."); setLoaded(true); setCountsLoaded(true); }
        return;
      }
      if (cancel) return;
      setList(items); setLoaded(true);
      // Attendee counts from the results API (one call per assessment).
      const inScope = items.filter((a) => a.batchList?.some((b) => ALLOWED.has(b)));
      const map = {};
      await Promise.all(inScope.map(async (a) => {
        try {
          const d = await apiPost("/assessments/details", { assessment: a.id, type: mode });
          map[a.id] = (d.result || []).map((r) => (Array.isArray(r.branch) ? r.branch[0] : r.branch) || "");
        } catch { map[a.id] = []; }
      }));
      if (!cancel) { setAttend(map); setCountsLoaded(true); }
    })();
    return () => { cancel = true; };
  }, [mode]);

  const seesAll = user ? seesAllStudents(user) : false;
  const inScope = useMemo(() => list.filter((a) => a.batchList?.some((b) => ALLOWED.has(b))), [list]);

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
  const batchOptions = useMemo(() => ALLOWED_BATCHES.filter((b) => inScope.some((a) => a.batchList.includes(b))), [inScope]);

  const filtered = useMemo(() => {
    return inScope
      .filter((a) => (batchF === "all" ? true : a.batchList.includes(batchF)))
      .filter((a) => (effDept === "all" ? true : a.batchList.some((b) => { const set = batchDepts.get(b); return set && [...set].some((d) => sameDept(d, effDept)); })))
      .sort((a, b) => parseDateTime(b.start).ts - parseDateTime(a.start).ts);
  }, [inScope, batchF, effDept, batchDepts]);

  // Attendee count per assessment, scoped for HODs.
  const attendedCount = (id) => {
    const branches = attend[id];
    if (!branches) return null; // still loading
    return effDept === "all" ? branches.length : branches.filter((b) => sameDept(b, effDept)).length;
  };

  const anyFilter = batchF !== "all" || (seesAll && deptF !== "all");
  const switchMode = (m) => { if (m === mode) return; setMode(m); setBatchF("all"); };
  const isGrand = mode === "grand";

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Assessments</h2>
          <p className="mt-1 text-sm text-muted">
            {loaded ? `${filtered.length} ${isGrand ? "grand" : "daily"} test${filtered.length === 1 ? "" : "s"}` : "Loading…"} · open a card for full results.
          </p>
        </div>
        <Badge tone="brand">{seesAll ? roleLabel(user.role) : user.department}</Badge>
      </div>

      {/* Daily / Grand toggle */}
      <div className="inline-flex rounded-full border border-border bg-surface-2 p-1">
        {[["daily", "Daily Test"], ["grand", "Grand Test"]].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-semibold transition-colors",
              mode === m ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Department + Batch filters */}
      <div className="flex flex-wrap items-center gap-3">
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
        {anyFilter && <button type="button" onClick={() => { setBatchF("all"); setDeptF("all"); }} className="text-sm font-medium text-brand hover:underline">Reset</button>}
      </div>

      {!loaded ? (
        <Card className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" /></Card>
      ) : error ? (
        <Card className="px-6 py-16 text-center"><h3 className="text-base font-semibold text-foreground">Couldn’t load assessments</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted">{error}</p></Card>
      ) : filtered.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No {isGrand ? "grand" : "daily"} tests to show</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {inScope.length === 0
              ? `No ${isGrand ? "grand" : "daily"} tests have been published for the placement batches yet.`
              : "No tests match the current Department / Batch selection."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const count = attendedCount(a.id);
            return (
              <Link key={a.id} href={`/assessments/${a.id}?type=${mode}`}>
                <Card interactive className="flex h-full flex-col overflow-hidden">
                  <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-brand/10 to-transparent px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", TYPE_TONE[a.testType] || "bg-surface-2 text-muted")}>{typeLabel(a.testType)}</span>
                        <span className={cn("text-xs font-medium capitalize", LEVEL_TONE[a.level] || "text-muted")}>{levelLabel(a.level)}</span>
                      </div>
                      <h3 className="mt-1.5 truncate font-semibold text-foreground">{a.title}</h3>
                      <p className="truncate text-xs text-muted">{a.technology}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold leading-none text-foreground">{count == null ? "…" : count}</p>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">attended</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 px-5 pb-5 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {a.batchList.map((b) => <Badge key={b} tone="neutral">{b}</Badge>)}
                    </div>
                    <p className="text-xs text-muted">
                      {a.isGrand ? `${a.topicCount} topics` : a.module} · {a.questions} questions{a.isGrand && a.duration ? ` · ${a.duration} min` : ""}
                    </p>
                    <p className="text-xs text-muted">{parseDateTime(a.start).dateLabel || "—"}</p>
                    <p className="mt-auto pt-2 text-sm font-medium text-brand">View results →</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {loaded && filtered.length > 0 && !countsLoaded && (
        <p className="text-center text-xs text-muted">Loading attendance counts…</p>
      )}
    </div>
  );
}
