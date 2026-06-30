"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiPost, apiGet, apiDelete } from "@/lib/apiClient";

const AuthContext = createContext(null);

const SESSION_KEY = "torii-auth";

/**
 * Auth with a MongoDB backend.
 * - Credentials are validated by /api/auth/login (server-side, hashed passwords).
 * - The signed-in user (session) is kept in localStorage so a refresh keeps you
 *   logged in; the actual user records live in MongoDB and are shared across devices.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const data = await apiGet("/users");
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  }, []);

  // Admin needs the user list (for management + dashboard count).
  useEffect(() => {
    if (user?.role === "admin") refreshUsers();
    else setUsers([]);
  }, [user, refreshUsers]);

  const login = useCallback(async (username, password) => {
    try {
      const data = await apiPost("/auth/login", { username, password });
      setUser(data.user);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
      } catch {
        /* ignore */
      }
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: e.message || "Login failed." };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const createUser = useCallback(
    async (data) => {
      try {
        await apiPost("/users", data);
        await refreshUsers();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || "Could not create user." };
      }
    },
    [refreshUsers],
  );

  const deleteUser = useCallback(
    async (username) => {
      try {
        await apiDelete(`/users/${encodeURIComponent(username)}`);
        await refreshUsers();
      } catch {
        /* ignore */
      }
    },
    [refreshUsers],
  );

  const value = useMemo(
    () => ({ user, users, ready, login, logout, createUser, deleteUser }),
    [user, users, ready, login, logout, createUser, deleteUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
