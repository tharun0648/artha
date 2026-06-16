// Indian rupee formatter — converts raw numbers to Cr/L/k short notation.
// Used everywhere money is displayed so the AI and UI stay consistent.
export function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}
