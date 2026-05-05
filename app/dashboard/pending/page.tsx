'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Server Actions ──────────────────────────────────────────────────────────

async function approveRequest(formData: FormData) {
  'use server'
  const requestId = formData.get('requestId') as string
  const userId    = formData.get('userId')    as string
  const familyId  = formData.get('familyId')  as string
  const email     = formData.get('email')     as string

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Add to family_members
  await supabase.from('family_members').insert({
    user_id:   userId,
    family_id: familyId,
    role:      'member',
  })

  // Link their people record to this auth user (match by email)
  if (email) {
    await supabase
      .from('people')
      .update({ user_id: userId })
      .eq('family_id', familyId)
      .eq('email', email)
      .is('user_id', null) // don't overwrite an existing link
  }

  // Mark request approved
  await supabase
    .from('join_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', requestId)

  revalidatePath('/dashboard/pending')
}

async function rejectRequest(formData: FormData) {
  'use server'
  const requestId = formData.get('requestId') as string

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('join_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', requestId)

  revalidatePath('/dashboard/pending')
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PendingRequestsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only owners can access this page
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') redirect('/dashboard')

  const { data: requests } = await supabase
    .from('join_requests')
    .select('id, email, user_id, status, created_at')
    .eq('family_id', membership.family_id)
    .order('created_at', { ascending: false })

  // For each pending request, look up if a people record + parent exists
  type RequestWithContext = typeof requests extends (infer T)[] | null ? T & { parentName?: string | null } : never
  const enriched: RequestWithContext[] = await Promise.all(
    (requests ?? []).map(async (req) => {
      const { data: person } = await supabase
        .from('people')
        .select('id, first_name, last_name')
        .eq('family_id', membership.family_id)
        .eq('email', req.email)
        .single()

      if (!person) return { ...req, parentName: null }

      // Find parent relationship
      const { data: parentRel } = await supabase
        .from('relationships')
        .select('from_person:people!from_person_id(first_name, last_name)')
        .eq('to_person_id', person.id)
        .eq('type', 'parent_child')
        .limit(1)
        .single()

      const parent = (parentRel?.from_person as { first_name: string; last_name?: string | null } | null)
      const parentName = parent ? `${parent.first_name}${parent.last_name ? ' ' + parent.last_name : ''}` : null
      return { ...req, parentName }
    })
  )

  const pending  = enriched.filter(r => r.status === 'pending')
  const reviewed = enriched.filter(r => r.status !== 'pending')

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Join Requests</h1>
      <p className="text-sm text-gray-500 mb-8">
        Approve members to give them access to the family tree.
      </p>

      {/* Pending */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-5">
            No pending requests.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map(req => (
              <li
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.email}</p>
                  {req.parentName && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Child of {req.parentName} in the tree
                    </p>
                  )}
                  {!req.parentName && (
                    <p className="text-xs text-gray-400 mt-0.5">Not yet linked to a tree record</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(req.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={approveRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="userId"    value={req.user_id} />
                    <input type="hidden" name="familyId"  value={membership.family_id} />
                    <input type="hidden" name="email"     value={req.email} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Reviewed
          </h2>
          <ul className="space-y-2">
            {reviewed.map(req => (
              <li
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between"
              >
                <p className="text-sm text-gray-700">{req.email}</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    req.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {req.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
