import { createHash, randomBytes } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookies";
import { getDb } from "./db";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const isProd = process.env.NODE_ENV === "production";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function secretKey(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  if (raw && raw.length >= 32) return new TextEncoder().encode(raw);
  if (isProd) {
    throw new Error("JWT_SECRET no configurado (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode("dev-only-insecure-secret-change-me-now-32");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secretKey());
}

async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function issueSession(user: SessionUser): Promise<void> {
  const db = await getDb();
  const sid = randomBytes(16).toString("hex");
  const refresh = randomBytes(32).toString("base64url");
  const now = Date.now();

  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, refresh_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [
      sid,
      user.id,
      hashToken(refresh),
      now + REFRESH_TTL_SECONDS * 1000,
      now,
    ],
  });

  const access = await signAccessToken(user);
  const store = await cookies();

  store.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  store.set(REFRESH_COOKIE, `${sid}.${refresh}`, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(REFRESH_COOKIE)?.value;
  if (raw) {
    const [sid] = raw.split(".");
    if (sid) {
      const db = await getDb();
      await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sid] });
    }
  }
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    store.set(name, "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const id = await verifyAccessToken(token);
  if (!id) return null;

  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
    args: [id],
  });
  const row = res.rows[0];
  if (!row || Number(row.is_active) !== 1) return null;

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
  };
}

export async function rotateSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(REFRESH_COOKIE)?.value;
  if (!raw) return null;

  const [sid, token] = raw.split(".");
  if (!sid || !token) return null;

  const db = await getDb();
  const now = Date.now();
  const res = await db.execute({
    sql: "SELECT user_id, refresh_hash, expires_at FROM sessions WHERE id = ?",
    args: [sid],
  });
  const row = res.rows[0];

  if (!row) return null;
  if (Number(row.expires_at) < now) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sid] });
    return null;
  }
  // Reutilización de un refresh viejo: posible robo, se invalida la sesión.
  if (hashToken(token) !== String(row.refresh_hash)) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sid] });
    return null;
  }

  await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sid] });

  const users = await db.execute({
    sql: "SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1",
    args: [String(row.user_id)],
  });
  const user = users.rows[0];
  if (!user) return null;

  const sessionUser: SessionUser = {
    id: String(user.id),
    name: String(user.name),
    email: String(user.email),
    role: String(user.role),
  };
  await issueSession(sessionUser);
  return sessionUser;
}
