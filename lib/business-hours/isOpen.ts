import type { BusinessHour } from "@prisma/client";
import { isValidTimeZone } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// With no hours saved, a business counts as always open — better to over-notify than miss a lead.
export function isOpen(businessHours: BusinessHour[], timeZone: string, now: Date = new Date()): boolean {
  if (businessHours.length === 0) {
    return true;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const today = businessHours.find((h) => h.dayOfWeek === WEEKDAYS.indexOf(part("weekday")));
  if (!today || today.isClosed || !today.openTime || !today.closeTime) {
    return false;
  }

  const current = Number(part("hour")) * 60 + Number(part("minute"));
  const open = toMinutes(today.openTime);
  const close = toMinutes(today.closeTime);

  // A close time at or before the open time (e.g. 18:00–00:00) means "open until midnight".
  return close > open ? current >= open && current < close : current >= open;
}
