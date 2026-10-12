export interface FormatNumberOptions {
  /** Decimal places. Defaults to 1. */
  digits?: number
  /** Prefix positive values with "+". */
  signed?: boolean
  /** With `signed`, also prefix zero with "+". Some screens show "+0.0", others "0.0". */
  signZero?: boolean
  /** Text for a missing or non-finite value. Defaults to "—"; unknown data never shows as zero. */
  unknown?: string
}

/** Formats a stat for display. */
export function formatNumber(value: number | null | undefined, options: FormatNumberOptions = {}): string {
  const { digits = 1, signed = false, signZero = false, unknown = '—' } = options
  if (value == null || !Number.isFinite(value)) return unknown
  const text = value.toFixed(digits)
  return signed && (value > 0 || (signZero && value === 0)) ? `+${text}` : text
}
