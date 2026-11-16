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

const BASE = "/api";

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
    response = await fetch(`${BASE}${path}`, {
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