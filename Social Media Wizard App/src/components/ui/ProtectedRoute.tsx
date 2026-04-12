import { useEffect, useState, type ReactNode } from 'react'
import { getSession, onAuthStateChange } from '@/lib/auth'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from '@/pages/Login'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    getSession().then(setSession)
    const sub = onAuthStateChange(setSession)
    return () => sub.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return <>{children}</>
}
