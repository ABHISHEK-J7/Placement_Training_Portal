"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";

const FeedbackContext = createContext(null);

/**
 * Trainer-feedback records from MongoDB (/api/feedback). Read-only here —
 * records are created by students via the public passkey form. Only fetched
 * when a staff user is signed in (so the public form never loads staff data).
 */
export function FeedbackProvider({ children }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet("/feedback");
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setRecords([]);
      setReady(true);
    }
  }, [user, refresh]);

  const value = useMemo(
    () => ({ records, ready, refresh }),
    [records, ready, refresh],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return ctx;
}
