/**
 * lib/auth/context.tsx
 * Auth context and useAuth hook.
 * Provides the logged-in user's data to all Client Components.
 *
 * The AuthProvider reads the session from a lightweight /api/auth/session
 * endpoint on mount, so the context is always fresh without prop-drilling.
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { SessionUser } from "@/lib/supabase/types";

// ─── Context Shape ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  /** The currently logged-in user, or null if not authenticated. */
  user: SessionUser | null;
  /** True while the session is being fetched on initial load. */
  isLoading: boolean;
  /** Call this to refresh the user context (e.g., after login). */
  refreshUser: () => Promise<void>;
  /** True if user is admin. Convenience shortcut. */
  isAdmin: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
/**
 * Wraps the app and provides authenticated user data to all descendants.
 * Place in app/layout.tsx.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetches current session from the API route. */
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    refreshUser,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Returns the current auth context.
 * Must be used inside a component wrapped by AuthProvider.
 *
 * @example
 * const { user, isAdmin } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
