import {DEFAULT_LOCALE} from "./number.ts";

export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export type DateInput = Date | number | string;

export function formatDate(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locales, {
    timeZone: options?.timeZone ?? DEFAULT_TIME_ZONE,
    ...(options ?? {dateStyle: "medium"}),
  }).format(toDate(input));
}

export function formatDateTime(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locales, {
    timeZone: options?.timeZone ?? DEFAULT_TIME_ZONE,
    ...(options ?? {
      dateStyle: "medium",
      hourCycle: "h23",
      timeStyle: "short",
    }),
  }).format(toDate(input));
}

export function toIsoTimestamp(input: DateInput = new Date()): string {
  return toDate(input).toISOString();
}

function toDate(input: DateInput): Date {
  const date =
    input instanceof Date
      ? new Date(input.getTime())
      : typeof input === "number"
        ? new Date(input)
        : new Date(input);

  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Expected a valid date");
  }

  return date;
}
