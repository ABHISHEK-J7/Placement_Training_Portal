import { fmtTime } from "@/lib/assessments";

/**
 * Excel export of the per-assessment student results table — and only that table.
 * Columns: Torii Number, USN, Name, Branch, Correct, Wrong, Score, Accuracy %, Time.
 * `rows` are already enriched + scoped + filtered as shown. xlsx lazy-loaded.
 */
export async function downloadAssessmentExcel({ rows, filename = "assessment.xlsx" }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const aoa = [
    ["Torii Number", "USN", "Name", "Branch", "Correct", "Wrong", "Score", "Accuracy %", "Time"],
    ...rows.map((r) => [r.torii, r.usn || "", r.name || "", r.branch || "", r.correct, r.wrong, r.score, r.accuracy, fmtTime(r.time)]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 11 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, filename);
}
