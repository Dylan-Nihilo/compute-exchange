import type {Money} from "../domain/contracts";

export const DEFAULT_LOCALE = "zh-CN";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  assertFiniteNumber(value);
  return new Intl.NumberFormat(locales, options).format(value);
}

export function formatPercentage(
  ratio: number,
  options?: Omit<Intl.NumberFormatOptions, "style">,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  return formatNumber(ratio, {...options, style: "percent"}, locales);
}

export function moneyToMajorUnits({amountMinor}: Money): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError("Money amount must be a safe integer in minor units");
  }

  return amountMinor / 100;
}

export function formatMoney(
  money: Money,
  options?: Omit<Intl.NumberFormatOptions, "currency" | "style">,
  locales: Intl.LocalesArgument = DEFAULT_LOCALE,
): string {
  return formatNumber(
    moneyToMajorUnits(money),
    {...options, currency: money.currency, style: "currency"},
    locales,
  );
}

function assertFiniteNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError("Expected a finite number");
  }
}
