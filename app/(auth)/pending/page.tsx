import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckApproval from './CheckApproval'

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
    .select('status, family_id')
    .eq('user_id', user.id)
    .single()

  const isRejected = request?.status === 'rejected'

  // Look up if they already have a record in the family tree and who their parent is
  let treeContext: { personName: string; parentName: string | null } | null = null
  if (request?.family_id && user.email) {
    const { data: person } = await supabase
      .from('people')
      .select('id, first_name, last_name')
      .eq('family_id', request.family_id)
      .eq('email', user.email)
      .single()

    if (person) {
      const { data: parentRel } = await supabase
        .from('relationships')
        .select('from_person:people!from_person_id(first_name, last_name)')
        .eq('to_person_id', person.id)
        .eq('type', 'parent_child')
        .limit(1)
        .single()

      const parent = parentRel?.from_person as unknown as { first_name: string; last_name?: string | null } | null
      treeContext = {
        personName: `${person.first_name}${person.last_name ? ' ' + person.last_name : ''}`,
        parentName: parent ? `${parent.first_name}${parent.last_name ? ' ' + parent.last_name : ''}` : null,
      }
    }
  }

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

            {treeContext ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
                <p>You&apos;ve been added to the family tree as <strong>{treeContext.personName}</strong>.</p>
                {treeContext.parentName && (
                  <p className="text-xs text-amber-600">Under <strong>{treeContext.parentName}</strong></p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Your request to join the family tree has been sent to the admin.
              </p>
            )}

            <p className="text-sm text-gray-500">
              You&apos;ll be redirected automatically once an admin approves your request.
            </p>
            <p className="text-xs text-gray-400 pt-1">{user.email}</p>
            <CheckApproval />
          </>
        )}
      </div>
    </div>
  )
}
