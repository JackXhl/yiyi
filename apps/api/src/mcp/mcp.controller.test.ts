import { describe, expect, it } from "vitest";
import { MCP_ALLOWED } from "./mcp.controller";

describe("MCP allowlist", () => {
  it("exposes the four writing tools and never publish", () => {
    expect([...MCP_ALLOWED]).toEqual([
      "upsert_article",
      "add_anchor",
      "trigger_generate",
      "read_article",
    ]);
    expect(MCP_ALLOWED.includes("publish" as (typeof MCP_ALLOWED)[number])).toBe(false);
  });
});
