import { CRITERIA, RATING_LABELS, collectComments } from "@/lib/feedback";
import { downloadTablePdf } from "@/lib/pdf";

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

const genLine = (extra) => {
  const when = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `Generated ${when}${extra ? ` · ${extra}` : ""}`;
};

// Comments table (Batch · Class · Comment): give Batch the room the old Date
// column had, keep Class narrow, let Comment take the rest — all reads left.
const COMMENT_COLS = { 0: { halign: "left", cellWidth: 150 }, 1: { halign: "center", cellWidth: 82 }, 2: { halign: "left" } };
const commentsLabel = (dateScope, n) => `Comments · ${dateScope || "All dates"} · ${n} comment${n === 1 ? "" : "s"}`;

/**
 * Full feedback analytics as a PDF — the same data as the Excel report, section
 * by section with headings. Same aggregates the page already computes.
 */
export async function downloadFeedbackPdf({
  filtered,
  overview,
  byBatch,
  byClassRows,
  distribution,
  matrix,
  context = "",
  dateScope = "All dates",
  filename = "feedback-report.pdf",
}) {
  const sections = [
    {
      heading: "Summary",
      head: ["Metric", "Value"],
      body: [
        ["Responses", String(overview.responses)],
        ["Batches", String(overview.batches)],
        ["Classes rated", String(overview.classes)],
        ["Average rating (/5)", String(round(overview.avgRating))],
      ],
    },
    {
      heading: "Average by Parameter",
      head: ["Parameter", "Average (/5)"],
      body: overview.criteria.map((c) => [c.label, String(round(c.avg))]),
    },
    {
      heading: "Rating Distribution",
      head: ["Rating", "Label", "Count"],
      body: [5, 4, 3, 2, 1].map((r) => [String(r), RATING_LABELS[r], String(distribution[r] || 0)]),
    },
    {
      heading: "Average Rating by Batch",
      head: ["Batch", "Responses", "Avg Rating (/5)"],
      body: byBatch.map((b) => [b.name, String(b.responses), String(round(b.avgRating))]),
    },
    {
      heading: "Average Rating by Class",
      head: ["Class", "Responses", "Avg (/5)", ...CRITERIA.map((c) => c.label)],
      body: byClassRows.map((r) => [
        r.class,
        String(r.responses),
        String(round(r.avgRating)),
        ...r.criteria.map((c) => String(round(c.avg))),
      ]),
    },
  ];

  if (matrix.classes.length > 0) {
    sections.push({
      heading: "Batch × Class Average",
      head: ["Batch \\ Class", ...matrix.classes],
      body: matrix.batches.map((b) => [
        b,
        ...matrix.classes.map((cl) => {
          const v = matrix.get(b, cl);
          return v == null ? "—" : String(round(v));
        }),
      ]),
    });
  }

  const responseRows = filtered.flatMap((s) =>
    (s.classes || []).map((c) => [
      s.batchName,
      c.class,
      String(round(Number(c.rating) || 0)),
      ...CRITERIA.map((cr) => (c.ratings && c.ratings[cr.key] != null ? String(c.ratings[cr.key]) : "—")),
    ]));
  if (responseRows.length > 0) {
    sections.push({
      heading: "All Responses",
      head: ["Batch", "Class", "Overall (/5)", ...CRITERIA.map((c) => c.label)],
      body: responseRows,
    });
  }

  const comments = collectComments(filtered);
  if (comments.length > 0) {
    sections.push({
      heading: commentsLabel(dateScope, comments.length),
      head: ["Batch", "Class", "Comment"],
      body: comments.map((c) => [c.batchName, c.class, c.text]),
      columnStyles: COMMENT_COLS,
    });
  }

  await downloadTablePdf({
    title: "Feedback Analytics Report",
    subtitle: genLine(`${dateScope} · ${overview.responses} responses${context ? ` · ${context}` : ""}`),
    sections,
    filename,
  });
}

/** Comments-only PDF (Batch · Class · Comment) with the date beside the heading. */
export async function downloadCommentsPdf(rows, filename = "feedback-comments.pdf", dateScope = "All dates") {
  await downloadTablePdf({
    title: "Feedback Comments",
    subtitle: genLine(dateScope),
    sections: [
      {
        heading: commentsLabel(dateScope, rows.length),
        head: ["Batch", "Class", "Comment"],
        body: rows.map((r) => [r.batchName, r.class, r.text]),
        columnStyles: COMMENT_COLS,
      },
    ],
    filename,
  });
}

/** One batch's feedback as PDF — rating counts per category/parameter + comments. */
export async function downloadBatchDetailPdf({ detail, submissions, filename, dateScope = "All dates" }) {
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

  const ratingHead = ["Category", "Parameter", ...[5, 4, 3, 2, 1].map((r) => `${r} · ${RATING_LABELS[r]}`), "Responses", "Avg (/5)"];
  const ratingBody = [];
  for (const cls of detail.byClass) {
    const crits = byClass.get(cls.class);
    for (const cr of CRITERIA) {
      const counts = (crits && crits.get(cr.key)) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const total = [1, 2, 3, 4, 5].reduce((a, r) => a + counts[r], 0);
      const avg = total ? [1, 2, 3, 4, 5].reduce((a, r) => a + r * counts[r], 0) / total : 0;
      ratingBody.push([
        cls.class,
        cr.label,
        String(counts[5]), String(counts[4]), String(counts[3]), String(counts[2]), String(counts[1]),
        String(total),
        String(round(avg)),
      ]);
    }
  }

  await downloadTablePdf({
    title: detail.name,
    subtitle: genLine(`Feedback · ${detail.responses} responses · ${round(detail.overall)}/5 overall`),
    sections: [
      {
        heading: "Summary",
        head: ["Metric", "Value"],
        body: [
          ["Batch", detail.name],
          ["Overall rating (/5)", String(round(detail.overall))],
          ["Responses", String(detail.responses)],
          ["Categories", String(detail.byClass.length)],
          ["Comments", String(detail.comments.length)],
        ],
      },
      { heading: "Rating Counts", head: ratingHead, body: ratingBody },
      {
        heading: commentsLabel(dateScope, detail.comments.length),
        head: ["Class", "Comment"],
        body: detail.comments.map((c) => [c.class, c.text]),
        columnStyles: { 0: { halign: "center", cellWidth: 120 }, 1: { halign: "left" } },
      },
    ],
    filename: filename || `feedback-${detail.slug || "batch"}.pdf`,
  });
}
