import { Badge, Skeleton, Stack, Table, Text, Title } from '@mantine/core'

interface Props {
  title: string
}

export function ComingSoonPage({ title }: Props) {
  return (
    <div className="dashboard">
      <Stack gap="md" mt="xl" align="center">
        <Badge variant="light" color="grape" size="lg">Coming soon</Badge>
        <Title order={1}>{title}</Title>
        <Text c="dimmed" ta="center" maw={480}>
          This view isn't built yet — it's registered in the nav shell now so it's ready to
          host the real thing.
        </Text>
      </Stack>
      <Table mt="xl" verticalSpacing="sm" highlightOnHover={false}>
        <Table.Thead>
          <Table.Tr>
            {['Player', 'Position', 'Status', 'Action'].map((label) => (
              <Table.Th key={label}>{label}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 4 }).map((_, i) => (
            <Table.Tr key={i}>
              <Table.Td><Skeleton height={14} width="70%" /></Table.Td>
              <Table.Td><Skeleton height={14} width="40%" /></Table.Td>
              <Table.Td><Skeleton height={14} width="50%" /></Table.Td>
              <Table.Td><Skeleton height={28} width={80} radius="sm" /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}
