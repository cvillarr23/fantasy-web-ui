import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

/** The single source of truth for product colors. See docs/design-system.md. */
export const palette = {
  background: '#14151c',
  surface: '#1e202b',
  raised: '#272a38',
  border: '#424657',
  text: '#f3f4f8',
  secondary: '#b2b8cb',
  accent: '#c4a1ff',
  projected: '#8cc8ff',
  incoming: '#6ee7c0',
  outgoing: '#ffbb82',
  warning: '#fcd479',
  error: '#ff9aa9',
}
function shades(hex: string): MantineColorsTuple {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return [0.7, 0.6, 0.45, 0.3, 0.15, 0, -0.1, -0.2, -0.3, -0.4].map(
    (amount) =>
      '#' +
      rgb
        .map((v) =>
          Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))
            .toString(16)
            .padStart(2, '0'),
        )
        .join(''),
  ) as unknown as MantineColorsTuple
}
export const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  colors: {
    blue: shades(palette.projected),
    teal: shades(palette.incoming),
    green: shades(palette.incoming),
    red: shades(palette.error),
    yellow: shades(palette.warning),
    orange: shades(palette.outgoing),
    grape: shades(palette.accent),
    violet: [
      '#f5efff',
      '#eaddff',
      '#ddc7ff',
      '#cfafff',
      '#c4a1ff',
      '#b88cff',
      '#ae7aff',
      '#9760eb',
      '#804acb',
      '#6837aa',
    ],
  },
  components: {
    Button: { defaultProps: { size: 'sm' } },
    Table: { defaultProps: { striped: true, highlightOnHover: true, verticalSpacing: 'sm' } },
  },
})
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--bg': palette.background,
    '--code-bg': palette.surface,
    '--surface': palette.surface,
    '--raised': palette.raised,
    '--border': palette.border,
    '--text': palette.secondary,
    '--text-h': palette.text,
    '--accent': palette.accent,
    '--projected': palette.projected,
    '--incoming': palette.incoming,
    '--outgoing': palette.outgoing,
    '--warn': palette.warning,
    '--error': palette.error,
    '--accent-bg': `${palette.accent}18`,
    '--accent-border': `${palette.accent}80`,
  },
  light: {},
  dark: {
    '--mantine-color-body': palette.background,
    '--mantine-color-text': palette.text,
    '--mantine-color-dimmed': palette.secondary,
  },
})
