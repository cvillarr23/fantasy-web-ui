import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ChatMarkdown } from './ChatMarkdown'

const meta = {
  title: 'Chat/ChatMarkdown',
  component: ChatMarkdown,
  args: {
    children: [
      'Start **Sample Runner** over Sample Receiver this week.',
      '',
      '| Player | Proj |',
      '|---|--:|',
      '| Sample Runner | 14.9 |',
      '| Sample Receiver | 11.2 |',
      '',
      '- Matchup favors the run game',
      '- See [the lineup page](https://example.com/lineup)',
      '',
      '```',
      'proj_delta = 3.7',
      '```',
    ].join('\n'),
  },
} satisfies Meta<typeof ChatMarkdown>

export default meta
type Story = StoryObj<typeof meta>

export const Answer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table')).toBeVisible()
  },
}

/** Raw HTML in an answer is shown as text, never rendered as markup. */
export const HtmlIsText: Story = {
  args: { children: 'Before <img src=x onerror="alert(1)"> after' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('img')).toBeNull()
  },
}
