'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm({ familyName }: { familyName: string | null }) {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      {/* Brand */}
      <div className="flex flex-col items-center mb-10 text-center">
        <span className="text-5xl mb-5">🌳</span>
        {familyName ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {familyName} Family Tree
            </h1>
            <p className="text-gray-500 mt-2 text-sm">Sign in to view your family tree</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Family Tree</h1>
            <p className="text-gray-500 mt-2 text-sm">Sign in to continue</p>
          </>
        )}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        {sent ? (
          <div className="text-center space-y-2">
            <div className="text-3xl">📬</div>
            <p className="font-medium text-gray-900">Check your email</p>
            <p className="text-sm text-gray-500">
              We sent a magic link to <span className="font-medium">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
