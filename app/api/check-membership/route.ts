import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// ── welcome email sent on auto-approval ───────────────────────────────────────

async function sendWelcomeEmail({
  email,
  personName,
  familyName,
  appUrl,
}: {
  email:      string
  personName: string | null
  familyName: string
  appUrl:     string
}) {
  const from     = process.env.RESEND_FROM_EMAIL ?? 'Family Tree <onboarding@resend.dev>'
  const greeting = personName ? `Hi ${personName},` : 'Welcome!'
  const subject  = `You're in! Welcome to the ${familyName} Family Tree 🌳`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#10b981;height:6px;"></td></tr>
        <tr><td style="padding:36px 40px 24px;text-align:center;">
          <p style="margin:0 0 12px;font-size:40px;">🌳</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You're in the family tree!</h1>
          <p style="margin:0;font-size:15px;color:#6b7280;">
            ${greeting} Your profile was already part of the
            <strong style="color:#374151;">${familyName} Family Tree</strong>,
            so you've been automatically approved.
          </p>
        </td></tr>
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
            You can now explore the family tree, view relatives, and update your own profile.
          </p>
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
            Open Family Tree →
          </a>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Signed in as <strong>${email}</strong><br/>
            ${appUrl}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({ from, to: [email], subject, html })
  if (error) console.error('[check-membership] Welcome email failed:', error.message)
}

// ── route ──────────────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ isMember: false, error: 'No session' }, { status: 401 })
  }

  // 1. Already a member → straight to dashboard
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single()

  if (membership) {
    return NextResponse.json({ isMember: true })
  }

  // 2. Not a member yet — find the family via security-definer RPC
  //    (non-members can't read the families table directly due to RLS)
  const { data: familyId } = await supabase.rpc('get_default_family_id')

  if (!familyId) {
    return NextResponse.json({ isMember: false })
  }

  // 3. Path A — check if their email is pre-added to the people table.
  //    The RPC is SECURITY DEFINER so it can read/write even for non-members.
  //    Returns { approved, person_name, family_name } as JSONB.
  const { data: result, error: rpcErr } = await supabase.rpc(
    'auto_approve_if_pre_added',
    { p_user_id: user.id, p_email: user.email ?? '', p_family_id: familyId }
  )

  if (rpcErr) {
    console.error('[check-membership] auto_approve RPC failed:', rpcErr.message)
  }

  const autoResult = result as { approved: boolean; person_name?: string; family_name?: string } | null

  if (autoResult?.approved) {
    // Record an approved join_request for audit trail (fire-and-forget)
    supabase.from('join_requests').insert({
      user_id:   user.id,
      email:     user.email ?? '',
      family_id: familyId,
      status:    'approved',
    }).then(({ error }) => {
      if (error) console.error('[check-membership] audit join_request failed:', error.message)
    })

    // Send welcome email (non-blocking — auto-approval should never be delayed by email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kailas.family'
    sendWelcomeEmail({
      email:      user.email ?? '',
      personName: autoResult.person_name ?? null,
      familyName: autoResult.family_name ?? 'Kailathuvalappil',
      appUrl,
    }).catch(err => console.error('[check-membership] welcome email error:', err))

    return NextResponse.json({ isMember: true })
  }

  // 4. Default path — create a pending join_request and send them to /pending
  const { data: existing } = await supabase
    .from('join_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('family_id', familyId)
    .maybeSingle()

  if (!existing) {
    await supabase.from('join_requests').insert({
      user_id:   user.id,
      email:     user.email ?? '',
      family_id: familyId,
      status:    'pending',
    })
  }

  return NextResponse.json({ isMember: false })
}
