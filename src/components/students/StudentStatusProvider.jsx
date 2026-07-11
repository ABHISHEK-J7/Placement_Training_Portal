"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";

const StudentStatusContext = createContext(null);

const norm = (t) => (t || "").trim().toUpperCase();
const ACTIVE_ONLY_KEY = "torii.activeOnly";

/**
 * Portal-side active/inactive status for students, keyed by Torii number. Backed
 * by /api/students/status. `activeOnly` (persisted, default on) is the shared
 * preference that pages use to exclude inactive students from counts & analytics
 * while keeping their history available when it's turned off.
 */
export function StudentStatusProvider({ children }) {
  const { user } = useAuth();
  const [inactive, setInactive] = useState(() => new Set());
  const [ready, setReady] = useState(false);
  const [activeOnly, setActiveOnlyState] = useState(true);

  // Restore the activeOnly preference on mount (client only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ACTIVE_ONLY_KEY);
    if (saved === "false") setActiveOnlyState(false);
  }, []);

  const setActiveOnly = useCallback((v) => {
    setActiveOnlyState(v);
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_ONLY_KEY, v ? "true" : "false");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet("/students/status");
      setInactive(new Set((data.inactive || []).map(norm)));
    } catch {
      setInactive(new Set());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else {
      setInactive(new Set());
      setReady(true);
    }
  }, [user, refresh]);

  const isActive = useCallback((torii) => !inactive.has(norm(torii)), [inactive]);

  // Toggle a single student; optimistic then reconciled.
  const setStudentActive = useCallback(async (torii, active) => {
    const key = norm(torii);
    setInactive((prev) => {
      const next = new Set(prev);
      if (active) next.delete(key);
      else next.add(key);
      return next;
    });
    try {
      await apiPost("/students/status", { torii: key, active, updatedBy: user?.username || "" });
    } catch {
      refresh();
    }
  }, [refresh, user]);

  // Apply a continuing list: those Torii numbers stay active, the rest of the
  // provided roster becomes inactive.
  const setContinuing = useCallback(async (continuing, allTorii) => {
    const data = await apiPost("/students/status", {
      continuing: continuing.map(norm),
      allTorii: allTorii.map(norm),
      updatedBy: user?.username || "",
    });
    setInactive(new Set((data.inactive || []).map(norm)));
    return data;
  }, [user]);

  const resetAll = useCallback(async () => {
    await apiPost("/students/status", { reset: true, updatedBy: user?.username || "" });
    setInactive(new Set());
  }, [user]);

  const value = useMemo(
    () => ({
      inactive,
      inactiveCount: inactive.size,
      ready,
      activeOnly,
      setActiveOnly,
      isActive,
      setStudentActive,
      setContinuing,
      resetAll,
      refresh,
    }),
    [inactive, ready, activeOnly, setActiveOnly, isActive, setStudentActive, setContinuing, resetAll, refresh],
  );

  return <StudentStatusContext.Provider value={value}>{children}</StudentStatusContext.Provider>;
}

export function useStudentStatus() {
  const ctx = useContext(StudentStatusContext);
  if (!ctx) throw new Error("useStudentStatus must be used within a StudentStatusProvider");
  return ctx;
}
