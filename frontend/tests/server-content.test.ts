import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getInitialContent } from "@/lib/server-content";

const fetchMock = vi.fn<typeof fetch>();

const payload = {
  locale: "es",
  menu: { sections: [] },
  reviews: [],
  signature: [],
  updatedAt: "2026-11-16T00:00:00Z",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getInitialContent", () => {
  it("loads the content from the internal API without caching", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getInitialContent("es")).resolves.toMatchObject({ locale: "es" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/api/v1/content/es");
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("encodes the locale", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    await getInitialContent("../es");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://127.0.0.1:8000/api/v1/content/..%2Fes",
    );
  });

  it("returns null when the API is not available", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getInitialContent("es")).resolves.toBeNull();
  });

  it("returns null for an error response", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 502 }));

    await expect(getInitialContent("es")).resolves.toBeNull();
  });

  it("returns null for an incomplete payload", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ locale: "es" }), { status: 200 }),
    );

    await expect(getInitialContent("es")).resolves.toBeNull();
  });
});
