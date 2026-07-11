"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useStudentStatus } from "@/components/students/StudentStatusProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";
import { canManageUsers, seesAllStudents, roleLabel, sameDept } from "@/lib/roles";
import { normalizeUsn, cn } from "@/lib/utils";

const ALLOWED = new Set(["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"]);
const upper = (s) => (s || "").trim().toUpperCase();

export default function StudentsPage() {
  const { user } = useAuth();
  const { isActive, activeOnly, setActiveOnly, setStudentActive, setContinuing, resetAll } = useStudentStatus();
  const [directory, setDirectory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [asmtMap, setAsmtMap] = useState(new Map());
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [batchF, setBatchF] = useState("all");
  const [deptF, setDeptF] = useState("all");
  const [importing, setImporting] = useState(false);
  const [continuingOpen, setContinuingOpen] = useState(false);

  const isAdmin = canManageUsers(user);
  const all = user ? seesAllStudents(user) : false;

  const refresh = useCallback(async () => {
    try {
      const d = await apiGet("/students");
      setDirectory(d.students || []);
    } catch {
      setDirectory([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Live batch roster (Torii numbers per batch) — the authoritative student list.
  useEffect(() => {
    apiGet("/batches").then((r) => setBatches(r.batches || [])).catch(() => setBatches([]));
  }, []);

  // Deep links from the Batches page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const b = p.get("batch");
    const d = p.get("dept");
    if (b) setBatchF(b);
    if (d) setDeptF(d);
  }, []);

  const dirHasTorii = useMemo(() => directory.some((s) => s.torii), [directory]);
  const rosterMode = dirHasTorii && batches.length > 0;

  // Once the directory carries Torii numbers we can join the live API roster; pull
  // the names/departments the assessment API already knows (by Torii) to enrich it.
  useEffect(() => {
    if (!dirHasTorii) return;
    let cancel = false;
    (async () => {
      const [daily, grand] = await Promise.all([
        apiGet("/assessments?type=daily").then((r) => r.assessments || []).catch(() => []),
        apiGet("/assessments?type=grand").then((r) => r.assessments || []).catch(() => []),
      ]);
      const inScope = [...daily, ...grand].filter((a) => a.batchList?.some((b) => ALLOWED.has(b)));
      const map = new Map();
      await Promise.all(inScope.map(async (a) => {
        try {
          const d = await apiPost("/assessments/details", { assessment: a.id, type: a.isGrand ? "grand" : "daily" });
          for (const r of d.result || []) {
            const t = upper(r.roll_no);
            if (t && !map.has(t)) map.set(t, { name: r.first_name || "", department: (Array.isArray(r.branch) ? r.branch[0] : r.branch) || "" });
          }
        } catch { /* skip */ }
      }));
      if (!cancel) setAsmtMap(map);
    })();
    return () => { cancel = true; };
  }, [dirHasTorii]);

  const dirByTorii = useMemo(() => {
    const m = new Map();
    for (const s of directory) if (s.torii) m.set(upper(s.torii), s);
    return m;
  }, [directory]);

  // Roster mode: full API roster joined to directory + assessment names.
  // Otherwise fall back to the imported directory as-is.
  const source = useMemo(() => {
    if (!rosterMode) return directory;
    const out = [];
    for (const b of batches) for (const roll of b.rolls || []) {
      const key = upper(roll);
      const dir = dirByTorii.get(key) || {};
      const asmt = asmtMap.get(key) || {};
      out.push({
        torii: roll,
        usn: dir.usn || "",
        name: dir.name || asmt.name || "",
        department: dir.department || asmt.department || "",
        batch: dir.batch || b.name,
      });
    }
    return out;
  }, [rosterMode, directory, batches, dirByTorii, asmtMap]);

  const scoped = useMemo(() => {
    if (!user) return [];
    return all ? source : source.filter((s) => sameDept(s.department, user.department));
  }, [user, all, source]);

  // Active/inactive split within the current (dept-)scope.
  const viewScoped = useMemo(
    () => (activeOnly ? scoped.filter((s) => isActive(s.torii)) : scoped),
    [scoped, activeOnly, isActive],
  );
  const inactiveInScope = useMemo(
    () => scoped.reduce((n, s) => n + (isActive(s.torii) ? 0 : 1), 0),
    [scoped, isActive],
  );

  // Total headcount in scope (all statuses) and the active subset.
  const scopeTotal = useMemo(() => {
    if (!user) return 0;
    if (all) return batches.reduce((s, b) => s + (b.studentCount || 0), 0) || source.length;
    return scoped.length;
  }, [user, all, batches, scoped, source]);
  const activeTotal = Math.max(0, scopeTotal - inactiveInScope);
  const rosterTotal = activeOnly ? activeTotal : scopeTotal;

  const batchOptions = useMemo(() => [...new Set(scoped.map((s) => s.batch).filter(Boolean))].sort(), [scoped]);
  const deptOptions = useMemo(() => [...new Set(scoped.map((s) => s.department).filter(Boolean))].sort(), [scoped]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = viewScoped
      .filter((s) => (batchF === "all" ? true : s.batch === batchF))
      .filter((s) => (deptF === "all" ? true : s.department === deptF))
      .filter((s) =>
        q === ""
          ? true
          : (s.usn || "").toLowerCase().includes(q) ||
            (s.torii || "").toLowerCase().includes(q) ||
            (s.name || "").toLowerCase().includes(q) ||
            (s.department || "").toLowerCase().includes(q) ||
            (s.batch || "").toLowerCase().includes(q),
      );
    return [...list].sort((a, b) => (a.usn || a.torii || "").localeCompare(b.usn || b.torii || ""));
  }, [viewScoped, query, batchF, deptF]);

  if (!user) return null;

  const gap = all && !rosterMode && rosterTotal > directory.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Students</h2>
          <p className="mt-1 text-sm text-muted">
            {all
              ? `Live batch roster · ${rosterTotal} ${activeOnly ? "continuing" : "students"}`
              : `Students in your department (${user.department}) · ${rosterTotal} ${activeOnly ? "continuing" : "students"}`}
            {inactiveInScope > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}· {inactiveInScope} inactive{activeOnly ? " hidden" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Active-only / all view toggle (shared across the portal) */}
          <div className="flex items-center rounded-full border border-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveOnly(true)}
              className={cn("rounded-full px-3 py-1.5 font-medium transition-colors", activeOnly ? "bg-brand/10 text-brand" : "text-muted hover:text-foreground")}
            >
              Active only
            </button>
            <button
              type="button"
              onClick={() => setActiveOnly(false)}
              className={cn("rounded-full px-3 py-1.5 font-medium transition-colors", !activeOnly ? "bg-brand/10 text-brand" : "text-muted hover:text-foreground")}
            >
              All
            </button>
          </div>
          <Badge tone={all ? "brand" : "neutral"}>{all ? roleLabel(user.role) : user.department}</Badge>
          {isAdmin && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setContinuingOpen(true)}>Continuing list</Button>
              {directory.length > 0 && (
                <Button variant="secondary" size="sm" onClick={async () => { await apiDelete("/students"); refresh(); }}>
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={() => setImporting(true)}>Import (Excel)</Button>
            </>
          )}
        </div>
      </div>

      {gap && (
        <Card className="border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <p className="text-sm text-foreground/90">
            <span className="font-semibold">Live batch roster: {rosterTotal} students.</span>{" "}
            {directory.length} have imported details ({rosterTotal - directory.length} pending). The batch API identifies students only by{" "}
            <span className="font-medium">Torii number</span>, so re-import the directory Excel <span className="font-medium">with a Torii Number column</span> to include all {rosterTotal} and auto-fill names &amp; departments from the roster.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Torii, USN, name, department, or batch…"
            className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        {deptOptions.length > 0 && (
          <select
            value={deptF}
            onChange={(e) => setDeptF(e.target.value)}
            className="h-11 rounded-full border border-border bg-surface px-4 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="all">All departments</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {batchOptions.length > 0 && (
          <select
            value={batchF}
            onChange={(e) => setBatchF(e.target.value)}
            className="h-11 rounded-full border border-border bg-surface px-4 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="all">All batches</option>
            {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
      </div>

      {!loaded ? null : source.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No students yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {isAdmin
              ? "Import an Excel with Torii No, USN, Department, Batch (Name optional) to map students for attendance and assessments."
              : "The student roster hasn't been set up yet."}
          </p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No students match</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Try a different search or filter.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-foreground">
              {rows.length} student{rows.length === 1 ? "" : "s"}{all && rosterTotal && rows.length !== rosterTotal ? ` of ${rosterTotal}` : ""}
            </h3>
          </div>
          <div className="max-h-[65vh] overflow-auto scrollbar-thin">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="sticky top-0 z-10 w-14 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">#</th>
                  {rosterMode && <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Torii Number</th>}
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">USN</th>
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Department</th>
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Batch</th>
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s, i) => (
                  <tr key={s.torii || s.usn || i} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3 text-muted">{i + 1}</td>
                    {rosterMode && <td className="px-4 py-3 font-mono text-xs text-foreground">{s.torii || <span className="text-muted">—</span>}</td>}
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{s.usn ? normalizeUsn(s.usn) : <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-foreground">{s.name || <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">{s.department ? <Badge tone="neutral">{s.department}</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">{s.batch ? <Badge tone="brand">{s.batch}</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={isActive(s.torii) ? "success" : "danger"}>{isActive(s.torii) ? "Active" : "Inactive"}</Badge>
                        {isAdmin && s.torii && (
                          <button
                            type="button"
                            onClick={() => setStudentActive(s.torii, !isActive(s.torii))}
                            className={cn("text-xs font-medium hover:underline", isActive(s.torii) ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}
                          >
                            {isActive(s.torii) ? "Disable" : "Enable"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {importing && isAdmin && (
        <ImportDirectoryModal onClose={() => setImporting(false)} onDone={refresh} />
      )}

      {continuingOpen && isAdmin && (
        <ContinuingListModal
          roster={source}
          onClose={() => setContinuingOpen(false)}
          onApply={setContinuing}
          onReset={resetAll}
        />
      )}
    </div>
  );
}

/**
 * Paste the placement dept's "continuing students" list (Torii numbers, any
 * delimiter). Those stay active; everyone else in the roster is disabled.
 */
function ContinuingListModal({ roster, onClose, onApply, onReset }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const allTorii = useMemo(
    () => [...new Set((roster || []).map((s) => upper(s.torii)).filter(Boolean))],
    [roster],
  );
  const rosterSet = useMemo(() => new Set(allTorii), [allTorii]);

  // Parse pasted tokens → Torii numbers; split on anything that isn't a roll char.
  const pasted = useMemo(
    () => [...new Set(text.split(/[^A-Za-z0-9]+/).map(upper).filter(Boolean))],
    [text],
  );
  const matched = useMemo(() => pasted.filter((t) => rosterSet.has(t)), [pasted, rosterSet]);
  const unknown = useMemo(() => pasted.filter((t) => !rosterSet.has(t)), [pasted, rosterSet]);
  const willDisable = allTorii.length - matched.length;

  const apply = async () => {
    setBusy(true);
    try {
      const res = await onApply(matched, allTorii);
      setResult({ active: res?.active ?? matched.length, total: res?.total ?? allTorii.length });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await onReset();
      setResult({ active: allTorii.length, total: allTorii.length, reset: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-card-hover sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Set continuing students</h3>
            <p className="text-xs text-muted">Paste the Torii numbers who continue. Everyone else in the roster is disabled.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
          {!result ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="27AAB00020, 27AAB00021&#10;27AAB00034 …"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-surface-2 px-3 py-3">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{matched.length}</p>
                  <p className="text-xs text-muted">continuing</p>
                </div>
                <div className="rounded-xl bg-surface-2 px-3 py-3">
                  <p className="text-lg font-bold text-red-500">{willDisable}</p>
                  <p className="text-xs text-muted">to disable</p>
                </div>
                <div className="rounded-xl bg-surface-2 px-3 py-3">
                  <p className="text-lg font-bold text-foreground">{unknown.length}</p>
                  <p className="text-xs text-muted">not in roster</p>
                </div>
              </div>
              {allTorii.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Roster not loaded yet — open this once the student list has loaded.
                </p>
              )}
              {unknown.length > 0 && (
                <p className="text-xs text-muted">
                  Ignored (no matching Torii in roster): <span className="font-mono">{unknown.slice(0, 12).join(", ")}{unknown.length > 12 ? "…" : ""}</span>
                </p>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-surface-2 px-4 py-4 text-sm">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {result.reset
                  ? `Reset — all ${result.total} students are active again.`
                  : `Done — ${result.active} of ${result.total} students kept active, ${result.total - result.active} disabled.`}
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" size="md" onClick={reset} disabled={busy || allTorii.length === 0}>
            Enable everyone
          </Button>
          {result ? (
            <Button size="md" onClick={onClose}>Done</Button>
          ) : (
            <Button size="md" onClick={apply} disabled={busy || matched.length === 0}>
              {busy ? "Applying…" : `Apply (${matched.length} continue)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportDirectoryModal({ onClose, onDone }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setResult(null); setRows(null); setFileName(file.name); setBusy(true);
    try {
      const parsed = await parseDirectoryFile(file);
      if (parsed.length === 0) setError("No valid rows. Expecting USN, Department (Name optional).");
      else setRows(parsed);
    } catch {
      setError("Couldn't read that file. Upload a valid .xlsx, .xls, or .csv.");
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const res = await apiPost("/students", { students: rows });
      setResult(res);
      onDone();
    } catch (e) {
      setError(e.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-card-hover sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Import student directory</h3>
            <p className="text-xs text-muted">Columns: Torii No, USN, Department, Batch, Name. Torii No is needed to match attendance.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
          {!result && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center hover:border-brand/50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand" aria-hidden>
                <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium text-foreground">{fileName || "Choose a .xlsx, .xls or .csv file"}</span>
              <span className="text-xs text-muted">Headers Torii No / USN / Department / Batch / Name (auto-detected)</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            </label>
          )}
          {busy && <p className="text-sm text-muted">Working…</p>}
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

          {rows && !result && (
            <>
              <p className="text-sm text-foreground"><span className="font-semibold">{rows.length}</span> students ready.</p>
              <div className="max-h-64 overflow-auto rounded-xl border border-border scrollbar-thin">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-surface-2">
                    <tr className="text-left">
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Torii No</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">USN</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Department</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-xs text-muted">{r.torii || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted">{r.usn}</td>
                        <td className="px-3 py-2 text-foreground">{r.name}</td>
                        <td className="px-3 py-2 text-foreground/80">{r.department}</td>
                        <td className="px-3 py-2 text-foreground/80">{r.batch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 100 && <p className="text-xs text-muted">Showing first 100 of {rows.length}.</p>}
            </>
          )}

          {result && (
            <div className="rounded-xl bg-surface-2 px-4 py-4 text-sm">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                Imported {result.total} students ({result.added} new, {result.updated} updated).
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          {result ? (
            <Button size="md" onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
              <Button size="md" disabled={!rows || busy} onClick={doImport}>
                {busy ? "Importing…" : `Import ${rows ? rows.length : ""}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Identifier shapes: USN like "1NC23CS007"; Torii number like "27AAB00020".
const TORII_RE = /^\d{2}[A-Z]{2,4}\d{3,}$/i;
const USN_RE = /^\d[A-Z]{2}\d{2}[A-Z]{1,3}\d{2,}$/i;

/** Parse .xlsx/.xls/.csv into { usn, torii, name, department, batch }[]. */
async function parseDirectoryFile(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  if (!matrix.length) return [];

  const looksHeader = (row) =>
    row.some((c) => /usn|roll|reg|torii|training|name|branch|dept|department|batch/i.test(String(c)));

  // Defaults assume column order: USN, Department, Name, Batch (Torii unknown).
  let usnIdx = 0;
  let deptIdx = 1;
  let nameIdx = 2;
  let batchIdx = 3;
  let toriiIdx = -1;
  let usnHeaderIdx = -1;
  let toriiHeaderIdx = -1;
  let start = 0;

  if (looksHeader(matrix[0])) {
    const header = matrix[0].map((c) => String(c).toLowerCase());
    const find = (...needles) => header.findIndex((h) => needles.some((n) => h.includes(n)));
    // Headers are reliable for these three; USN/Torii are decided by value pattern below.
    // In header mode an unfound column is genuinely absent (don't fall back to
    // a positional default, which could grab the wrong column).
    deptIdx = find("department", "dept", "branch");
    nameIdx = find("name");
    batchIdx = find("batch");
    usnHeaderIdx = find("usn", "university seat");
    toriiHeaderIdx = find("torii", "training");
    start = 1;
  }

  // Identify the Torii (27AAB…) and USN (1NC…) columns by VALUE PATTERN — the
  // shapes are distinctive, so this is more reliable than header names (which
  // sometimes call either one "Roll No").
  const sample = matrix.slice(start, start + 30);
  const colCount = Math.max(...matrix.map((r) => r.length));
  const score = (re) =>
    Array.from({ length: colCount }, (_, c) =>
      sample.reduce((n, row) => n + (re.test(String(row[c] ?? "").trim()) ? 1 : 0), 0),
    );
  const pick = (scores, exclude) => {
    let best = -1;
    let bestN = 0;
    scores.forEach((n, i) => {
      if (i !== exclude && n > bestN) { bestN = n; best = i; }
    });
    return bestN > 0 ? best : -1;
  };
  const tScores = score(TORII_RE);
  const uScores = score(USN_RE);
  const t = pick(tScores, -1);
  toriiIdx = t !== -1 ? t : toriiHeaderIdx; // pattern → header fallback
  const u = pick(uScores, toriiIdx);
  if (u !== -1) usnIdx = u;
  else if (usnHeaderIdx !== -1) usnIdx = usnHeaderIdx; // pattern → header fallback

  const out = [];
  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i];
    const at = (idx) => (idx === -1 ? "" : String(row[idx] ?? "").trim());
    const usn = at(usnIdx);
    const torii = at(toriiIdx);
    const department = at(deptIdx);
    const name = at(nameIdx);
    const batch = at(batchIdx);
    if (usn && department) out.push({ usn, torii, department, name, batch });
  }
  return out;
}
