import { themes } from 'storybook/theming'
import { palette } from '../src/theme'

export const storybookTheme = {
  ...themes.dark,
  brandTitle: 'fantasy-web-ui components',
  colorPrimary: palette.accent,
  colorSecondary: palette.accent,
  appBg: palette.background,
  appContentBg: palette.background,
  appPreviewBg: palette.background,
  appBorderColor: palette.border,
  textColor: palette.text,
  textMutedColor: palette.secondary,
  textInverseColor: palette.onAccent,
  barBg: palette.surface,
  barTextColor: palette.secondary,
  barSelectedColor: palette.accent,
  barHoverColor: palette.text,
  inputBg: palette.raised,
  inputBorder: palette.border,
  inputTextColor: palette.text,
}
