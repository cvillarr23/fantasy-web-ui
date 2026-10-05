import { useState } from 'react'
import { Alert, Button, Group, Skeleton, Stack, Text, Textarea } from '@mantine/core'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, isNoProviderError, queryChat } from '../api/client'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { WeekSelector } from './WeekSelector'
import type { ChatQueryResponse } from '../api/types'

export function ChatPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [params, setParams] = useSearchParams()
  const sessionId = params.get('session') ?? undefined
  const [week, setWeek] = useSelectedWeek()
  // Seed the field once the current week resolves, but only while it's still untouched -
  // never overwrite a week the user already picked.
  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  const [question, setQuestion] = useState('')
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null)
  const [response, setResponse] = useState<ChatQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noProvider, setNoProvider] = useState(false)

  if (!isConfigured) {
    if (configLoading) return null
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set your league and team in Settings first.
          </Text>
          <Button component={Link} to="/settings" variant="default">
            Go to Settings
          </Button>
        </Stack>
      </div>
    )
  }

  const canSubmit = question.trim().length > 0 && validWeek && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    const asked = question.trim()
    setLoading(true)
    setError(null)
    setNoProvider(false)
    setResponse(null)
    try {
      const result = await queryChat(asked, config.season, weekValue, config.team_id, sessionId)
      setResponse(result)
      if (result.session_id)
        setParams((p) => {
          const next = new URLSearchParams(p)
          next.set('session', result.session_id!)
          return next
        })
      setAskedQuestion(asked)
      setQuestion('')
    } catch (err) {
      if (isNoProviderError(err)) setNoProvider(true)
      else setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <Stack gap="md" maw={720}>
        <Group justify="space-between" align="center">
          <WeekSelector week={week} onChange={setWeek} />
        </Group>
        <Text size="sm" c="dimmed">
          Ask about your roster or matchup. Conversations are saved; follow-ups use refreshed league
          context.
        </Text>
        {sessionId && (
          <Button component={Link} to={`/activity/sessions/${sessionId}`} variant="subtle">
            View saved conversation
          </Button>
        )}
        <Textarea
          placeholder="e.g. Who are my weakest starters this week?"
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          minRows={3}
          disabled={loading}
        />
        <Group justify="flex-end">
          <Button onClick={handleSubmit} disabled={!canSubmit} loading={loading}>
            Ask
          </Button>
        </Group>

        {noProvider && (
          <Alert color="yellow" title="No AI provider available">
            No AI provider available right now — try again shortly.
            <Group mt="xs">
              <Button size="xs" variant="light" onClick={handleSubmit} disabled={loading}>
                Retry
              </Button>
            </Group>
          </Alert>
        )}
        {error && <Alert color="red">{error}</Alert>}

        {loading && (
          <Stack gap="xs">
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="75%" />
            <Skeleton height={14} width="60%" />
          </Stack>
        )}

        {!loading && response && (
          <Stack gap="xs">
            {askedQuestion && <Text fw={600}>{askedQuestion}</Text>}
            <Text style={{ whiteSpace: 'pre-wrap' }}>{response.answer}</Text>
            <Text size="xs" c="dimmed">
              {response.provider} / {response.model} · {response.latency_ms}ms
            </Text>
          </Stack>
        )}
      </Stack>
    </div>
  )
}
