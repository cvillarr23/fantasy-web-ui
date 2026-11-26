import { useNavigate, useSearchParams } from 'react-router-dom'
import { weekSearch } from './useSelectedWeek'

/** Opens the Scoring guide, keeping an explicitly chosen week so the worked example matches
 * the page it was opened from. */
export function useOpenScoringGuide(): () => void {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  return () => navigate({ pathname: '/scoring', search: weekSearch(params) })
}
