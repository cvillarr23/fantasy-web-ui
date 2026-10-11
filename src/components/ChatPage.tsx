import { startTransition, useRef, useState } from 'react'
import { Alert, Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { PageSkeleton, SkeletonRegion, TextSkeleton } from './skeletons'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, isNoProviderError, queryChat } from '../api/client'
import { getSession } from '../api/dashboard'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { WeekSelector } from './WeekSelector'
import { ChatMarkdown } from './chat/ChatMarkdown'
import { threadFromSession, type ChatTurn } from './chat/chatThread'

export function ChatPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [params, setParams] = useSearchParams()
  const sessionId = params.get('session') ?? undefined
  const [week, setWeek] = useSelectedWeek()
  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  // The session the on-screen turns belong to. Saved history is loaded only when the URL names a
  // different session, so a session this page just started isn't overwritten by its own fetch.
  const [seededFor, setSeededFor] = useState<string | undefined>(undefined)
  const nextKey = useRef(0)

  const history = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: isConfigured && Boolean(sessionId) && seededFor !== sessionId,
  })
  if (sessionId && seededFor !== sessionId && history.data?.id === sessionId) {
    setSeededFor(sessionId)
    setTurns(threadFromSession(history.data.content ?? []))
  }

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set your league and team in Settings first.
          </Text>
          <Button component={Link} to="/settings" variant="default">Go to Settings</Button>
        </Stack>
      </div>
    )
  }

  const loadingHistory = Boolean(sessionId) && seededFor !== sessionId && !history.error
  const pending = turns.some((turn) => turn.status === 'pending')
  const canAsk = validWeek && !pending && !loadingHistory && !history.error
  const canSubmit = question.trim().length > 0 && canAsk

  function updateTurn(key: string, patch: Partial<ChatTurn>) {
    setTurns((current) => current.map((turn) => (turn.key === key ? { ...turn, ...patch } : turn)))
  }

  async function ask(key: string, asked: string) {
    try {
      const result = await queryChat(asked, config.season, weekValue, config.team_id, sessionId)
      updateTurn(key, {
        status: 'answered',
        answer: result.answer,
        meta: { provider: result.provider, model: result.model, latency_ms: result.latency_ms },
        error: undefined,
      })
      if (result.session_id && result.session_id !== sessionId) {
        const started = result.session_id
        // React Router applies URL changes in a transition; updating seededFor in the same one
        // keeps the two in step, so no render sees the new session as unseeded and refetches it.
        startTransition(() => {
          setSeededFor(started)
          setParams((p) => {
            const next = new URLSearchParams(p)
            next.set('session', started)
            return next
          })
        })
      }
    } catch (err) {
      if (isNoProviderError(err)) updateTurn(key, { status: 'no-provider', error: undefined })
      else
        updateTurn(key, {
          status: 'failed',
          error: err instanceof ApiError ? err.message : String(err),
        })
    }
  }

  function handleSubmit() {
    if (!canSubmit) return
    const asked = question.trim()
    const key = `local-${nextKey.current++}`
    setTurns((current) => [...current, { key, question: asked, status: 'pending' }])
    setQuestion('')
    void ask(key, asked)
  }

  function retry(turn: ChatTurn) {
    if (!canAsk) return
    updateTurn(turn.key, { status: 'pending', error: undefined })
    void ask(turn.key, turn.question)
  }

  function newConversation() {
    setQuestion('')
    // Same transition as the URL change - otherwise a render with the old ?session= but no
    // seededFor would reload the old thread from the query cache.
    startTransition(() => {
      setSeededFor(undefined)
      setTurns([])
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.delete('session')
        return next
      })
    })
  }

  return (
    <div className="dashboard">
      <Stack gap="md" maw={720}>
        <Group justify="space-between" align="center">
          <WeekSelector week={week} onChange={setWeek} />
          {(sessionId || turns.length > 0) && (
            <Group gap="xs">
              {sessionId && (
                <Button component={Link} to={`/activity/sessions/${sessionId}`} variant="subtle">
                  View saved conversation
                </Button>
              )}
              <Button variant="default" onClick={newConversation} disabled={pending}>
                New conversation
              </Button>
            </Group>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          Ask about your roster or matchup. Conversations are saved; follow-ups use refreshed league
          context.
        </Text>

        {history.error && (
          <Alert color="red" title="Couldn't load this conversation">
            {history.error.message}
          </Alert>
        )}
        {loadingHistory && (
          <SkeletonRegion label="Loading conversation">
            <TextSkeleton lines={4} />
          </SkeletonRegion>
        )}

        {turns.map((turn) => (
          <Stack key={turn.key} gap="xs" className="chat-turn">
            <Paper withBorder p="sm" bg="var(--raised)">
              <Text size="xs" c="dimmed" fw={600}>
                You
              </Text>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{turn.question}</Text>
            </Paper>
            <ChatTurnAnswer turn={turn} canRetry={canAsk} onRetry={() => retry(turn)} />
          </Stack>
        ))}

        {!loadingHistory && !history.error && (
          <>
            <Textarea
              aria-label={turns.length ? 'Follow-up question' : 'Question'}
              placeholder={
                turns.length ? 'Ask a follow-up…' : 'e.g. Who are my weakest starters this week?'
              }
              value={question}
              onChange={(e) => setQuestion(e.currentTarget.value)}
              minRows={3}
              disabled={pending}
            />
            <Group justify="flex-end">
              <Button onClick={handleSubmit} disabled={!canSubmit} loading={pending}>
                Ask
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </div>
  )
}

function ChatTurnAnswer({
  turn,
  canRetry,
  onRetry,
}: {
  turn: ChatTurn
  canRetry: boolean
  onRetry: () => void
}) {
  switch (turn.status) {
    case 'pending':
      return (
        <SkeletonRegion label="Waiting for an answer">
          <TextSkeleton lines={3} />
        </SkeletonRegion>
      )
    case 'answered':
      return (
        <Stack gap={4}>
          <ChatMarkdown>{turn.answer ?? ''}</ChatMarkdown>
          {turn.meta && (
            <Text size="xs" c="dimmed">
              {turn.meta.provider} / {turn.meta.model} · {turn.meta.latency_ms}ms
            </Text>
          )}
        </Stack>
      )
    case 'no-provider':
      return (
        <Alert color="yellow" title="No AI provider available">
          No AI provider available right now — try again shortly.
          <Group mt="xs">
            <Button size="xs" variant="light" onClick={onRetry} disabled={!canRetry}>
              Retry
            </Button>
          </Group>
        </Alert>
      )
    case 'failed':
      return (
        <Alert color="red">
          {turn.error}
          <Group mt="xs">
            <Button size="xs" variant="light" onClick={onRetry} disabled={!canRetry}>
              Retry
            </Button>
          </Group>
        </Alert>
      )
    case 'unanswered':
      return (
        <Text size="sm" c="dimmed">
          No answer was recorded for this question{turn.error ? `: ${turn.error}` : '.'}
        </Text>
      )
  }
}
