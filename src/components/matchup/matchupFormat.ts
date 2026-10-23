/** Standard deviation, in fantasy points, of a head-to-head weekly margin. The win chance
 * estimate treats the projected margin as the mean of a normal distribution with this spread. */
export const MARGIN_SPREAD = 25

/** ESPN sends no game status, so a 0.0 actual cannot be told apart from a game that has not
 * been played. Both read as unknown, which the UI shows as a dash. */
export function knownScore(value: number | null | undefined): number | null {
  return value == null || !Number.isFinite(value) || value === 0 ? null : value
}

export function projectedMargin(ours: number | null | undefined, theirs: number | null | undefined): number | null {
  if (ours == null || theirs == null || !Number.isFinite(ours) || !Number.isFinite(theirs)) return null
  return ours - theirs
}

// Abramowitz and Stegun 7.1.26; absolute error below 1.5e-7.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  return Math.sign(x) * (1 - poly * Math.exp(-x * x))
}

/** Estimated chance, as a whole percent, that we win. Clamped to 1-99 because the margin is
 * only a projection and the estimate is never certain. */
export function winChance(margin: number | null): number | null {
  if (margin == null || !Number.isFinite(margin)) return null
  const probability = 0.5 * (1 + erf(margin / (MARGIN_SPREAD * Math.SQRT2)))
  return Math.min(99, Math.max(1, Math.round(probability * 100)))
}

/** Slot and position once when they match ("RB"), both when they differ ("FLEX · WR"). */
export function slotLabel(slot: string, position: string): string {
  return slot === position ? slot : `${slot} · ${position}`
}

/** A projection of exactly 0.0 usually means the player is out, inactive or on a bye. */
export function isZeroProjection(projected: number | null | undefined): boolean {
  return projected === 0
}
