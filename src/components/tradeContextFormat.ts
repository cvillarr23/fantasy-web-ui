export function contextNumber(value: number | null | undefined, digits = 1): string {
  return value == null ? 'Unknown' : value.toFixed(digits)
}

