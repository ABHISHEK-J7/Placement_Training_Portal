/**
 * Excel export of the attendance students table — and ONLY that table.
 * One sheet, columns: Torii Number, USN, Name, Department, Present, Absent.
 * `rows` are already scoped + filtered exactly as shown on screen. xlsx lazy-loaded.
 */
export async function downloadAttendanceExcel({ rows, filename = "attendance.xlsx" }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const aoa = [
    ["Torii Number", "USN", "Name", "Department", "Present", "Absent"],
    ...rows.map((r) => [r.torii, r.usn || "", r.name || "", r.department || "", r.present, r.absent]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 9 }, { wch: 9 }];
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, filename);
}
