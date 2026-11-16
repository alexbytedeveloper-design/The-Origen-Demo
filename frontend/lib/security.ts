import { timingSafeEqual } from "node:crypto";

import { CSRF_COOKIE } from "./cookies";

type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Límite por ventana deslizante en memoria. En serverless es por instancia; se
 * complementa con el bloqueo por cuenta en el login.
 * Devuelve los segundos de espera o null si la petición está permitida.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): number | null {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return null;
  }
  if (bucket.count >= limit) {
    return Math.max(1, Math.ceil((bucket.reset - now) / 1000));
  }
  bucket.count += 1;
  return null;
}

/** Exige que una petición mutante venga del mismo origen. */
export function isSameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  return true;
}

/** Doble envío: cabecera X-CSRF-Token debe coincidir con la cookie. */
export function verifyCsrf(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`),
  );
  const header = req.headers.get("x-csrf-token");
  if (!match || !header) return false;

  const cookieValue = Buffer.from(decodeURIComponent(match[1]!));
  const headerValue = Buffer.from(header);
  return (
    cookieValue.length === headerValue.length &&
    timingSafeEqual(cookieValue, headerValue)
  );
}

/** Lee JSON con límite de tamaño (por cabecera y por longitud real). */
export async function readJson(
  req: Request,
  maxBytes = 16 * 1024,
): Promise<unknown | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared && declared > maxBytes) return null;

  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function noStore(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
