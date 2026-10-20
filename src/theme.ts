import type { ComboboxChevronProps, CSSVariablesResolver, InputProps, MantineColorsTuple, MantineThemeOverride } from '@mantine/core'

/** The single source of truth for product colors. See docs/design-system.md. */
export const palette = {
  background: '#17130f',
  surface: '#221c16',
  raised: '#2e261f',
  border: '#4d4237',
  text: '#f7f0e6',
  secondary: '#c7bba9',
  muted: '#9a8e80',
  accent: '#c47f56',
  accentInk: '#cd926f',
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
// Overlay text uses lighter clay ink; the primary fill stays the original clay.
const overlayStyles = {
  backgroundColor: palette.overlay,
  borderColor: palette.overlayBorder,
  color: palette.text,
  '--accent': palette.accentInk,
  '--mantine-color-anchor': palette.accentInk,
  '--mantine-color-clay-text': palette.accentInk,
  '--mantine-color-clay-outline': palette.accentInk,
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
    clay: shades(palette.accent),
    // Mantine uses this ramp for inputs, tables, menus and other neutral controls.
    dark: [
      palette.text, palette.secondary, palette.disabledText, palette.overlayBorder,
      palette.border, palette.disabled, palette.overlay, palette.raised,
      palette.surface, palette.background,
    ],
  },
  components: {
    Button: { defaultProps: { size: 'sm' } },
    Input: {
      vars: (_theme: unknown, { variant }: InputProps) => ({
        wrapper: variant === 'unstyled' ? {} : { '--input-bg': palette.surface },
      }),
    },
    ComboboxChevron: {
      vars: (_theme: unknown, { color, error }: ComboboxChevronProps) => ({
        chevron: color ? {} : { '--combobox-chevron-color': error ? palette.error : palette.muted },
      }),
    },
    ComboboxOption: {
      // Mantine uses its white token for keyboard-highlighted option text.
      // Scope the replacement to options so every Combobox consumer shares the ink.
      defaultProps: { styles: { option: { '--mantine-color-white': palette.onAccent } } },
    },
    Tooltip: {
      styles: {
        tooltip: { ...overlayStyles, border: `1px solid ${palette.overlayBorder}` },
      },
    },
    Popover: {
      styles: { dropdown: overlayStyles },
    },
    Combobox: { styles: { dropdown: overlayStyles } },
    Select: { styles: { dropdown: overlayStyles } },
    MultiSelect: { styles: { dropdown: overlayStyles } },
    Autocomplete: { styles: { dropdown: overlayStyles } },
    Menu: { styles: { dropdown: { ...overlayStyles, '--menu-item-hover': palette.raised } } },
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
    '--muted': palette.muted,
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
    '--mantine-color-placeholder': palette.muted,
    '--mantine-color-default': palette.surface,
    '--mantine-color-default-hover': palette.raised,
    '--mantine-color-default-color': palette.text,
    '--mantine-color-default-border': palette.border,
    '--mantine-color-disabled': palette.disabled,
    '--mantine-color-disabled-color': palette.disabledText,
    '--mantine-color-disabled-border': palette.border,
  },
})
