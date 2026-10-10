import { describe, it, expect } from "vitest";
import type { BusinessHour } from "@prisma/client";
import { isOpen } from "@/lib/business-hours/isOpen";

const FRIDAY_10AM_NEW_YORK = new Date("2026-10-09T14:00:00Z");
const FRIDAY_6PM_NEW_YORK = new Date("2026-10-09T22:00:00Z");

function hours(dayOfWeek: number, openTime: string | null, closeTime: string | null, isClosed = false): BusinessHour {
  return { id: `h${dayOfWeek}`, tenantId: "t1", dayOfWeek, openTime, closeTime, isClosed };
}

describe("isOpen", () => {
  it("treats a business with no saved hours as always open", () => {
    expect(isOpen([], "America/New_York", FRIDAY_6PM_NEW_YORK)).toBe(true);
  });

  it("checks the time in the business's own timezone", () => {
    const friday = [hours(5, "09:00", "17:00")];
    expect(isOpen(friday, "America/New_York", FRIDAY_10AM_NEW_YORK)).toBe(true);
    expect(isOpen(friday, "America/New_York", FRIDAY_6PM_NEW_YORK)).toBe(false);
  });

  it("is closed on days marked closed or with no hours row", () => {
    expect(isOpen([hours(5, "09:00", "17:00", true)], "America/New_York", FRIDAY_10AM_NEW_YORK)).toBe(false);
    expect(isOpen([hours(1, "09:00", "17:00")], "America/New_York", FRIDAY_10AM_NEW_YORK)).toBe(false);
  });

  it("treats a midnight closing time as open until the end of the day", () => {
    expect(isOpen([hours(5, "12:00", "00:00")], "America/New_York", FRIDAY_6PM_NEW_YORK)).toBe(true);
  });

  it("falls back to UTC instead of crashing on an invalid timezone", () => {
    expect(isOpen([hours(5, "09:00", "17:00")], "Not/AZone", FRIDAY_10AM_NEW_YORK)).toBe(true);
  });
});
