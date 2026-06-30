"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ASSIGNABLE_ROLES, DEPARTMENTS, canManageUsers, roleLabel } from "@/lib/roles";

const FIELD =
  "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30";

const empty = { name: "", username: "", password: "", role: "hod", department: DEPARTMENTS[0] };

export default function UsersPage() {
  const { user, users, createUser, deleteUser } = useAuth();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!user) return null;

  if (!canManageUsers(user)) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Only the administrator can manage portal users.
          </p>
        </Card>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    const result = await createUser(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(`User "${form.name}" created.`);
    setForm(empty);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
        <p className="mt-1 text-sm text-muted">
          Create accounts for HODs, the Placement Cell, and the Principal.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create form */}
        <Card className="h-fit p-6">
          <h3 className="text-base font-semibold text-foreground">Create user</h3>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
              <input className={FIELD} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Dr. Anita Rao" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Username</label>
              <input className={FIELD} value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="e.g. hod.cse" autoCapitalize="none" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input className={FIELD} type="text" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Set a password" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
              <select className={FIELD} value={form.role} onChange={(e) => set("role", e.target.value)}>
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
            {form.role === "hod" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Department</label>
                <select className={FIELD} value={form.department} onChange={(e) => set("department", e.target.value)}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            {ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">{ok}</p>}

            <Button type="submit" size="md" className="w-full">Create user</Button>
          </form>
        </Card>

        {/* User list */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-foreground">Portal users</h3>
            <Badge tone="neutral">{users.length}</Badge>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-muted">No users yet. Create your first user on the left.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.username} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {(u.name || u.username).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-xs text-muted">
                      @{u.username} · {roleLabel(u.role)}
                      {u.department ? ` · ${u.department}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteUser(u.username)}
                    aria-label={`Delete ${u.name}`}
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

      <p className="text-xs text-muted">
        Note: this is a front-end demo — accounts are stored in this browser. They&apos;ll move
        to a secure backend in the next phase.
      </p>
    </div>
  );
}
