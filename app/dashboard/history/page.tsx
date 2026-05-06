import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function formatDate(dt: string | null) {
  if (!dt) return null
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(dt: string | null) {
  if (!dt) return null
  return new Date(dt).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function timeAgo(dt: string) {
  const diff = Date.now() - new Date(dt).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 30) return formatDate(dt)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default async function HistoryPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { family_id: familyId, role } = membership
  const isOwner = role === 'owner'

  // ── Event invites ──────────────────────────────────────────────────────────
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, location, created_at, sent_by')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  // Recipient counts per event
  const eventIds = (events ?? []).map(e => e.id)
  const { data: recipientRows } = eventIds.length > 0
    ? await supabase
        .from('event_recipients')
        .select('event_id')
        .in('event_id', eventIds)
    : { data: [] }

  const recipientCount: Record<string, number> = {}
  for (const row of recipientRows ?? []) {
    recipientCount[row.event_id] = (recipientCount[row.event_id] ?? 0) + 1
  }

  // ── Join requests ──────────────────────────────────────────────────────────
  // Owners see all; members see only their own request
  const joinQuery = supabase
    .from('join_requests')
    .select('id, email, status, created_at, reviewed_at')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  const { data: joinRequests } = isOwner
    ? await joinQuery
    : await joinQuery.eq('user_id', user.id)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-12">

      {/* ── Event Invites ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">Event Invites</h1>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {(events ?? []).length}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          All event emails sent to family members.
        </p>

        {(events ?? []).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No event invites sent yet.</p>
            <p className="text-xs mt-1">Use <strong>Event Invite</strong> in the menu to send one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(events ?? []).map(ev => (
              <li key={ev.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {ev.event_date && (
                        <span className="text-xs text-gray-500">📅 {formatDateTime(ev.event_date)}</span>
                      )}
                      {ev.location && (
                        <span className="text-xs text-gray-500">📍 {ev.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {recipientCount[ev.id] ?? 0} recipients
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(ev.created_at)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Join Requests ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">Family Join Requests</h1>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {(joinRequests ?? []).length}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {isOwner
            ? 'Everyone who has requested to join the family tree.'
            : 'Your request to join the family tree.'}
        </p>

        {(joinRequests ?? []).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">🌱</p>
            <p className="text-sm">No join requests yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(joinRequests ?? []).map(req => (
              <li key={req.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Requested {timeAgo(req.created_at)}</p>
                  {req.reviewed_at && (
                    <p className="text-xs text-gray-400">
                      Reviewed {timeAgo(req.reviewed_at)}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLE[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {req.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}
