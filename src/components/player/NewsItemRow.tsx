import { Anchor, Badge, Group, Text } from '@mantine/core'
import type { NewsItem } from '../../api/types'
import { NEWS_SOURCES, relativeTime } from './popoverFormat'

export function NewsItemRow({ item }: { item: NewsItem }) {
  const source = NEWS_SOURCES[item.source]
  return (
    <li className="popover-news-item">
      <Group gap={6} wrap="nowrap">
        <Badge size="xs" radius="sm" color={source.color} aria-hidden>{source.chip}</Badge>
        <Text size="xs" fw={600}>{item.author ?? source.label}</Text>
        <Text size="xs" c="dimmed">· {relativeTime(item.published_at)}</Text>
      </Group>
      <Text size="sm">{item.headline}</Text>
      {item.also_reported_by.length > 0 && (
        <Text size="xs" c="dimmed">
          Also reported by {item.also_reported_by.map((s) => NEWS_SOURCES[s].label).join(', ')}
        </Text>
      )}
      {item.url && (
        <Anchor href={item.url} target="_blank" rel="noopener" size="xs">
          Read on {source.label} ↗
        </Anchor>
      )}
    </li>
  )
}
