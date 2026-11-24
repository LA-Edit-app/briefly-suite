import { describe, expect, it } from "vitest";
import { formatMoney } from "./currency";

describe("formatMoney", () => {
  it("uses the campaign's currency symbol", () => {
    expect(formatMoney(1500, "GBP")).toBe("£1,500");
    expect(formatMoney(1500, "EUR")).toBe("€1,500");
    expect(formatMoney(1500, "USD")).toBe("US$1,500");
  });

  it("defaults to GBP when no currency is set", () => {
    expect(formatMoney(20, null)).toBe("£20");
    expect(formatMoney(20, "")).toBe("£20");
  });

  it("accepts lower-case codes", () => {
    expect(formatMoney(20, "eur")).toBe("€20");
  });

  it("keeps up to two decimals, or a fixed two when asked", () => {
    expect(formatMoney(1234.5, "EUR")).toBe("€1,234.5");
    expect(formatMoney(1200, "EUR", { minimumFractionDigits: 2 })).toBe("€1,200.00");
  });

  it("falls back to the code for a value that isn't a currency", () => {
    expect(formatMoney(1500, "Euro")).toBe("EURO 1,500");
  });
});
