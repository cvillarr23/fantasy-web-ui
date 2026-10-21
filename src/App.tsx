import { lazy, Suspense } from 'react'
const MoveOverviewPage = lazy(() =>
  import('./components/MoveOverviewPage').then((m) => ({ default: m.MoveOverviewPage })),
)
import { ActivityPage, ActionDetailPage, SessionDetailPage } from './components/ActivityPage'
import { RunDetailPage, TracePage } from './components/RunDetailPage'
const LeaguePage = lazy(() =>
  import('./components/LeaguePage').then((m) => ({ default: m.LeaguePage })),
)
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
const AnalyticsPage = lazy(() =>
  import('./components/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const ChatPage = lazy(() => import('./components/ChatPage').then((m) => ({ default: m.ChatPage })))
import { DraftConfigProvider } from './components/DraftConfigProvider'
const DraftDayPage = lazy(() =>
  import('./components/DraftDayPage').then((m) => ({ default: m.DraftDayPage })),
)
import { Layout } from './components/Layout'
import { PageSkeleton } from './components/skeletons'
import { LineupPage } from './components/LineupPage'
import { MatchupPage } from './components/MatchupPage'
const PracticeDraftScreen = lazy(() =>
  import('./components/PracticeDraftScreen').then((m) => ({ default: m.PracticeDraftScreen })),
)
import { SettingsPage } from './components/SettingsPage'
import { ScoreboardPage } from './components/ScoreboardPage'
const TradePage = lazy(() =>
  import('./components/TradePage').then((m) => ({ default: m.TradePage })),
)
const SentTradesPage = lazy(() => import('./components/sentTrades/SentTradesPage').then((m) => ({ default: m.SentTradesPage })))
import { WaiverPage } from './components/WaiverPage'
import './App.css'

const TradeInboxPage = lazy(() =>
  import('./components/inbox/TradeInboxPage').then((m) => ({ default: m.TradeInboxPage })),
)

function App() {
  return (
    <DraftConfigProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton label="Loading view" />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/lineup" replace />} />
              <Route path="draft" element={<DraftDayPage />} />
              <Route path="practice" element={<PracticeDraftScreen />} />
              <Route path="lineup" element={<LineupPage />} />
              <Route path="matchup" element={<MatchupPage />} />
              <Route path="scoreboard" element={<ScoreboardPage />} />
              <Route path="inbox" element={<TradeInboxPage />} />
              <Route path="trades" element={<TradePage />} />
              <Route path="trades/sent" element={<SentTradesPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="waivers" element={<WaiverPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="activity/actions/:id" element={<ActionDetailPage />} />
              <Route path="activity/sessions/:id" element={<SessionDetailPage />} />
              <Route path="activity/runs/:id" element={<RunDetailPage />} />
              <Route path="activity/trace/:type/:id" element={<TracePage />} />
              <Route path="moves/review" element={<MoveOverviewPage />} />
              <Route path="league" element={<LeaguePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DraftConfigProvider>
  )
}

export default App
