import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from '@/contexts/AppContext'
import { ProtectedRoute } from '@/components/ui/ProtectedRoute'
import { AppLayout } from '@/components/ui/AppLayout'

// Lazy-loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Campaigns = lazy(() => import('@/pages/Campaigns'))
const CampaignDetail = lazy(() => import('@/pages/CampaignDetail'))
const ContentReview = lazy(() => import('@/pages/ContentReview'))
const CreativeGallery = lazy(() => import('@/pages/CreativeGallery'))
const Calendar = lazy(() => import('@/pages/Calendar'))
const Channels = lazy(() => import('@/pages/Channels'))
const Segments = lazy(() => import('@/pages/Segments'))
const Triggers = lazy(() => import('@/pages/Triggers'))
const Budget = lazy(() => import('@/pages/Budget'))
const Engagement = lazy(() => import('@/pages/Engagement'))
const MediaBuyer = lazy(() => import('@/pages/MediaBuyer'))
const Conversions = lazy(() => import('@/pages/Conversions'))
const ChannelSelectPages = lazy(() => import('@/pages/ChannelSelectPages'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function ProtectedApp() {
  return (
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
            <Route path="channels/select" element={<ChannelSelectPages />} />
            <Route path="segments" element={<Segments />} />
            <Route path="triggers" element={<Triggers />} />
            <Route path="budget" element={<Budget />} />
            <Route path="engagement" element={<Engagement />} />
            <Route path="media-buyer" element={<MediaBuyer />} />
            <Route path="conversions" element={<Conversions />} />
          </Route>
        </Routes>
      </AppProvider>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public pages — no auth required */}
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            {/* Protected app — requires login */}
            <Route path="*" element={<ProtectedApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
