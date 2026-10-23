export function ScoreValue({
  value,
  projected = false,
  flagZero = false,
}: {
  value: number | null | undefined
  projected?: boolean
  /** With `projected`, marks a 0.0 projection in the error color (usually a player who is out). */
  flagZero?: boolean
}) {
  const zero = projected && flagZero && value === 0
  return (
    <span className={`${projected ? 'score-value projected' : 'score-value actual'}${zero ? ' zero' : ''}`}>
      <small>{projected ? 'Projected' : 'Actual'}</small>
      <strong>{value == null ? '—' : value.toFixed(1)}</strong>
    </span>
  )
}
