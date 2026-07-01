import { modeLabel, rowModeStatus, rowModePresent } from "@/lib/attendanceData";

/**
 * Excel export of the attendance students table — and ONLY that table.
 * Columns: Torii Number, USN, Name, Department, then one column PER session mode
 * (Light Mode, Bright Mode). For a selected date each mode cell is Present/Absent;
 * for "all dates" it is the present-session count. `rows` are already scoped +
 * filtered exactly as shown on screen. xlsx lazy-loaded.
 */
export async function downloadAttendanceExcel({ rows, modes = [], dateSelected = false, filename = "attendance.xlsx" }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const header = ["Torii Number", "USN", "Name", "Department", ...modes.map(modeLabel)];
  const body = rows.map((r) => [
    r.torii,
    r.usn || "",
    r.name || "",
    r.department || "",
    ...modes.map((m) => {
      if (dateSelected) {
        const st = rowModeStatus(r, m);
        return st === "present" ? "Present" : st === "absent" ? "Absent" : "—";
      }
      return rowModePresent(r, m);
    }),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 14 }, ...modes.map(() => ({ wch: 12 }))];
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, filename);
}
