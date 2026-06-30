"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiGet } from "@/lib/apiClient";
import { seesAllStudents, roleLabel } from "@/lib/roles";

export default function BatchesPage() {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet("/students")
      .then((d) => setDirectory(d.students || []))
      .catch(() => setDirectory([]))
      .finally(() => setLoaded(true));
  }, []);

  const all = user ? seesAllStudents(user) : false;
  const students = useMemo(() => {
    if (!user) return [];
    return all ? directory : directory.filter((s) => s.department === user.department);
  }, [directory, user, all]);

  const batches = useMemo(() => {
    const m = new Map();
    for (const s of students) {
      const b = s.batch || "—";
      const e = m.get(b) || { batch: b, count: 0, depts: new Map() };
      e.count += 1;
      e.depts.set(s.department, (e.depts.get(s.department) || 0) + 1);
      m.set(b, e);
    }
    return [...m.values()]
      .map((e) => ({ batch: e.batch, count: e.count, depts: [...e.depts.entries()].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count);
  }, [students]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Batches</h2>
          <p className="mt-1 text-sm text-muted">
            {all ? "Training batches and their student composition." : `Your department's students by batch (${user.department}).`}
          </p>
        </div>
        <Badge tone="brand">{all ? roleLabel(user.role) : user.department}</Badge>
      </div>

      {!loaded ? (
        <Card className="grid place-items-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
        </Card>
      ) : batches.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No batches yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Import the student directory (with a Batch column) to see batches here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Link key={b.batch} href={`/students?batch=${encodeURIComponent(b.batch)}`}>
              <Card interactive className="group flex h-full flex-col overflow-hidden">
                <div className="flex items-center justify-between bg-gradient-to-r from-brand/10 to-transparent px-5 py-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 5h16v4H4V5Zm0 6h16v4H4v-4Zm0 6h10v2H4v-2Z" /></svg>
                  </span>
                  <span className="text-3xl font-bold text-foreground">{b.count}</span>
                </div>
                <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
                  <h3 className="font-semibold text-foreground">{b.batch}</h3>
                  <p className="text-xs text-muted">{b.count} students · {b.depts.length} departments</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.depts.slice(0, 4).map(([d, n]) => (
                      <Badge key={d} tone="neutral">{d} · {n}</Badge>
                    ))}
                    {b.depts.length > 4 && <Badge tone="outline">+{b.depts.length - 4}</Badge>}
                  </div>
                  <p className="mt-auto pt-4 text-sm font-medium text-brand">View students →</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
