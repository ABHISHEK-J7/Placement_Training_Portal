"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";
import { FEEDBACK_BATCHES } from "@/lib/feedback";
import { canManageUsers } from "@/lib/roles";
import { cn } from "@/lib/utils";

const FIELD =
  "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30";

export default function PasskeysPage() {
  const { user } = useAuth();
  const [passkeys, setPasskeys] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(null);
  const [toggling, setToggling] = useState(false);

  const [batchSlug, setBatchSlug] = useState(FEEDBACK_BATCHES[0]?.slug || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const isAdmin = canManageUsers(user);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet("/passkeys");
      setPasskeys(data.passkeys || []);
    } catch {
      setPasskeys([]);
    } finally {
      setLoaded(true);
    }
    try {
      const lock = await apiGet("/feedback/lock");
      setLocked(!!lock.locked);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  const toggleLock = async () => {
    setToggling(true);
    try {
      const data = await apiPost("/feedback/lock", { locked: !locked });
      setLocked(!!data.locked);
    } catch {
      /* ignore */
    } finally {
      setToggling(false);
    }
  };

  const selectedBatch = FEEDBACK_BATCHES.find((b) => b.slug === batchSlug);

  const formLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/placement-trainings/feedback-form`;
  }, []);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Only the administrator can manage feedback passkeys.
          </p>
        </Card>
      </div>
    );
  }

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await apiPost("/passkeys", { batchSlug, code: code.trim() });
      setCode("");
      await refresh();
    } catch (err) {
      setError(err.message || "Could not create passkey.");
    }
  };

  const remove = async (c) => {
    await apiDelete(`/passkeys/${encodeURIComponent(c)}`);
    await refresh();
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Feedback Passkeys</h2>
        <p className="mt-1 text-sm text-muted">
          Generate one passkey per batch. Share the link + passkey with students — they rate
          every class in the batch, then leave an overall comment. No login needed.
        </p>
      </div>

      {/* Lock / unlock feedback collection */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              locked === false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d={locked === false ? "M8 11V8a4 4 0 0 1 7-2.6" : "M8 11V8a4 4 0 0 1 8 0v3"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Feedback collection</p>
            <p className="text-xs text-muted">
              {locked === null
                ? "Loading…"
                : locked
                  ? "Locked — students can't submit feedback."
                  : "Unlocked — students can submit feedback."}
            </p>
          </div>
        </div>
        <Button
          size="md"
          variant={locked ? "primary" : "secondary"}
          onClick={toggleLock}
          disabled={toggling || locked === null}
        >
          {toggling ? "…" : locked ? "Unlock feedback" : "Lock feedback"}
        </Button>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Student feedback link</p>
          <p className="truncate font-mono text-xs text-muted">{formLink}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => copy(formLink, "__base")}>
          {copied === "__base" ? "Copied!" : "Copy link"}
        </Button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-6">
          <h3 className="text-base font-semibold text-foreground">Generate passkey</h3>
          <form onSubmit={create} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Batch</label>
              <select className={FIELD} value={batchSlug} onChange={(e) => setBatchSlug(e.target.value)}>
                {FEEDBACK_BATCHES.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
              {selectedBatch && (
                <p className="mt-1.5 text-xs text-muted">
                  {selectedBatch.classes.length} classes: {selectedBatch.classes.join(", ")}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Passkey <span className="text-muted">(optional — auto-generated if blank)</span>
              </label>
              <input
                className={`${FIELD} font-mono uppercase tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Leave blank to generate"
                maxLength={12}
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <Button type="submit" size="md" className="w-full">Create passkey</Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-foreground">Active passkeys</h3>
            <Badge tone="neutral">{passkeys.length}</Badge>
          </div>
          {!loaded ? null : passkeys.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted">
              No passkeys yet. Generate one on the left.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {passkeys.map((p) => (
                <li key={p.code} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="rounded-lg bg-brand/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-brand">
                    {p.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.batchName}</p>
                    <p className="text-xs text-muted">Batch feedback</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(`${formLink}?key=${p.code}`, p.code)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-brand/50 hover:text-brand"
                  >
                    {copied === p.code ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.code)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-300 hover:text-red-500"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
