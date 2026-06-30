"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, DonutChart, BarList } from "@/components/dashboard/charts";
import { apiGet, apiPost } from "@/lib/apiClient";
import {
  directoryMap,
  enrichAttendance,
  scopeAttendance,
  attendanceOverview,
  byDate,
  byMode,
  distribution,
  attendanceByDepartment,
  studentDayWise,
  parseDate,
} from "@/lib/attendanceData";
import { seesAllStudents, roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";

const FIELD =
  "h-10 rounded-full border border-border bg-surface px-4 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30";

export default function AttendancePage() {
  const { user } = useAuth();

  const [batches, setBatches] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [raw, setRaw] = useState(null); // upstream result for the selected batch
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deptF, setDeptF] = useState("all");
  const [dateF, setDateF] = useState("all");
  const [picked, setPicked] = useState(null); // student for the detail modal
  const [downloading, setDownloading] = useState(false);

  // Load batch list + student directory once.
  useEffect(() => {
    apiGet("/attendance/batches").then((d) => setBatches(d.batches || [])).catch(() => setBatches([]));
    apiGet("/students").then((d) => setDirectory(d.students || [])).catch(() => setDirectory([]));
  }, []);

  const loadAttendance = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    setRaw(null);
    try {
      const d = await apiPost("/attendance", { batch_id: id });
      setRaw(d.result || []);
      if (d.result && d.result.length === 0 && d.note) setError(d.note);
    } catch (e) {
      setError(e.message || "Could not load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onBatch = (id) => {
    setBatchId(id);
    setDeptF("all");
    setDateF("all");
    setQuery("");
    loadAttendance(id);
  };

  const dirMap = useMemo(() => directoryMap(directory), [directory]);
  const scoped = useMemo(
    () => (raw ? scopeAttendance(user, enrichAttendance(raw, dirMap)) : []),
    [raw, dirMap, user],
  );

  const all = user ? seesAllStudents(user) : false;
  const deptOptions = useMemo(
    () => [...new Set(scoped.map((r) => r.department).filter(Boolean))].sort(),
    [scoped],
  );

  // Every distinct date present in the loaded data (newest last).
  const dateOptions = useMemo(() => {
    const set = new Set();
    for (const r of scoped) for (const a of r.attendance) set.add(a.date);
    return [...set].sort((x, y) => parseDate(x) - parseDate(y));
  }, [scoped]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = scoped
      .filter((r) => (deptF === "all" ? true : r.department === deptF))
      .filter((r) =>
        q === ""
          ? true
          : r.torii.toLowerCase().includes(q) ||
            (r.usn || "").toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q),
      );

    // When a date is selected, recompute each student's counts for that day only.
    if (dateF !== "all") {
      base = base.map((r) => {
        const attendance = r.attendance.filter((a) => a.date === dateF);
        const present = attendance.filter((a) => a.status === "present").length;
        const absent = attendance.filter((a) => a.status === "absent").length;
        const total = attendance.length;
        return { ...r, attendance, present, absent, total, percent: total ? Math.round((present / total) * 100) : 0 };
      });
    }

    return base.sort((a, b) => b.percent - a.percent);
  }, [scoped, query, deptF, dateF]);

  const overview = useMemo(() => attendanceOverview(rows), [rows]);
  const dates = useMemo(() => byDate(rows), [rows]);
  const modes = useMemo(() => byMode(rows), [rows]);
  const dist = useMemo(() => distribution(rows), [rows]);
  const byDept = useMemo(() => attendanceByDepartment(rows), [rows]);

  if (!user) return null;

  const batchName = batches.find((b) => b.id === batchId)?.name || "";

  const onDownload = async () => {
    setDownloading(true);
    try {
      const { downloadAttendanceExcel } = await import("@/lib/attendanceExport");
      await downloadAttendanceExcel({
        rows,
        filename: `attendance-${batchName || "batch"}.xlsx`,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h2>
          <p className="mt-1 text-sm text-muted">
            {all ? "Day-wise attendance across all departments." : `Attendance for your department (${user.department}).`}
          </p>
        </div>
        <Badge tone="brand">{roleLabel(user.role)}</Badge>
      </div>

      {/* Controls */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <select className={FIELD} value={batchId} onChange={(e) => onBatch(e.target.value)}>
          <option value="">Select a batch…</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.studentCount})</option>
          ))}
        </select>
        {raw && (
          <>
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Torii no, USN or name…"
                className="h-10 w-56 rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            {all && deptOptions.length > 0 && (
              <select className={FIELD} value={deptF} onChange={(e) => setDeptF(e.target.value)}>
                <option value="all">All departments</option>
                {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            {dateOptions.length > 0 && (
              <select className={FIELD} value={dateF} onChange={(e) => setDateF(e.target.value)}>
                <option value="all">All dates</option>
                {dateOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-muted">{rows.length} students</span>
              {rows.length > 0 && (
                <Button size="sm" onClick={onDownload} disabled={downloading}>
                  {downloading ? "Preparing…" : "⬇ Download Excel"}
                </Button>
              )}
            </div>
          </>
        )}
      </Card>

      {loading && (
        <Card className="grid place-items-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
        </Card>
      )}

      {!loading && !raw && (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">Select a batch</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Choose a batch above to view its day-wise attendance.
          </p>
        </Card>
      )}

      {!loading && raw && rows.length === 0 && (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No attendance to show</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {error
              ? error
              : !all && directory.length === 0
                ? "Import the student directory (Students page) so your department's students can be matched."
                : "No records for this selection."}
          </p>
        </Card>
      )}

      {!loading && raw && rows.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students" value={overview.students} hint={batchName} />
            <StatCard label="Overall %" value={`${overview.overallPercent}%`} hint="All sessions" />
            <StatCard label="Avg Student %" value={`${overview.avgPercent}%`} hint="Mean per student" />
            <StatCard label="Sessions" value={overview.total} hint={`${overview.present} present · ${overview.absent} absent`} />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DonutChart title="Attendance distribution" data={Object.entries(dist).filter(([, n]) => n > 0)} />
            <BarList title="Attendance % by mode" data={modes.map((m) => [m.mode, m.percent])} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Attendance % by day" data={dates.map((d) => [d.date, d.percent])} />
            {all && byDept.length > 1 ? (
              <BarList title="Attendance % by department" data={byDept.map((d) => [d.department, d.percent])} />
            ) : (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground">Working days</h3>
                <p className="mt-2 text-3xl font-bold text-foreground">{dates.length}</p>
                <p className="mt-1 text-xs text-muted">Distinct attendance dates.</p>
              </Card>
            )}
          </div>

          {/* Student table */}
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-semibold text-foreground">Students</h3>
              <p className="text-xs text-muted">Click a student for day-wise detail.</p>
            </div>
            <div className="max-h-[65vh] overflow-auto scrollbar-thin">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="sticky top-0 z-10 w-12 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">#</th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Torii Number</th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">USN</th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Department</th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">Present</th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={r.torii} onClick={() => setPicked(r)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-3 text-muted">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.torii}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.usn || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-foreground">{r.name || <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3">{r.department ? <Badge tone="neutral">{r.department}</Badge> : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">{r.present}</td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">{r.absent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {picked && <StudentDetail student={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}

function StudentDetail({ student, onClose }) {
  const { modes, days } = studentDayWise(student);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-card-hover sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{student.name || student.torii}</h3>
            <p className="text-xs text-muted">
              <span className="font-mono">{student.torii}</span>
              {student.usn ? ` · ${student.usn}` : ""}
              {student.department ? ` · ${student.department}` : ""} · {student.present}/{student.total} ({student.percent}%)
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto scrollbar-thin">
          {days.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No attendance records.</p>
          ) : (
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 text-left">
                  <th className="sticky top-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                  {modes.map((m) => (
                    <th key={m} className="sticky top-0 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {days.map((d) => (
                  <tr key={d.date} className="transition-colors hover:bg-surface-2/60">
                    <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-foreground">{d.date}</th>
                    {modes.map((m) => {
                      const st = d.cells[m];
                      return (
                        <td key={m} className="px-3 py-2 text-center">
                          {st ? (
                            <span className={cn(
                              "inline-flex min-w-[4rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                              st === "present"
                                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400",
                            )}>
                              {st === "present" ? "Present" : "Absent"}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
