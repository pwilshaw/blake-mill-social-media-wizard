import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from '@/contexts/AppContext'
import { ProtectedRoute } from '@/components/ui/ProtectedRoute'
import { AppLayout } from '@/components/ui/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Campaigns from '@/pages/Campaigns'
import CampaignDetail from '@/pages/CampaignDetail'
import ContentReview from '@/pages/ContentReview'
import CreativeGallery from '@/pages/CreativeGallery'
import Calendar from '@/pages/Calendar'
import Channels from '@/pages/Channels'
import Segments from '@/pages/Segments'
import Triggers from '@/pages/Triggers'
import Budget from '@/pages/Budget'
import Engagement from '@/pages/Engagement'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProtectedRoute>
          <AppProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/:id" element={<CampaignDetail />} />
                <Route path="campaigns/:id/content" element={<ContentReview />} />
                <Route path="campaigns/:id/creatives" element={<CreativeGallery />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="channels" element={<Channels />} />
                <Route path="segments" element={<Segments />} />
                <Route path="triggers" element={<Triggers />} />
                <Route path="budget" element={<Budget />} />
                <Route path="engagement" element={<Engagement />} />
              </Route>
            </Routes>
          </AppProvider>
        </ProtectedRoute>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
