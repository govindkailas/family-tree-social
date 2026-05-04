'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')

    async function handleCallback() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        window.location.href = error ? '/login' : '/dashboard'
      } else {
        // implicit flow: getSession() processes the URL hash automatically
        const { data: { session } } = await supabase.auth.getSession()
        window.location.href = session ? '/dashboard' : '/login'
      }
    }

    handleCallback()
  }, [router, searchParams])

  return <p className="text-gray-500">Signing you in…</p>
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
