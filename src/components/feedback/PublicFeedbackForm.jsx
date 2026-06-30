"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { apiGet, apiPost } from "@/lib/apiClient";
import { CRITERIA, RATING_LABELS } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const blankRatings = () => Object.fromEntries(CRITERIA.map((c) => [c.key, 0]));

export function PublicFeedbackForm() {
  const params = useSearchParams();
  // 'key' → 'classes' → 'final' → 'done'  (+ 'locked')
  const [stage, setStage] = useState("key");

  const [passkey, setPasskey] = useState("");
  const [batch, setBatch] = useState(null); // { batchName, classes: [] }
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const [entries, setEntries] = useState([]); // [{ class, ratings }]
  const [index, setIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const k = params.get("key");
    if (k) setPasskey(k.toUpperCase());
  }, [params]);

  const verify = async (e) => {
    e?.preventDefault();
    setError("");
    const code = passkey.trim();
    if (!code) return setError("Enter the batch passkey shared by your trainer.");
    setVerifying(true);
    try {
      const data = await apiGet(`/feedback/verify?code=${encodeURIComponent(code)}`);
      setBatch({ batchName: data.batchName, classes: data.classes });
      if (data.locked) {
        setStage("locked");
        return;
      }
      setEntries(data.classes.map((c) => ({ class: c, ratings: blankRatings() })));
      setIndex(0);
      setStage("classes");
    } catch (err) {
      setError(err.message || "Invalid passkey.");
    } finally {
      setVerifying(false);
    }
  };

  const setRating = (key, v) =>
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ratings: { ...e.ratings, [key]: v } } : e)),
    );

  const nextClass = () => {
    setError("");
    const cur = entries[index];
    const unrated = CRITERIA.find((c) => !cur.ratings[c.key]);
    if (unrated) return setError(`Please rate "${unrated.label}".`);
    if (index < entries.length - 1) setIndex(index + 1);
    else setStage("final");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!comment.trim()) return setError("A final comment is required.");
    setSubmitting(true);
    try {
      await apiPost("/feedback", {
        code: passkey.trim(),
        classes: entries,
        comment: comment.trim(),
      });
      setStage("done");
    } catch (err) {
      setError(err.message || "Could not submit. Try again.");
      setSubmitting(false);
    }
  };

  const current = entries[index];

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(var(--brand)/0.10),transparent_70%)]" />
      <div className="absolute right-4 top-4"><ThemeToggle /></div>

      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center"><Logo /></div>

        {/* 1. Passkey */}
        {stage === "key" && (
          <Card className="p-7">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Batch Feedback</h1>
            <p className="mt-1 text-sm text-muted">Enter the batch passkey shared by your trainer.</p>
            <form onSubmit={verify} className="mt-6 space-y-4">
              <input
                value={passkey}
                onChange={(e) => setPasskey(e.target.value.toUpperCase())}
                placeholder="Passkey"
                autoCapitalize="characters"
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-center text-lg font-semibold uppercase tracking-[0.3em] text-foreground placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <Button type="submit" size="md" className="w-full" disabled={verifying}>
                {verifying ? "Checking…" : "Continue"}
              </Button>
            </form>
          </Card>
        )}

        {/* 2. Class stepper */}
        {stage === "classes" && current && (
          <Card className="p-7">
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Class {index + 1} of {entries.length}</span>
                <span>{batch.batchName}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((index + 1) / entries.length) * 100}%` }} />
              </div>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground">{current.class}</h1>
            <p className="mt-1 text-xs text-muted">1 Poor · 2 Average · 3 Good · 4 Very Good · 5 Excellent</p>

            <div className="mt-5 space-y-3">
              {CRITERIA.map((c) => (
                <div key={c.key} className="rounded-xl border border-border bg-surface-2/40 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{c.label}</span>
                    <span className="text-xs font-medium text-brand">
                      {current.ratings[c.key] ? RATING_LABELS[current.ratings[c.key]] : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} type="button" onClick={() => setRating(c.key, v)} aria-label={`${c.label}: ${v}`} className="p-0.5">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn(v <= current.ratings[c.key] ? "text-amber-500" : "text-border hover:text-amber-400")}>
                          <path d="m12 2 3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.8 5.9 20.8 7.1 14l-5-4.8 6.9-.9L12 2Z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-5 flex gap-2">
              {index > 0 && (
                <Button variant="secondary" size="md" onClick={() => { setError(""); setIndex(index - 1); }}>
                  Back
                </Button>
              )}
              <Button size="md" className="flex-1" onClick={nextClass}>
                {index < entries.length - 1 ? "Next class →" : "Final step →"}
              </Button>
            </div>
          </Card>
        )}

        {/* 4. Final batch comment */}
        {stage === "final" && (
          <Card className="p-7">
            <Badge tone="brand">{batch.batchName}</Badge>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground">Overall batch feedback</h1>
            <p className="mt-1 text-sm text-muted">Any final comments about the batch?</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
                required
                placeholder="Share your overall feedback about this batch…"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="md" onClick={() => { setError(""); setIndex(entries.length - 1); setStage("classes"); }}>
                  Back
                </Button>
                <Button type="submit" size="md" className="flex-1" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit feedback"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Locked */}
        {stage === "locked" && (
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">Feedback is locked</h1>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              Feedback for {batch?.batchName || "this batch"} isn&apos;t open right now. Please ask
              the admin to unlock it, then try again.
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="secondary" size="md" onClick={() => { setStage("key"); setError(""); }}>
                Try again
              </Button>
            </div>
          </Card>
        )}

        {/* 5. Done */}
        {stage === "done" && (
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">Thank you!</h1>
            <p className="mt-1 text-sm text-muted">Your batch feedback has been recorded anonymously.</p>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted">© 2026 Torii Minds · Step IN, Stand OUT</p>
      </div>
    </div>
  );
}
