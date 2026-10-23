/** 149900 → "R$ 1.499,00" */
export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "1.499,00", "1499,9", "1499.90", "R$ 1.499" → cents; null when it isn't a valid amount. */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$|\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}
