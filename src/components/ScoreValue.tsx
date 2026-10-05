export function ScoreValue({
  value,
  projected = false,
}: {
  value: number | null | undefined
  projected?: boolean
}) {
  return (
    <span className={projected ? 'score-value projected' : 'score-value actual'}>
      <small>{projected ? 'Projected' : 'Actual'}</small>
      <strong>{value == null ? '—' : value.toFixed(1)}</strong>
    </span>
  )
}
