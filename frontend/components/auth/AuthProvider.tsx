"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type User } from "@/lib/api";
import type { Dict } from "@/messages/es";

type Mode = "login" | "register" | null;

type AuthContextValue = {
  user: User | null;
  checking: boolean;
  mode: Mode;
  error: string | null;
  open: (mode: Exclude<Mode, null>) => void;
  close: () => void;
  switchMode: (mode: Exclude<Mode, null>) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown, dict: Dict): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return dict.auth.errCredentials;
    if (error.status === 409) return dict.auth.errExists;
    if (error.status === 429) return dict.auth.errRate;
    if (error.status === 422) return dict.auth.errWeak;
  }
  return dict.auth.errGeneric;
}

export function AuthProvider({
  dict,
  children,
}: {
  dict: Dict;
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((me) => {
        if (alive) setUser(me);
      })
      .catch(() => {
        /* sin sesión es un estado válido */
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const open = useCallback((next: Exclude<Mode, null>) => {
    setError(null);
    setMode(next);
  }, []);

  const close = useCallback(() => {
    setMode(null);
    setError(null);
  }, []);

  const switchMode = useCallback((next: Exclude<Mode, null>) => {
    setError(null);
    setMode(next);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const me = await api.login(email, password);
        setUser(me);
        setMode(null);
        setError(null);
      } catch (err) {
        setError(messageFor(err, dict));
        throw err;
      }
    },
    [dict],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const me = await api.register(name, email, password);
        setUser(me);
        setMode(null);
        setError(null);
      } catch (err) {
        setError(messageFor(err, dict));
        throw err;
      }
    },
    [dict],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* la sesión local se cierra igual */
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      checking,
      mode,
      error,
      open,
      close,
      switchMode,
      signIn,
      signUp,
      signOut,
    }),
    [user, checking, mode, error, open, close, switchMode, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth necesita AuthProvider");
  return ctx;
}
