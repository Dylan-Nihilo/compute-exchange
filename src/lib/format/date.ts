import {timestampSchema, type Timestamp} from "../domain/contracts.ts";
import {DEFAULT_LOCALE, DEFAULT_TIME_ZONE} from "./locale.ts";

export {DEFAULT_TIME_ZONE} from "./locale.ts";

export type DateInput = Date | number | Timestamp;

export function formatDate(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  return formatDateInput(
    input,
    options ?? {dateStyle: "medium"},
    locales,
  );
}

export function formatDateTime(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  return formatDateInput(
    input,
    options ?? {
      dateStyle: "medium",
      hourCycle: "h23",
      timeStyle: "short",
    },
    locales,
  );
}

export function toIsoTimestamp(input: DateInput = new Date()): string {
  return toDate(input).toISOString();
}

function toDate(input: DateInput): Date {
  if (typeof input === "string") {
    const timestamp = timestampSchema.safeParse(input);
    if (!timestamp.success) {
      throw new RangeError("Expected a valid ISO timestamp");
    }
    return new Date(timestamp.data);
  }

  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);

  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Expected a valid date");
  }

  return date;
}

function formatDateInput(
  input: DateInput,
  options: Intl.DateTimeFormatOptions,
  locales: Intl.LocalesArgument,
): string {
  return new Intl.DateTimeFormat(locales, {
    ...options,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  }).format(toDate(input));
}
