'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    const handleAuth = async () => {
      // Give the Supabase client a moment to parse the hash and set cookies
      await new Promise(resolve => setTimeout(resolve, 200))

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        router.replace('/login?error=auth_callback_failed')
        return
      }

      setStatus('Checking your access…')

      // Server-side membership check + join request creation
      const res = await fetch('/api/check-membership', { method: 'POST' })
      const data = await res.json()

      if (data.isMember) {
        router.replace('/dashboard')
      } else {
        router.replace('/pending')
      }
    }

    handleAuth()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4">
      <span className="text-5xl">🌳</span>
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  )
}
