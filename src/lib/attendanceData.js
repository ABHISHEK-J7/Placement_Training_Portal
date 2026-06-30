import { seesAllStudents } from "@/lib/roles";

/**
 * Helpers to enrich + analyse the upstream attendance result.
 * Upstream row: { roll_no, attendance: [{ session, date, mode, status }], present, absent }
 *
 * IMPORTANT: the backend identifies students by their TORII NUMBER (e.g.
 * "27AAB00020") in `roll_no` — NOT by USN. The directory (MongoDB) therefore
 * must carry a `torii` field so we can join: roll_no (torii) → { usn, name,
 * department }. We index the directory by torii AND usn so a join still works
 * whichever identifier the backend happens to send.
 */

const norm = (u) => (u || "").trim().toUpperCase();

/** Build a { torii | usn } → student lookup from the directory list. */
export function directoryMap(directory) {
  const m = new Map();
  for (const s of directory || []) {
    if (s.torii) m.set(norm(s.torii), s);
    if (s.usn) m.set(norm(s.usn), s);
  }
  return m;
}

/** Enrich raw rows with usn + name + department; compute per-student percentage. */
export function enrichAttendance(result, dirMap) {
  return (result || []).map((r) => {
    const info = dirMap.get(norm(r.roll_no)) || {};
    const present = Number(r.present) || 0;
    const absent = Number(r.absent) || 0;
    const total = present + absent;
    return {
      torii: r.roll_no, // backend roll_no IS the Torii number
      roll: r.roll_no, // kept for existing references
      usn: info.usn || "",
      name: info.name || "",
      department: info.department || "",
      attendance: r.attendance || [],
      present,
      absent,
      total,
      percent: total ? Math.round((present / total) * 100) : 0,
    };
  });
}

/** HOD sees only their department's students; everyone else sees all. */
export function scopeAttendance(user, rows) {
  if (!user) return [];
  if (seesAllStudents(user)) return rows;
  return rows.filter((r) => r.department === user.department);
}

/** DD-MM-YYYY → sortable timestamp. */
export function parseDate(d) {
  const [dd, mm, yyyy] = String(d).split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
}

export function attendanceOverview(rows) {
  let present = 0;
  let absent = 0;
  for (const r of rows) {
    present += r.present;
    absent += r.absent;
  }
  const total = present + absent;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length) : 0;
  return {
    students: rows.length,
    present,
    absent,
    total,
    avgPercent: avg,
    overallPercent: total ? Math.round((present / total) * 100) : 0,
  };
}

/** Attendance % per day across all (scoped) students. */
export function byDate(rows) {
  const m = new Map();
  for (const r of rows) {
    for (const a of r.attendance) {
      const e = m.get(a.date) || { date: a.date, present: 0, total: 0 };
      e.total += 1;
      if (a.status === "present") e.present += 1;
      m.set(a.date, e);
    }
  }
  return [...m.values()]
    .map((e) => ({ date: e.date, present: e.present, total: e.total, percent: e.total ? Math.round((e.present / e.total) * 100) : 0 }))
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

/** Attendance % per session mode. */
export function byMode(rows) {
  const m = new Map();
  for (const r of rows) {
    for (const a of r.attendance) {
      const mode = a.mode || "—";
      const e = m.get(mode) || { mode, present: 0, total: 0 };
      e.total += 1;
      if (a.status === "present") e.present += 1;
      m.set(mode, e);
    }
  }
  return [...m.values()]
    .map((e) => ({ mode: e.mode, total: e.total, percent: e.total ? Math.round((e.present / e.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Bucket students by attendance %. */
export function distribution(rows) {
  const b = { "≥ 90%": 0, "75–89%": 0, "50–74%": 0, "< 50%": 0 };
  for (const r of rows) {
    if (r.total === 0) continue;
    if (r.percent >= 90) b["≥ 90%"] += 1;
    else if (r.percent >= 75) b["75–89%"] += 1;
    else if (r.percent >= 50) b["50–74%"] += 1;
    else b["< 50%"] += 1;
  }
  return b;
}

/** Attendance % per department (uses directory department). */
export function attendanceByDepartment(rows) {
  const m = new Map();
  for (const r of rows) {
    const dept = r.department || "Unknown";
    const e = m.get(dept) || { department: dept, present: 0, total: 0, students: 0 };
    e.present += r.present;
    e.total += r.total;
    e.students += 1;
    m.set(dept, e);
  }
  return [...m.values()]
    .map((e) => ({ department: e.department, students: e.students, percent: e.total ? Math.round((e.present / e.total) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent);
}

/** Day × mode grid for one student's detail view. */
export function studentDayWise(student) {
  const modes = [];
  const byDay = new Map();
  for (const a of student.attendance || []) {
    if (!modes.includes(a.mode)) modes.push(a.mode);
    const day = byDay.get(a.date) || { date: a.date, cells: {} };
    day.cells[a.mode] = a.status;
    byDay.set(a.date, day);
  }
  const days = [...byDay.values()].sort((x, y) => parseDate(x.date) - parseDate(y.date));
  return { modes, days };
}
