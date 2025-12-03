import { addDays, endOfDay, endOfMonth, format, parse, startOfDay, startOfMonth, subDays } from "date-fns";

export const DATE_FORMAT = "yyyy-MM-dd";
const MT5_FORMATS = [
  "yyyy.MM.dd HH:mm:ss",
  "yyyy.MM.dd HH:mm",
  "dd.MM.yyyy HH:mm:ss",
  "dd.MM.yyyy HH:mm",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy HH:mm",
];

export function formatISO(date: Date) {
  return format(date, DATE_FORMAT);
}

export function getMonthRange(year: number, month: number) {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export function getCalendarDays(year: number, month: number) {
  const { start, end } = getMonthRange(year, month);
  const leading = start.getDay();
  const trailing = 6 - end.getDay();
  const gridStart = subDays(start, leading);
  const gridEnd = addDays(end, trailing < 0 ? 6 : trailing);
  const days: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
    days.push(day);
  }
  return { days, monthStart: start, monthEnd: end };
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayBounds(date: Date) {
  return { start: startOfDay(date), end: endOfDay(date) };
}

export function parseMt5Date(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    // Excel serial number
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = value * 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\u00A0/g, " ").trim();
  for (const fmt of MT5_FORMATS) {
    try {
      const parsed = parse(normalized, fmt, new Date());
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  const fallback = new Date(normalized.replace(/\./g, "-"));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
