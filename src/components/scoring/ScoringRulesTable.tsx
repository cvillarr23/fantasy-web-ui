import { Fragment } from 'react'
import { Table } from '@mantine/core'
import type { ScoringRule } from '../../api/types'

/** Core can list one rule twice (two ESPN stat ids share a name), so identical rows collapse. */
function ruleKey(rule: ScoringRule): string {
  return [rule.stat_key, rule.position, rule.rule_label].join('|')
}

/** Rules grouped by category, keeping core's display order. */
function byCategory(rules: ScoringRule[]): [string, ScoringRule[]][] {
  const unique = new Map(rules.map((rule) => [ruleKey(rule), rule]))
  const groups = new Map<string, ScoringRule[]>()
  for (const rule of unique.values()) groups.set(rule.category, [...(groups.get(rule.category) ?? []), rule])
  return [...groups]
}

/** Names the position a rule is limited to, unless the category already says it. */
function statName(rule: ScoringRule): string {
  const obvious = rule.category === 'Defense' && rule.position === 'D/ST'
  return rule.position && !obvious ? `${rule.label} (${rule.position})` : rule.label
}

function RuleRow({ rule }: { rule: ScoringRule }) {
  return (
    <Table.Tr>
      <Table.Td>{statName(rule)}</Table.Td>
      <Table.Td>
        <span className={rule.points_per < 0 ? 'num scoring-rule-negative' : 'num'}>{rule.rule_label}</span>
      </Table.Td>
    </Table.Tr>
  )
}

export function ScoringRulesTable({ rules }: { rules: ScoringRule[] }) {
  return (
    <Table verticalSpacing={4} aria-label="Your league's scoring rules">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Stat</Table.Th><Table.Th>Points</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {byCategory(rules).map(([category, group]) => (
          <Fragment key={category}>
            <Table.Tr>
              <Table.Th colSpan={2} scope="colgroup" role="rowheader" className="scoring-rule-category">{category}</Table.Th>
            </Table.Tr>
            {group.map((rule) => <RuleRow key={ruleKey(rule)} rule={rule} />)}
          </Fragment>
        ))}
      </Table.Tbody>
    </Table>
  )
}
