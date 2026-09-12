import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ComingSoonPage } from './components/ComingSoonPage'
import { DraftDayPage } from './components/DraftDayPage'
import { Layout } from './components/Layout'
import { PracticeDraftScreen } from './components/PracticeDraftScreen'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/draft" replace />} />
          <Route path="draft" element={<DraftDayPage />} />
          <Route path="practice" element={<PracticeDraftScreen />} />
          <Route path="lineup" element={<ComingSoonPage title="Weekly Lineup Manager" />} />
          <Route path="waivers" element={<ComingSoonPage title="Waiver Manager" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
