import { addons } from 'storybook/manager-api'
import { storybookTheme } from './theme'

// The app only ships a dark theme, so the library chrome matches it.
addons.setConfig({ theme: storybookTheme })
