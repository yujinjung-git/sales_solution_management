export const today = new Date("2026-05-28T00:00:00+09:00");

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function daysUntil(dateText: string) {
  const target = new Date(`${dateText}T00:00:00+09:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
