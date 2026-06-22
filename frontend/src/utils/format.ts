export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatNumber(value: number, maximumFractionDigits = 6): string {
  return value.toLocaleString("en-US", { maximumFractionDigits });
}
