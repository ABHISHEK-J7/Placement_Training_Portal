"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { StatCard } from "@/components/dashboard/charts";
import { batchDetail, scopeFeedback, distinctDates, dateKey, dateLabel, commentClasses } from "@/lib/feedback";
import { downloadBatchDetailExcel, downloadCommentsExcel } from "@/lib/feedbackExport";
import { cn } from "@/lib/utils";

const SELECT =
  "h-9 rounded-full border border-border bg-surface px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30";

function ratingTone(v) {
  if (v >= 4) return "text-emerald-600 dark:text-emerald-400";
  if (v >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}

export default function BatchFeedbackPage() {
  const { slug: raw } = useParams();
  const slug = decodeURIComponent(raw || "");
  const { user } = useAuth();
  const { records, ready } = useFeedback();
  const [dateF, setDateF] = useState("all");
  const [commentClass, setCommentClass] = useState("all");

  const batchSubs = useMemo(
    () => scopeFeedback(user, records).filter((s) => s.batchSlug === slug),
    [user, records, slug],
  );
  const dates = useMemo(() => distinctDates(batchSubs), [batchSubs]);
  const filtered = useMemo(
    () => (dateF === "all" ? batchSubs : batchSubs.filter((s) => dateKey(s.createdAt) === dateF)),
    [batchSubs, dateF],
  );
  const detail = useMemo(() => batchDetail(filtered, slug), [filtered, slug]);
  const commentOptions = useMemo(() => commentClasses(detail.comments), [detail.comments]);
  const shownComments = useMemo(
    () => (commentClass === "all" ? detail.comments : detail.comments.filter((c) => c.class === commentClass)),
    [detail.comments, commentClass],
  );

  if (!user) return null;

  if (ready && detail.responses === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">No feedback for this batch</h2>
          <p className="mt-1 text-sm text-muted">There are no responses in your view.</p>
          <div className="mt-5 flex justify-center">
            <Button href="/feedback" variant="secondary" size="md">← Back to feedback</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link href="/feedback" className="text-sm text-muted hover:text-brand">← Feedback</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{detail.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted">
              <Stars value={detail.overall} />
              <span className="font-semibold text-foreground">{detail.overall.toFixed(1)}/5</span>
              <span>· {detail.responses} responses</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() =>
              downloadBatchDetailExcel({
                detail,
                submissions: filtered,
                filename: `feedback-${slug}${dateF !== "all" ? "-" + dateF : ""}.xlsx`,
              })
            }
          >
            ⬇ Download Excel
          </Button>
        </div>
      </div>

      {/* Feedback rounds (dates) */}
      {dates.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted">Date:</span>
          <button
            type="button"
            onClick={() => setDateF("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
              dateF === "all" ? "bg-brand/10 text-brand ring-brand/20" : "text-muted ring-border hover:text-foreground",
            )}
          >
            All dates
          </button>
          {dates.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDateF(d.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
                dateF === d.key ? "bg-brand/10 text-brand ring-brand/20" : "text-muted ring-border hover:text-foreground",
              )}
            >
              {d.label} ({d.count})
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall Rating" value={`${detail.overall.toFixed(1)}/5`} hint="Across all classes" />
        <StatCard label="Classes" value={detail.byClass.length} hint="Rated" />
        <StatCard label="Responses" value={detail.responses} hint="Student submissions" />
      </div>

      {/* Per-class ratings (5 parameters each) */}
      <div className="space-y-4">
        {detail.byClass.map((c) => (
          <Card key={c.class} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge tone="brand">{c.class}</Badge>
                <span className="text-xs text-muted">{c.responses} response{c.responses === 1 ? "" : "s"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stars value={c.avgRating} />
                <span className={cn("font-semibold", ratingTone(c.avgRating))}>{c.avgRating.toFixed(1)}</span>
              </div>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.criteria.map((cr) => (
                <li key={cr.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{cr.label}</span>
                    <span className={cn("font-semibold", ratingTone(cr.avg))}>{cr.avg.toFixed(1)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(cr.avg / 5) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Class comments — filter by class, download what's shown */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Class comments</h3>
            <p className="text-xs text-muted">
              {shownComments.length} comment{shownComments.length === 1 ? "" : "s"}
              {commentClass !== "all" ? ` · ${commentClass}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select className={SELECT} value={commentClass} onChange={(e) => setCommentClass(e.target.value)}>
              <option value="all">All classes</option>
              {commentOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={shownComments.length === 0}
              onClick={() =>
                downloadCommentsExcel(
                  shownComments,
                  `feedback-${slug}-comments${commentClass !== "all" ? "-" + commentClass.replace(/\s+/g, "_") : ""}.xlsx`,
                )
              }
            >
              ⬇ Download
            </Button>
          </div>
        </div>
        {shownComments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No comments {commentClass !== "all" ? `for ${commentClass}` : "yet"}.</p>
        ) : (
          <div className="max-h-[30rem] overflow-auto scrollbar-thin">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Class</th>
                  <th className="sticky top-0 z-10 bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Comment</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shownComments.map((c, i) => (
                  <tr key={i} className="align-top transition-colors hover:bg-surface-2/60">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{c.class}</td>
                    <td className="px-4 py-3 text-foreground/85">{c.text}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{c.createdAt ? dateLabel(c.createdAt) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
