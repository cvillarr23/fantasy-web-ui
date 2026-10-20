import type { CSSVariablesResolver, MantineColorsTuple, MantineThemeOverride } from '@mantine/core'

/** The single source of truth for product colors. See docs/design-system.md. */
export const palette = {
  background: '#17130f',
  surface: '#221c16',
  raised: '#2e261f',
  border: '#4d4237',
  text: '#f7f0e6',
  secondary: '#c7bba9',
  accent: '#c47f56',
  overlay: '#382f26',
  overlayBorder: '#6b5c4c',
  disabled: '#3d342b',
  disabledText: '#9a8e80',
  onAccent: '#14151c',
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
// Keep this module free of runtime framework imports so Storybook can share the palette.
export const theme = {
  primaryColor: 'clay',
  primaryShade: 5,
  autoContrast: true,
  // Clay and its hover shade need dark text to meet normal-text contrast.
  luminanceThreshold: 0.179,
  black: palette.onAccent,
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  colors: {
    gray: shades(palette.secondary),
    blue: shades(palette.projected),
    teal: shades(palette.incoming),
    green: shades(palette.incoming),
    red: shades(palette.error),
    yellow: shades(palette.warning),
    orange: shades(palette.outgoing),
    grape: shades(palette.accent),
    clay: shades(palette.accent),
    // Mantine uses this ramp for inputs, tables, menus and other neutral controls.
    dark: [
      palette.text, palette.secondary, palette.secondary, palette.disabledText,
      palette.border, palette.raised, palette.surface, palette.background,
      palette.background, palette.background,
    ],
  },
  components: {
    Button: { defaultProps: { size: 'sm' } },
    Tooltip: {
      styles: {
        tooltip: { backgroundColor: palette.overlay, color: palette.text, border: `1px solid ${palette.overlayBorder}` },
        arrow: { borderColor: palette.overlayBorder },
      },
    },
    Popover: {
      styles: { dropdown: { backgroundColor: palette.overlay, borderColor: palette.overlayBorder, color: palette.text } },
    },
    Table: { defaultProps: { striped: true, highlightOnHover: true, verticalSpacing: 'sm' } },
  },
} satisfies MantineThemeOverride
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
    '--on-accent': palette.onAccent,
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
    '--mantine-color-anchor': palette.accent,
    '--mantine-color-placeholder': palette.disabledText,
    '--mantine-color-default': palette.surface,
    '--mantine-color-default-hover': palette.raised,
    '--mantine-color-default-color': palette.text,
    '--mantine-color-default-border': palette.border,
    '--mantine-color-disabled': palette.disabled,
    '--mantine-color-disabled-color': palette.disabledText,
    '--mantine-color-disabled-border': palette.border,
  },
})
