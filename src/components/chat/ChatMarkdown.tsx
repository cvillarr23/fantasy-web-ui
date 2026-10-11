import { Anchor, Code, Table } from '@mantine/core'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Without rehype-raw, react-markdown never turns HTML in the answer into elements - it is shown
// as text - so model output can't inject markup into the page.
const components: Components = {
  table: ({ children }) => (
    <Table.ScrollContainer minWidth={0} type="native">
      <Table striped withTableBorder withColumnBorders>
        {children}
      </Table>
    </Table.ScrollContainer>
  ),
  thead: ({ children }) => <Table.Thead>{children}</Table.Thead>,
  tbody: ({ children }) => <Table.Tbody>{children}</Table.Tbody>,
  tr: ({ children }) => <Table.Tr>{children}</Table.Tr>,
  th: ({ children, style }) => <Table.Th style={style}>{children}</Table.Th>,
  td: ({ children, style }) => <Table.Td style={style}>{children}</Table.Td>,
  a: ({ children, href }) => (
    <Anchor href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </Anchor>
  ),
  // Fenced blocks arrive as <pre><code>; CSS lets the inner Code fill the block.
  code: ({ children }) => <Code>{children}</Code>,
}

export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
