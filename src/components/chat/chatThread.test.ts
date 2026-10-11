import { expect, it } from 'vitest'
import { threadFromSession } from './chatThread'

const meta = { provider: 'groq', model: 'gpt-oss', latency_ms: 812 }

it('pairs each answer with its question and the successful response metadata', () => {
  const turns = threadFromSession([
    { role: 'user', content: 'Who should I start?' },
    { role: 'stage', content: 'Fetching current roster context' },
    { role: 'tool_result', content: { team_roster: [] } },
    { role: 'prompt', content: { system: 's', user: 'u' } },
    { role: 'error', content: 'provider a timed out' },
    { role: 'response', content: { text: 'Start **A**', ...meta } },
    { role: 'answer', content: 'Start **A**' },
    { role: 'user', content: 'And at flex?' },
    { role: 'response', content: { text: 'B', provider: 'ollama', model: 'm', latency_ms: 5 } },
    { role: 'answer', content: 'B' },
  ])
  expect(turns).toEqual([
    { key: 'saved-0', question: 'Who should I start?', status: 'answered', answer: 'Start **A**', meta },
    {
      key: 'saved-1',
      question: 'And at flex?',
      status: 'answered',
      answer: 'B',
      meta: { provider: 'ollama', model: 'm', latency_ms: 5 },
    },
  ])
})

it('marks a turn without an answer as unanswered, with the last error', () => {
  const turns = threadFromSession([
    { role: 'user', content: 'First?' },
    { role: 'error', content: 'all providers failed' },
    { role: 'user', content: 'Second?' },
  ])
  expect(turns.map((t) => [t.status, t.error])).toEqual([
    ['unanswered', 'all providers failed'],
    ['unanswered', undefined],
  ])
})

it('omits metadata it cannot read and ignores malformed messages', () => {
  const turns = threadFromSession([
    { role: 'answer', content: 'orphan answer' },
    { role: 'user', content: { not: 'a string' } },
    { role: 'user', content: 'Q' },
    { role: 'response', content: { capture: 'metadata only', characters: 10 } },
    { role: 'answer', content: 'A' },
  ])
  expect(turns).toEqual([{ key: 'saved-0', question: 'Q', status: 'answered', answer: 'A', meta: undefined }])
})
