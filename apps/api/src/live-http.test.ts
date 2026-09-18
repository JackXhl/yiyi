import { describe, expect, it } from "vitest";

const base = process.env.LIVE_HTTP_BASE || "http://127.0.0.1:3000";
const live = process.env.LIVE_HTTP === "1";

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data: data as { message?: string; items?: unknown[]; token?: string } };
}

describe.skipIf(!live)("live http", () => {
  it("lists public plans and rejects anonymous articles", async () => {
    const plans = await req("/api/billing/plans");
    expect(plans.status).toBe(200);
    expect(Array.isArray(plans.data.items)).toBe(true);
    const articles = await req("/api/articles");
    expect(articles.status).toBe(401);
    const admin = await req("/api/admin/users");
    expect(admin.status).toBe(401);
    const mcp = await req("/api/mcp/tools");
    expect(mcp.status).toBe(401);
  });

  it("rejects empty login and throttles repeated failures", async () => {
    const bad = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "x", password: "1" }) });
    expect(bad.status).toBe(400);
    const email = `throttle-${Date.now()}@yiyi.local`;
    let last = 0;
    for (let i = 0; i < 9; i++) {
      const r = await req("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: "password1" }),
      });
      last = r.status;
    }
    expect(last).toBe(429);
  });

  it("rejects empty plan id on order create when logged out", async () => {
    const r = await req("/api/billing/orders", { method: "POST", body: JSON.stringify({ planId: "" }) });
    expect([400, 401]).toContain(r.status);
  });

  it("registers then rejects oversized article patch", async () => {
    const email = `live-${Date.now()}@yiyi.local`;
    const reg = await req("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password: "password1" }),
    });
    expect(reg.status).toBeLessThan(300);
    const token = (reg.data as { token?: string }).token;
    expect(token).toBeTruthy();
    const created = await req("/api/articles", {
      method: "POST",
      body: "{}",
      headers: { Authorization: `Bearer ${token}` },
    });
    const id = (created.data as { id?: string }).id;
    expect(created.status).toBeLessThan(300);
    expect(id).toBeTruthy();
    const patch = await req(`/api/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ theme: "x".repeat(201) }),
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(patch.status).toBe(400);
    const mcp = await req("/api/mcp/call", {
      method: "POST",
      body: JSON.stringify({ tool: "publish" }),
    });
    expect([401, 403, 400]).toContain(mcp.status);
  });
});
