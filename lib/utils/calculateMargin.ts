/**
 * lib/utils/calculateMargin.ts
 * Calculates the consumer price from cost price (cost + 30% margin).
 * Mirrors the DB computed column: cost_price * 1.30
 *
 * @example
 * calculateConsumerPrice(100)  → 130.00
 * calculateConsumerPrice(189.90) → 246.87
 */

/**
 * Calculates the consumer (end-customer) price: cost + 30% margin.
 * @param costPrice - The tool's purchase cost
 * @returns The price to charge the end consumer
 */
export function calculateConsumerPrice(costPrice: number): number {
  return Math.round(costPrice * 1.3 * 100) / 100;
}

/**
 * Calculates the gross margin percentage between cost and selling price.
 * @param costPrice   - The tool's purchase cost
 * @param sellingPrice - The actual selling price
 * @returns Margin percentage (e.g., 30 for 30%)
 */
export function calculateMarginPercent(
  costPrice: number,
  sellingPrice: number
): number {
  if (costPrice === 0) return 0;
  return Math.round(((sellingPrice - costPrice) / costPrice) * 100 * 10) / 10;
}
