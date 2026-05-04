import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PendingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If they got approved since last visit, send them straight to dashboard
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single()

  if (membership) redirect('/dashboard')

  // Check request status
  const { data: request } = await supabase
    .from('join_requests')
    .select('status')
    .eq('user_id', user.id)
    .single()

  const isRejected = request?.status === 'rejected'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center mb-10 text-center">
        <span className="text-5xl mb-5">🌳</span>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Kailathuvalappil Family Tree
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center space-y-4">
        {isRejected ? (
          <>
            <div className="text-4xl">🚫</div>
            <p className="font-semibold text-gray-900">Access not approved</p>
            <p className="text-sm text-gray-500">
              Your request to join was not approved. If you think this is a
              mistake, please contact a family admin.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl">⏳</div>
            <p className="font-semibold text-gray-900">Request pending approval</p>
            <p className="text-sm text-gray-500">
              Your request to join the family tree has been sent to the admin.
              You&apos;ll receive an email once it&apos;s approved — try signing
              in again then.
            </p>
            <p className="text-xs text-gray-400 pt-2">{user.email}</p>
          </>
        )}
      </div>
    </div>
  )
}
