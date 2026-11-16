/**
 * Origen público del backend.
 *
 * En el navegador las peticiones no van directas a este dominio: se piden a
 * `/backend/api/v1/...` y Next las reescribe a `API_URL` en el servidor (ver
 * `next.config.ts`). Así las cookies de sesión y el token CSRF siguen siendo de
 * primer origen, tanto en local como en producción.
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000"
).replace(/\/+$/, "");

/**
 * Origen del backend visto desde el proceso de Next.
 *
 * En Docker el navegador y el servidor no comparten red: el servicio se llama
 * `http://api:8000`, mientras que `NEXT_PUBLIC_API_URL` sigue siendo la URL
 * pública.
 */
export const API_INTERNAL_URL = (
  process.env.API_INTERNAL_URL?.trim() || API_URL
).replace(/\/+$/, "");

/** Prefijo versionado que expone FastAPI. */
export const API_PATH = "/api/v1";

/** Base de mismo origen que consumen los componentes de cliente. */
export const API_BASE = `/backend${API_PATH}`;

/** URL absoluta para llamadas de servidor (SSR/RSC). */
export function apiServerUrl(path: string): string {
  return `${API_INTERNAL_URL}${API_PATH}${path}`;
}

/** URL pública del sitio, sin barra final. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");

export type Dish = {
  name: string;
  description?: string;
  price: number;
};

export type MenuGroup = {
  id: string;
  title: string;
  note?: string;
  items: Dish[];
};

export type MenuSectionData = {
  id: string;
  title: string;
  note?: string;
  groups: MenuGroup[];
};

export type Review = {
  quote: string;
  author: string;
  date: string;
  /** Reseñas de muestra: se quitan cuando el local entregue las reales. */
  sample?: boolean;
};

export type ContentPayload = {
  locale: string;
  menu: { note?: string; sections: MenuSectionData[] };
  reviews: Review[];
  signature: Dish[];
  updatedAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "guest" | "staff";
};

export type ReservationInput = {
  date: string;
  time: string;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  notes?: string;
};

export type Reservation = ReservationInput & {
  id: string;
  status: string;
  createdAt: string;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCookie("origen_csrf");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network");
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const body = (data ?? {}) as { detail?: string; code?: string };
    throw new ApiError(
      response.status,
      body.code ?? "error",
      typeof body.detail === "string" ? body.detail : undefined,
    );
  }

  return data as T;
}

export const api = {
  content: (locale: string) =>
    request<ContentPayload>(`/content/${encodeURIComponent(locale)}`),

  me: () => request<User>("/auth/me"),

  login: (email: string, password: string) =>
    request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  reserve: (payload: ReservationInput) =>
    request<Reservation>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
