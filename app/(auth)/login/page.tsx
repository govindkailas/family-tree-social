'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setSent(false)
      alert(error.message)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">Family Tree Login</h1>
      {sent ? (
        <p className="text-green-600">Check your email for a magic link!</p>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4 flex flex-col items-center">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-4 py-2 w-72"
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Send Magic Link
          </button>
        </form>
      )}
    </div>
  )
}
