import { addons } from 'storybook/manager-api'
import { themes } from 'storybook/theming'

// The app only ships a dark theme, so the library chrome matches it.
addons.setConfig({ theme: { ...themes.dark, brandTitle: 'fantasy-web-ui components' } })
