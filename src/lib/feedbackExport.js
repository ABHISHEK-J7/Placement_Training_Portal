import { CRITERIA, RATING_LABELS, dateLabel, collectComments } from "@/lib/feedback";

/**
 * Download a comments table as a single-sheet Excel (Date, Class, Comment, Batch).
 * `rows` are collected comment rows ({ class, text, batchName, createdAt }).
 */
export async function downloadCommentsExcel(rows, filename = "feedback-comments.xlsx") {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Date", "Class", "Comment", "Batch"],
    ...rows.map((r) => [dateLabel(r.createdAt), r.class, r.text, r.batchName]),
  ]);
  ws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 80 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, "Comments");
  XLSX.writeFile(wb, filename);
}

/**
 * Download one batch's full feedback as Excel: for each Category (class) and each
 * Parameter, the COUNT of every rating (how many students gave 1..5), plus a big
 * table of all that batch's comments.
 *
 * @param detail       result of batchDetail() — for name/overall/byClass order.
 * @param submissions  the (filtered) submissions for this batch — used for counts.
 */
export async function downloadBatchDetailExcel({ detail, submissions, filename }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const add = (name, rows) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);

  // class -> criterionKey -> { 1..5 counts }
  const byClass = new Map();
  for (const s of submissions) {
    for (const c of s.classes || []) {
      let crits = byClass.get(c.class);
      if (!crits) { crits = new Map(); byClass.set(c.class, crits); }
      const rt = c.ratings || {};
      for (const cr of CRITERIA) {
        const v = Math.round(Number(rt[cr.key]) || 0);
        if (v < 1 || v > 5) continue;
        let counts = crits.get(cr.key);
        if (!counts) { counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; crits.set(cr.key, counts); }
        counts[v] += 1;
      }
    }
  }

  add("Summary", [
    ["Batch", detail.name],
    ["Overall rating (/5)", round(detail.overall)],
    ["Responses", detail.responses],
    ["Categories", detail.byClass.length],
    ["Comments", detail.comments.length],
  ]);

  // Category / Parameter / rating counts.
  const ratingHeader = [5, 4, 3, 2, 1].map((r) => `${r} · ${RATING_LABELS[r]}`);
  const rows = [["Category", "Parameter", ...ratingHeader, "Responses", "Average (/5)"]];
  for (const cls of detail.byClass) {
    const crits = byClass.get(cls.class);
    for (const cr of CRITERIA) {
      const counts = (crits && crits.get(cr.key)) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const total = [1, 2, 3, 4, 5].reduce((a, r) => a + counts[r], 0);
      const avg = total ? [1, 2, 3, 4, 5].reduce((a, r) => a + r * counts[r], 0) / total : 0;
      rows.push([
        cls.class,
        cr.label,
        counts[5], counts[4], counts[3], counts[2], counts[1],
        total,
        round(avg),
      ]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 20 }, ...ratingHeader.map(() => ({ wch: 13 })), { wch: 11 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Rating Counts");

  // Class-wise comments (already collected per-class by batchDetail).
  const cws = XLSX.utils.aoa_to_sheet([
    ["Date", "Class", "Comment"],
    ...detail.comments.map((c) => [dateLabel(c.createdAt), c.class, c.text]),
  ]);
  cws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, cws, "Comments");

  XLSX.writeFile(wb, filename || `feedback-${detail.slug || "batch"}.xlsx`);
}

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
    ["Date", "Batch", "Class", "Comment"],
    ...collectComments(filtered).map((c) => [dateLabel(c.createdAt), c.batchName, c.class, c.text]),
  ]);

  XLSX.writeFile(wb, filename);
}

function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
