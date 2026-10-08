import { request } from './client'
import { validApprover } from './tradeApproval'

/** The newest worker response row that blocks an incoming offer, as core lists it. */
export interface InboxResponse {
  id: number
  status: 'responding' | 'responded' | 'response_unknown' | 'rejected'
  action: string | null
  decision_key: string | null
}
export interface RetryReceipt {
  espn_transaction_id: string
  status: 'queued'
  kind: 'decision'
  tracking_id: string
  approved_by: string
  approved_at: string
  duplicate: boolean
  decision_key: string
  action: 'accept' | 'decline'
  retry_of: number
}
export type RetryableKind = 'rejected' | 'unknown'

/**
 * Whether a human may retry this response, and which kind of retry it is. A responding row may
 * still be in flight and a responded one is final, so neither is ever retryable.
 */
export function retryableResponse(response: InboxResponse | null | undefined): RetryableKind | null {
  if (!response || !Number.isInteger(response.id) || response.id < 1) return null
  if (response.action !== 'accept' && response.action !== 'decline') return null
  if (!/^[0-9a-f]{64}$/.test(response.decision_key ?? '')) return null
  if (response.status === 'rejected') return 'rejected'
  if (response.status === 'response_unknown') return 'unknown'
  return null
}

/**
 * Asks core to publish the same approved response again. An unknown outcome is only retried with
 * the human's confirmation that ESPN shows no answer; the worker also re-checks a fresh read.
 * A receipt that doesn't match exactly is treated as an unknown outcome, never as success.
 */
export async function retryIncomingDecision(
  transactionId: string,
  response: InboxResponse,
  approver: string,
  verifiedNotAnswered: boolean,
): Promise<RetryReceipt> {
  const kind = retryableResponse(response)
  if (!kind || !validApprover(approver)) throw new Error('This response cannot be retried.')
  if (kind === 'unknown' && !verifiedNotAnswered) {
    throw new Error("Retrying an unknown outcome needs confirmation that someone checked ESPN and it wasn't answered.")
  }
  const result = await request<RetryReceipt>(
    `/v1/trade/incoming/${encodeURIComponent(transactionId)}/decision/retry`,
    {
      method: 'POST',
      body: JSON.stringify({
        approved_by: approver.trim(),
        of_claim_id: response.id,
        verified_not_answered: kind === 'unknown' && verifiedNotAnswered,
      }),
    },
  )
  if (
    !result ||
    result.espn_transaction_id !== transactionId ||
    result.status !== 'queued' ||
    result.kind !== 'decision' ||
    result.retry_of !== response.id ||
    result.decision_key !== response.decision_key ||
    result.action !== response.action ||
    typeof result.tracking_id !== 'string' ||
    !result.tracking_id.trim() ||
    typeof result.approved_by !== 'string' ||
    !result.approved_by.trim() ||
    typeof result.approved_at !== 'string' ||
    !Number.isFinite(Date.parse(result.approved_at)) ||
    typeof result.duplicate !== 'boolean'
  ) {
    throw new Error('Retry receipt is unverified; outcome is unknown.')
  }
  return result
}
