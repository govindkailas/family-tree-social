import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteForm from './InviteForm'

function timeAgo(dt: string) {
  const diff  = Date.now() - new Date(dt).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 30) return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

export default async function InvitePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-3xl mb-3">🔒</p>
        <p className="text-sm text-gray-500">Only family admins can send invites.</p>
      </div>
    )
  }

  const { family_id: familyId } = membership

  // Fetch recent invites (last 50)
  const { data: invites } = await supabase
    .from('family_invites')
    .select('id, invited_email, created_at')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Cross-reference: which emails have since joined as family members?
  // We check join_requests with status=approved
  const invitedEmails = (invites ?? []).map(i => i.invited_email)
  const { data: approvedRequests } = invitedEmails.length > 0
    ? await supabase
        .from('join_requests')
        .select('email')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .in('email', invitedEmails)
    : { data: [] }

  const joinedEmails = new Set((approvedRequests ?? []).map(r => r.email))

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Invite to Family Tree</h1>
      <p className="text-sm text-gray-500 mb-8">
        Send an email invitation to someone so they can join the family tree at kailas.family.
      </p>

      {/* Form */}
      <InviteForm familyId={familyId} />

      {/* Recent invites */}
      {(invites ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Recent Invites ({(invites ?? []).length})
          </h2>
          <ul className="space-y-2">
            {(invites ?? []).map(inv => {
              const joined = joinedEmails.has(inv.invited_email)
              return (
                <li
                  key={inv.id}
                  className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.invited_email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Invited {timeAgo(inv.created_at)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    joined
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {joined ? 'Joined ✓' : 'Pending'}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
