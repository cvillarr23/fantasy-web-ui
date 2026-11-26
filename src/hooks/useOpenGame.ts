import { useNavigate } from 'react-router-dom'
import { gamePath } from '../components/game/gameRoutes'

/** Opens an NFL game's details from a player's popover. The popover's game is the one being
 * polled now, so the link carries no week. */
export function useOpenGame(): (eventId: string) => void {
  const navigate = useNavigate()
  return (eventId) => navigate(gamePath(eventId))
}
