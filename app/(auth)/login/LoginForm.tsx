'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp' | 'checking'

export default function LoginForm({ familyName }: { familyName: string | null }) {
  const [email, setEmail]   = useState('')
  const [otp, setOtp]       = useState('')
  const [step, setStep]     = useState<Step>('email')
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  // Step 1 — send the 6-digit code
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  // Step 2 — verify the code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type:  'email',
    })
    if (error) { setLoading(false); setError('Invalid code — please try again.'); return }

    setStep('checking')

    // Server-side membership check + join request creation
    const res  = await fetch('/api/check-membership', { method: 'POST' })
    const data = await res.json()
    if (data.isMember) {
      router.replace('/dashboard')
    } else {
      router.replace('/pending')
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

        {step === 'checking' && (
          <div className="text-center space-y-3 py-2">
            <div className="text-3xl">🌳</div>
            <p className="text-sm text-gray-500">Signing you in…</p>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1 mb-2">
              <div className="text-2xl">📬</div>
              <p className="font-medium text-gray-900 text-sm">Check your email</p>
              <p className="text-xs text-gray-500">
                We sent a 6-digit code to <span className="font-medium">{email}</span>
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                maxLength={6}
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400 tracking-widest text-center text-lg font-mono"
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(null); setOtp('') }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
