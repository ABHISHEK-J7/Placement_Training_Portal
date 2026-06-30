"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { StatCard, DonutChart, BarList } from "@/components/dashboard/charts";
import { apiGet, apiPost } from "@/lib/apiClient";
import {
  directoryMap,
  enrichAttendance,
  scopeAttendance,
  attendanceOverview,
  attendanceByDepartment,
} from "@/lib/attendanceData";
import { feedbackOverview, scopeFeedback } from "@/lib/feedback";
import { seesAllStudents, roleLabel, canManageUsers } from "@/lib/roles";
import { cn } from "@/lib/utils";

const icon = {
  users: <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 5v3h16v-3c0-3.3-4.7-5-8-5Z" />,
  building: <path d="M3 21V5l8-3 8 3v16h-5v-5h-6v5H3Zm6-9h2v-2H9v2Zm4 0h2v-2h-2v2ZM9 8h2V6H9v2Zm4 0h2V6h-2v2Z" />,
  batches: <path d="M4 5h16v4H4V5Zm0 6h16v4H4v-4Zm0 6h10v2H4v-2Z" />,
  check: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" />,
  chat: <path d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z" />,
};

function Icon({ d }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>{d}</svg>;
}

function groupCount(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x) || "—";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function tone(p) {
  if (p >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (p >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}
function cellTone(v, kind) {
  if (kind === "pct") {
    if (v == null) return "bg-surface-2 text-muted";
    if (v >= 75) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (v >= 50) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  }
  return v ? "bg-brand/10 text-brand" : "bg-surface-2 text-muted";
}

export default function DashboardPage() {
  const { user, users } = useAuth();
  const { records } = useFeedback();

  const [directory, setDirectory] = useState([]);
  const [attRows, setAttRows] = useState(null);
  const [attLoading, setAttLoading] = useState(true);

  // Load directory + attendance (all allowed batches) once.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const dir = (await apiGet("/students")).students || [];
        if (cancel) return;
        setDirectory(dir);
        const dm = directoryMap(dir);
        const batches = (await apiGet("/attendance/batches")).batches || [];
        const all = [];
        for (const b of batches) {
          try {
            const r = await apiPost("/attendance", { batch_id: b.id });
            for (const row of enrichAttendance(r.result || [], dm)) all.push({ ...row, batchName: b.name });
          } catch {
            /* skip a batch that errors */
          }
        }
        if (!cancel) setAttRows(all);
      } catch {
        if (!cancel) {
          setDirectory([]);
          setAttRows([]);
        }
      } finally {
        if (!cancel) setAttLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const all = user ? seesAllStudents(user) : false;

  const students = useMemo(() => {
    if (!user) return [];
    return all ? directory : directory.filter((s) => s.department === user.department);
  }, [directory, user, all]);

  const byDept = useMemo(() => groupCount(students, (s) => s.department), [students]);
  const byBatch = useMemo(() => groupCount(students, (s) => s.batch), [students]);

  const matrix = useMemo(() => {
    const depts = [];
    const batches = [];
    const cells = new Map();
    for (const s of students) {
      const d = s.department || "—";
      const b = s.batch || "—";
      if (!depts.includes(d)) depts.push(d);
      if (!batches.includes(b)) batches.push(b);
      const k = `${d}||${b}`;
      cells.set(k, (cells.get(k) || 0) + 1);
    }
    return { depts: depts.sort(), batches: batches.sort(), get: (d, b) => cells.get(`${d}||${b}`) || 0 };
  }, [students]);

  const att = useMemo(() => (attRows ? scopeAttendance(user, attRows) : []), [attRows, user]);
  const attOv = useMemo(() => attendanceOverview(att), [att]);
  const attByDept = useMemo(() => attendanceByDepartment(att), [att]);
  const attByBatch = useMemo(() => {
    const m = new Map();
    for (const r of att) {
      const b = r.batchName || "—";
      const e = m.get(b) || { present: 0, total: 0 };
      e.present += r.present;
      e.total += r.total;
      m.set(b, e);
    }
    return [...m.entries()].map(([k, v]) => [k, v.total ? Math.round((v.present / v.total) * 100) : 0]);
  }, [att]);

  const fb = useMemo(() => scopeFeedback(user, records), [user, records]);
  const fbOv = useMemo(() => feedbackOverview(fb), [fb]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {user.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {roleLabel(user.role)}
            {user.department ? ` · ${user.department}` : " · all departments"} — here&apos;s your overview.
          </p>
        </div>
        <Badge tone="brand">{all ? "All departments" : user.department}</Badge>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={students.length} hint={all ? "In directory" : `In ${user.department}`} icon={<Icon d={icon.users} />} />
        <StatCard label="Departments" value={byDept.length} hint="Represented" icon={<Icon d={icon.building} />} />
        <StatCard label="Batches" value={byBatch.length} hint="With students" icon={<Icon d={icon.batches} />} />
        <StatCard
          label={canManageUsers(user) ? "Portal Users" : "Feedback"}
          value={canManageUsers(user) ? users.length : fbOv.responses}
          hint={canManageUsers(user) ? "Staff accounts" : "Responses"}
          icon={<Icon d={canManageUsers(user) ? icon.users : icon.chat} />}
        />
      </div>

      {students.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No student data yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {canManageUsers(user)
              ? "Import the student directory to populate the dashboard."
              : "The student directory hasn't been imported yet."}
          </p>
          {canManageUsers(user) && (
            <div className="mt-5 flex justify-center">
              <Button href="/students" size="md">Go to Students</Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Students */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Students</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <DonutChart title="Students by Department" data={byDept} />
              <BarList title="Students by Batch" data={byBatch} />
            </div>

            {matrix.batches.length > 0 && (
              <Card className="overflow-hidden">
                <div className="border-b border-border px-5 py-3.5">
                  <h4 className="text-sm font-semibold text-foreground">Department × Batch</h4>
                  <p className="text-xs text-muted">Student counts per batch in each department.</p>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-surface-2 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Department</th>
                        {matrix.batches.map((b) => (
                          <th key={b} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">{b}</th>
                        ))}
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {matrix.depts.map((d) => {
                        const total = matrix.batches.reduce((s, b) => s + matrix.get(d, b), 0);
                        return (
                          <tr key={d}>
                            <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-foreground">{d}</th>
                            {matrix.batches.map((b) => {
                              const v = matrix.get(d, b);
                              return (
                                <td key={b} className="px-3 py-2 text-center">
                                  <span className={cn("inline-block min-w-[2.25rem] rounded-md px-2 py-1 text-xs font-semibold", cellTone(v, "count"))}>{v || "—"}</span>
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center font-semibold text-foreground">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>

          {/* Attendance */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Attendance</h3>
              <Button href="/attendance" variant="secondary" size="sm">Open attendance →</Button>
            </div>
            {attLoading ? (
              <Card className="grid place-items-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-brand" />
              </Card>
            ) : att.length === 0 ? (
              <Card className="px-6 py-10 text-center text-sm text-muted">
                No attendance available yet (import the directory so students can be matched).
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Overall %" value={`${attOv.overallPercent}%`} hint="All sessions" icon={<Icon d={icon.check} />} />
                  <StatCard label="Avg Student %" value={`${attOv.avgPercent}%`} hint="Mean per student" />
                  <StatCard label="Tracked" value={attOv.students} hint="Students" />
                  <StatCard label="Sessions" value={attOv.total} hint={`${attOv.present} present · ${attOv.absent} absent`} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <BarList title="Attendance % by batch" data={attByBatch} />
                  {all && attByDept.length > 1 ? (
                    <BarList title="Attendance % by department" data={attByDept.map((d) => [d.department, d.percent])} />
                  ) : (
                    <DonutChart title="Attendance distribution" data={attBuckets(att)} />
                  )}
                </div>
              </>
            )}
          </section>

          {/* Feedback */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Feedback</h3>
              <Button href="/feedback" variant="secondary" size="sm">Open feedback →</Button>
            </div>
            {fb.length === 0 ? (
              <Card className="px-6 py-10 text-center text-sm text-muted">No feedback submitted yet.</Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Responses" value={fbOv.responses} hint="Submissions" icon={<Icon d={icon.chat} />} />
                  <StatCard label="Avg Rating" value={`${fbOv.avgRating.toFixed(1)}/5`} hint="All parameters" />
                  <StatCard label="Batches" value={fbOv.batches} hint="Rated" />
                  <StatCard label="Classes" value={fbOv.classes} hint="Rated" />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <BarList title="Average by parameter" data={fbOv.criteria.map((c) => [c.label, Math.round(c.avg * 10) / 10])} />
                  <Card className="flex flex-col justify-center p-5">
                    <p className="text-sm font-medium text-muted">Overall rating</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className={cn("text-4xl font-bold", tone(fbOv.avgRating * 20))}>{fbOv.avgRating.toFixed(1)}</span>
                      <Stars value={fbOv.avgRating} size={20} />
                    </div>
                    <p className="mt-1 text-xs text-muted">across {fbOv.responses} responses</p>
                  </Card>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function attBuckets(rows) {
  const b = { "≥ 90%": 0, "75–89%": 0, "50–74%": 0, "< 50%": 0 };
  for (const r of rows) {
    if (!r.total) continue;
    if (r.percent >= 90) b["≥ 90%"] += 1;
    else if (r.percent >= 75) b["75–89%"] += 1;
    else if (r.percent >= 50) b["50–74%"] += 1;
    else b["< 50%"] += 1;
  }
  return Object.entries(b).filter(([, n]) => n > 0);
}
