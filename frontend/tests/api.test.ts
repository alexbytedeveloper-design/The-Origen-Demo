import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "@/lib/api";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("document", { cookie: "" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api requests", () => {
  it("prefixes the internal API base and encodes locale", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ locale: "es" }));

    await api.content("es");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/backend/api/v1/content/es");
    expect(init?.credentials).toBe("same-origin");
    expect(init?.cache).toBe("no-store");
  });

  it("encodes locale values to avoid path traversal", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ locale: "es" }));

    await api.content("../secret");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/backend/api/v1/content/..%2Fsecret",
    );
  });

  it("adds the CSRF header from the cookie on writes", async () => {
    vi.stubGlobal("document", { cookie: "theme=dark; origen_csrf=tok%2Ben" });
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));

    await api.login("demo@theorigen.cu", "Origen2026!");

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("X-CSRF-Token")).toBe("tok+en");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not add the CSRF header on safe requests", async () => {
    vi.stubGlobal("document", { cookie: "origen_csrf=tok" });
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));

    await api.me();

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.has("X-CSRF-Token")).toBe(false);
  });

  it("keeps a caller-provided content type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));

    await api.reserve({
      date: "2026-12-01",
      time: "20:00",
      partySize: 2,
      name: "Ana",
      email: "ana@example.com",
      phone: "+53 50667554",
      notes: "",
    });

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.partySize).toBe(2);
    expect(body.notes).toBe("");
  });

  it("returns undefined for an empty 204 response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.logout()).resolves.toBeUndefined();
  });

  it("flags a network failure without leaking the original error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(api.me()).rejects.toMatchObject({
      name: "Error",
      status: 0,
      code: "network",
    });
  });

  it("maps an API error body to ApiError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { detail: "Demasiados intentos.", code: "too_many_attempts" },
        429,
      ),
    );

    const error = await api.login("a@b.cu", "x").catch((reason) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 429,
      code: "too_many_attempts",
      message: "Demasiados intentos.",
    });
  });

  it("uses a generic code when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>boom</html>", { status: 500 }));

    await expect(api.me()).rejects.toMatchObject({
      status: 500,
      code: "error",
    });
  });

  it("returns null when a successful body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));

    await expect(api.me()).resolves.toBeNull();
  });
});
