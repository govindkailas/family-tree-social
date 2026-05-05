'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Server Actions ──────────────────────────────────────────────────────────

async function setRole(formData: FormData) {
  'use server'
  const targetUserId = formData.get('targetUserId') as string
  const familyId     = formData.get('familyId')     as string
  const newRole      = formData.get('newRole')       as string

  if (!['owner', 'member'].includes(newRole)) return

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Verify caller is an owner
  const { data: caller } = await supabase
    .from('family_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('family_id', familyId)
    .single()
  if (caller?.role !== 'owner') return

  // Can't demote yourself
  if (targetUserId === user.id) return

  await supabase
    .from('family_members')
    .update({ role: newRole })
    .eq('user_id', targetUserId)
    .eq('family_id', familyId)

  revalidatePath('/dashboard/members')
}

async function removeMember(formData: FormData) {
  'use server'
  const targetUserId = formData.get('targetUserId') as string
  const familyId     = formData.get('familyId')     as string

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Verify caller is owner and not removing themselves
  const { data: caller } = await supabase
    .from('family_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('family_id', familyId)
    .single()
  if (caller?.role !== 'owner' || targetUserId === user.id) return

  await supabase
    .from('family_members')
    .delete()
    .eq('user_id', targetUserId)
    .eq('family_id', familyId)

  revalidatePath('/dashboard/members')
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function MembersPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myMembership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'owner') redirect('/dashboard')

  const familyId = myMembership.family_id

  // Fetch all members via security-definer RPC — joins auth.users + people for name/email
  type MemberRow = { user_id: string; role: string; email: string; display_name: string }
  const { data: members } = await supabase.rpc('get_family_members', { fid: familyId })
  const rows = (members ?? []) as MemberRow[]

  const owners  = rows.filter(m => m.role === 'owner')
  const regular = rows.filter(m => m.role !== 'owner')

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Family Members</h1>
      <p className="text-sm text-gray-500 mb-8">
        Admins can approve join requests, add members, and manage the family tree.
      </p>

      {/* Admins */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Admins ({owners.length})
        </h2>
        <ul className="space-y-2">
          {owners.map(m => (
            <li key={m.user_id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{m.display_name}</p>
                {m.email && m.email !== m.display_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Admin
                </span>
                {m.user_id !== user.id && (
                  <form action={setRole}>
                    <input type="hidden" name="targetUserId" value={m.user_id} />
                    <input type="hidden" name="familyId"     value={familyId} />
                    <input type="hidden" name="newRole"      value="member" />
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
                    >
                      Remove admin
                    </button>
                  </form>
                )}
                {m.user_id === user.id && (
                  <span className="text-xs text-gray-400 px-2 py-1">(you)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Regular members */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Members ({regular.length})
        </h2>
        {regular.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-5">
            No regular members yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {regular.map(m => (
              <li key={m.user_id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.display_name}</p>
                  {m.email && m.email !== m.display_name && (
                    <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <form action={setRole}>
                    <input type="hidden" name="targetUserId" value={m.user_id} />
                    <input type="hidden" name="familyId"     value={familyId} />
                    <input type="hidden" name="newRole"      value="owner" />
                    <button
                      type="submit"
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                      Make admin
                    </button>
                  </form>
                  <form action={removeMember}>
                    <input type="hidden" name="targetUserId" value={m.user_id} />
                    <input type="hidden" name="familyId"     value={familyId} />
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
