import { describe, expect, it } from "vitest";
import { canCopy, canGenerate } from "./index";

describe("canGenerate", () => {
  it("blocks fewer than 2 confirmed anchors", () => {
    const r = canGenerate({
      subActive: true,
      quotaLeft: 3,
      anchors: [
        { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
        { id: "2", text: "太短", confirmed: true },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("还差一条");
  });

  it("allows two real confirmed anchors", () => {
    const r = canGenerate({
      subActive: true,
      quotaLeft: 1,
      anchors: [
        { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
        { id: "2", text: "换完后前台不再闪，客人说亮多了", confirmed: true },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("stops generate when subscription expired", () => {
    const r = canGenerate({
      subActive: false,
      quotaLeft: 99,
      anchors: [
        { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
        { id: "2", text: "换完后前台不再闪，客人说亮多了", confirmed: true },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("到期");
  });
});

describe("canCopy", () => {
  it("requires disclosure ack", () => {
    expect(canCopy({ disclosureAck: false, highRisk: false, highRiskAck: false }).ok).toBe(false);
  });

  it("requires extra ack when high risk", () => {
    expect(canCopy({ disclosureAck: true, highRisk: true, highRiskAck: false }).ok).toBe(false);
    expect(canCopy({ disclosureAck: true, highRisk: true, highRiskAck: true }).ok).toBe(true);
  });
});
