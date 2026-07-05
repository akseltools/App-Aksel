/**
 * lib/utils/formatCurrency.ts
 * Formats a number as Brazilian Reais (BRL).
 *
 * @example
 * formatCurrency(1299.9)  → "R$ 1.299,90"
 * formatCurrency(0)       → "R$ 0,00"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}
