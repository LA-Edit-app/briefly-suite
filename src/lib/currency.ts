export const DEFAULT_CURRENCY = "GBP";

/**
 * Formats an amount in the campaign's currency, e.g. £1,500, €1,500.50, US$200.
 * Agencies edit their own currency list, so an unknown code falls back to
 * "CODE 1,500" instead of failing.
 */
export function formatMoney(
  amount: number,
  currency: string | null | undefined,
  { minimumFractionDigits = 0, maximumFractionDigits = 2 } = {},
): string {
  const code = (currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const digits = { minimumFractionDigits, maximumFractionDigits };
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: code, ...digits }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("en-GB", digits)}`;
  }
}
