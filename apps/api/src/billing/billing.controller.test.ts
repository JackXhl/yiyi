import { describe, expect, it } from "vitest";
import { canConfirmMockPay } from "./billing.controller";

describe("canConfirmMockPay", () => {
  it("allows only mock orders while demo pay is on", () => {
    expect(canConfirmMockPay({ mock: true }, "true")).toBe(true);
    expect(canConfirmMockPay({ mock: true }, undefined)).toBe(true);
  });

  it("blocks self-confirm when mock is off or the order is live", () => {
    expect(canConfirmMockPay({ mock: true }, "false")).toBe(false);
    expect(canConfirmMockPay({ mock: false }, "true")).toBe(false);
  });
});
