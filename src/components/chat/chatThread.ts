export interface ChatAnswerMeta {
  provider: string
  model: string
  latency_ms: number
}

export interface ChatTurn {
  key: string
  question: string
  /** `unanswered` is a saved turn with no recorded answer - the request failed or was abandoned. */
  status: 'pending' | 'answered' | 'failed' | 'no-provider' | 'unanswered'
  answer?: string
  meta?: ChatAnswerMeta
  error?: string
}

function answerMeta(value: unknown): ChatAnswerMeta | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { provider, model, latency_ms } = value as Record<string, unknown>
  if (typeof provider !== 'string' || typeof model !== 'string' || typeof latency_ms !== 'number')
    return undefined
  return { provider, model, latency_ms }
}

/** Rebuilds the question/answer thread from a saved session's message log. Each chat turn is
 * logged as `user`, then working events (stages, tool results, prompts, one `error` per failed
 * provider attempt), a `response` carrying the provider/model/latency of the successful call,
 * and finally the `answer` text. Only `user` and `answer` are shown; `response` supplies the
 * answer's footer and `error` explains a turn that never got an answer. */
export function threadFromSession(content: { role: string; content: unknown }[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  let meta: ChatAnswerMeta | undefined
  let error: string | undefined
  const finish = () => {
    const last = turns.at(-1)
    if (last && last.status === 'pending') {
      last.status = 'unanswered'
      last.error = error
    }
  }
  for (const message of content) {
    if (message.role === 'user' && typeof message.content === 'string') {
      finish()
      turns.push({ key: `saved-${turns.length}`, question: message.content, status: 'pending' })
      meta = undefined
      error = undefined
    } else if (message.role === 'response') {
      meta = answerMeta(message.content) ?? meta
    } else if (message.role === 'error' && typeof message.content === 'string') {
      error = message.content
    } else if (message.role === 'answer' && typeof message.content === 'string') {
      const last = turns.at(-1)
      if (last?.status === 'pending') Object.assign(last, { status: 'answered', answer: message.content, meta })
    }
  }
  finish()
  return turns
}
