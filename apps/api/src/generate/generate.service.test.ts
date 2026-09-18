import { describe, expect, it } from "vitest";
import { canGenerate, type Anchor } from "@yiyi/shared";
import { GenerateService } from "./generate.service";

describe("GenerateService", () => {
  it("is constructable", () => {
    expect(typeof GenerateService).toBe("function");
  });
});

describe("generate gate", () => {
  it("rejects a single short anchor", () => {
    const r = canGenerate({
      subActive: true,
      quotaLeft: 1,
      anchors: [{ id: "1", text: "abc", confirmed: true }] as Anchor[],
    });
    expect(r.ok).toBe(false);
  });
});
