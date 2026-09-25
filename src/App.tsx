import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AnalyticsPage } from './components/AnalyticsPage'
import { ChatPage } from './components/ChatPage'
import { DraftDayPage } from './components/DraftDayPage'
import { Layout } from './components/Layout'
import { LineupPage } from './components/LineupPage'
import { MatchupPage } from './components/MatchupPage'
import { PracticeDraftScreen } from './components/PracticeDraftScreen'
import { ScoreboardPage } from './components/ScoreboardPage'
import { TradePage } from './components/TradePage'
import { WaiverPage } from './components/WaiverPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/draft" replace />} />
          <Route path="draft" element={<DraftDayPage />} />
          <Route path="practice" element={<PracticeDraftScreen />} />
          <Route path="lineup" element={<LineupPage />} />
          <Route path="matchup" element={<MatchupPage />} />
          <Route path="scoreboard" element={<ScoreboardPage />} />
          <Route path="trades" element={<TradePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="waivers" element={<WaiverPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
