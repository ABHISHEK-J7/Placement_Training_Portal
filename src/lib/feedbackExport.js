import { CRITERIA, RATING_LABELS } from "@/lib/feedback";

/**
 * Build and download a multi-sheet Excel report of the currently-displayed
 * (filtered) feedback. xlsx is imported lazily so it isn't in the main bundle.
 */
export async function downloadFeedbackExcel({
  filtered,
  overview,
  byBatch,
  byClassRows,
  distribution,
  matrix,
  filename = "feedback-report.xlsx",
}) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const add = (name, rows) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);

  add("Summary", [
    ["Metric", "Value"],
    ["Responses", overview.responses],
    ["Batches", overview.batches],
    ["Classes", overview.classes],
    ["Average rating (/5)", round(overview.avgRating)],
  ]);

  add("By Parameter", [
    ["Parameter", "Average (/5)"],
    ...overview.criteria.map((c) => [c.label, round(c.avg)]),
  ]);

  add("Rating Distribution", [
    ["Rating", "Label", "Count"],
    ...[5, 4, 3, 2, 1].map((r) => [r, RATING_LABELS[r], distribution[r] || 0]),
  ]);

  add("By Batch", [
    ["Batch", "Responses", "Avg Rating (/5)"],
    ...byBatch.map((b) => [b.name, b.responses, round(b.avgRating)]),
  ]);

  add("By Class", [
    ["Class", "Responses", "Avg (/5)", ...CRITERIA.map((c) => c.label)],
    ...byClassRows.map((r) => [
      r.class,
      r.responses,
      round(r.avgRating),
      ...r.criteria.map((c) => round(c.avg)),
    ]),
  ]);

  add("Batch x Class", [
    ["Batch \\ Class", ...matrix.classes],
    ...matrix.batches.map((b) => [
      b,
      ...matrix.classes.map((cl) => {
        const v = matrix.get(b, cl);
        return v == null ? "" : round(v);
      }),
    ]),
  ]);

  add("Responses", [
    ["Batch", "Class", "Overall (/5)", ...CRITERIA.map((c) => c.label)],
    ...filtered.flatMap((s) =>
      (s.classes || []).map((c) => [
        s.batchName,
        c.class,
        round(Number(c.rating) || 0),
        ...CRITERIA.map((cr) => (c.ratings ? c.ratings[cr.key] ?? "" : "")),
      ]),
    ),
  ]);

  add("Comments", [
    ["Batch", "Comment"],
    ...filtered.filter((s) => s.comment).map((s) => [s.batchName, s.comment]),
  ]);

  XLSX.writeFile(wb, filename);
}

function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
