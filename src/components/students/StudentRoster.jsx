"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { byName, cn, normalizeUsn } from "@/lib/utils";

/** Rows shown per page in the roster table. */
const PAGE_SIZE = 25;

/** Deterministic initials for the avatar chip. */
function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Windowed page numbers with ellipses, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function getPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function StudentRoster({ rosters }) {
  const [batch, setBatch] = useState("all");
  const [branch, setBranch] = useState("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Students in the currently selected batch (with a source-batch label).
  const batchStudents = useMemo(() => {
    const selected = batch === "all" ? rosters : rosters.filter((r) => r.slug === batch);
    return selected.flatMap((r) => r.students.map((s) => ({ ...s, batch: r.title })));
  }, [rosters, batch]);

  // Branch options + counts for the current batch.
  const branches = useMemo(() => {
    const counts = new Map();
    for (const s of batchStudents) counts.set(s.branch, (counts.get(s.branch) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [batchStudents]);

  // Reset branch filter if it no longer exists in the active batch.
  const effectiveBranch = useMemo(
    () => (branch !== "all" && !branches.some(([b]) => b === branch) ? "all" : branch),
    [branch, branches],
  );

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return batchStudents
      .filter((s) => (effectiveBranch === "all" ? true : s.branch === effectiveBranch))
      .filter((s) =>
        q === ""
          ? true
          : s.name.toLowerCase().includes(q) ||
            s.usn.toLowerCase().includes(q),
      )
      .sort(byName);
  }, [batchStudents, effectiveBranch, deferredQuery]);

  const showingMulti = batch === "all";

  // Pagination — clamp the page whenever the filtered result set changes.
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [effectiveBranch, deferredQuery, batch]);

  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = results.slice(start, start + PAGE_SIZE);

  const rangeFrom = results.length === 0 ? 0 : start + 1;
  const rangeTo = Math.min(start + PAGE_SIZE, results.length);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* Batch tabs */}
        <div
          role="tablist"
          aria-label="Select batch"
          className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1"
        >
          {[{ slug: "all", title: "All batches" }, ...rosters].map((r) => {
            const slug = "slug" in r ? r.slug : "all";
            const selected = batch === slug;
            return (
              <button
                key={slug}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setBatch(slug)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "bg-brand text-white shadow-sm"
                    : "text-foreground/70 hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {r.title}
              </button>
            );
          })}
        </div>

        {/* Search + branch filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              aria-hidden
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or USN…"
              aria-label="Search participants by name or USN"
              className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <label className="sr-only" htmlFor="branch-filter">
            Filter by branch
          </label>
          <select
            id="branch-filter"
            value={effectiveBranch}
            onChange={(e) => setBranch(e.target.value)}
            className="h-11 rounded-full border border-border bg-surface px-4 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="all">All branches ({batchStudents.length})</option>
            {branches.map(([b, count]) => (
              <option key={b} value={b}>
                {b} ({count})
              </option>
            ))}
          </select>
        </div>

        {/* Branch quick chips */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBranch("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
              effectiveBranch === "all"
                ? "bg-brand/10 text-brand ring-brand/20"
                : "text-muted ring-border hover:text-foreground",
            )}
          >
            All ({batchStudents.length})
          </button>
          {branches.map(([b, count]) => (
            <button
              key={b}
              type="button"
              onClick={() => setBranch(b)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                effectiveBranch === b
                  ? "bg-brand/10 text-brand ring-brand/20"
                  : "text-muted ring-border hover:text-foreground",
              )}
            >
              {b} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="mt-6 text-sm text-muted" role="status" aria-live="polite">
        Showing <span className="font-semibold text-foreground">{results.length}</span>{" "}
        {results.length === 1 ? "participant" : "participants"}
        {effectiveBranch !== "all" && <> in {effectiveBranch}</>}
        {deferredQuery.trim() && <> matching “{deferredQuery.trim()}”</>}
      </p>

      {/* Results */}
      {results.length === 0 ? (
        <Card className="mt-4 px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No participants found</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Try a different name or USN, or clear the branch filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setBranch("all");
            }}
            className="mt-4 text-sm font-medium text-brand hover:underline"
          >
            Reset filters
          </button>
        </Card>
      ) : (
        <Card className="mt-4 overflow-hidden">
          {/* Desktop table — vertically scrollable with a sticky header */}
          <div className="hidden max-h-[60vh] overflow-auto scrollbar-thin md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="sticky top-0 z-10 w-20 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    S.No
                  </th>
                  <th scope="col" className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    Name
                  </th>
                  <th scope="col" className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    USN
                  </th>
                  <th scope="col" className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    Branch
                  </th>
                  {showingMulti && (
                    <th scope="col" className="sticky top-0 z-10 bg-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      Batch
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.map((s, i) => (
                  <tr key={`${s.usn}-${s.batch}`} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3 text-muted">{start + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
                        >
                          {initials(s.name)}
                        </span>
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{normalizeUsn(s.usn)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{s.branch}</Badge>
                    </td>
                    {showingMulti && (
                      <td className="px-4 py-3 text-xs text-muted">{s.batch}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — also scrollable */}
          <ul className="max-h-[60vh] divide-y divide-border overflow-auto scrollbar-thin md:hidden">
            {pageItems.map((s, i) => (
              <li key={`${s.usn}-${s.batch}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 shrink-0 text-xs text-muted">{start + i + 1}</span>
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
                >
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="font-mono text-xs text-muted">{normalizeUsn(s.usn)}</p>
                </div>
                <Badge tone="neutral">{s.branch}</Badge>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
            <p className="text-xs text-muted">
              Showing <span className="font-semibold text-foreground">{rangeFrom}–{rangeTo}</span> of{" "}
              <span className="font-semibold text-foreground">{results.length}</span>
            </p>
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 1}
                aria-label="Previous page"
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border px-2 text-sm text-foreground/80 transition-colors enabled:hover:bg-surface-2 disabled:opacity-40"
              >
                ‹
              </button>
              {getPageList(safePage, pageCount).map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-muted">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === safePage ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors",
                      p === safePage
                        ? "border-brand bg-brand text-white"
                        : "border-border text-foreground/80 hover:bg-surface-2",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage === pageCount}
                aria-label="Next page"
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border px-2 text-sm text-foreground/80 transition-colors enabled:hover:bg-surface-2 disabled:opacity-40"
              >
                ›
              </button>
            </nav>
          </div>
        </Card>
      )}
    </div>
  );
}
