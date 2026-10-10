import { describe, it, expect } from "vitest";
import { formatPhone, formatRelative, telHref } from "@/lib/format";

describe("formatPhone", () => {
  it("formats US and Pakistani numbers, and leaves others untouched", () => {
    expect(formatPhone("+15551234567")).toBe("+1 (555) 123-4567");
    expect(formatPhone("+923001234567")).toBe("+92 300 1234567");
    expect(formatPhone("+447700900123")).toBe("+447700900123");
  });
});

describe("telHref", () => {
  it("strips everything except digits and the leading plus", () => {
    expect(telHref("+1 (555) 123-4567")).toBe("tel:+15551234567");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it("describes recent times in plain words", () => {
    expect(formatRelative(ago(10), now)).toBe("just now");
    expect(formatRelative(ago(5 * 60), now)).toBe("5 minutes ago");
    expect(formatRelative(ago(3 * 3600), now)).toBe("3 hours ago");
    expect(formatRelative(ago(26 * 3600), now)).toBe("yesterday");
  });
});
