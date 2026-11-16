import { mkdirSync } from "node:fs";
import path from "node:path";

import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function buildClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) {
    return createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    });
  }

  const dir = process.env.DATA_DIR?.trim() || path.join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "origen.db").replace(/\\/g, "/");
  return createClient({ url: `file:${file}` });
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'guest',
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email)`,
];

async function migrate(db: Client): Promise<void> {
  for (const sql of SCHEMA) {
    await db.execute(sql);
  }
}

export async function getDb(): Promise<Client> {
  if (!client) client = buildClient();
  if (!ready) ready = migrate(client);
  await ready;
  return client;
}
