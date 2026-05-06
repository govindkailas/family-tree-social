import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, familyId } = await req.json()
    if (!email || !familyId) {
      return NextResponse.json({ error: 'email and familyId are required' }, { status: 400 })
    }

    // Verify caller is an owner
    const { data: membership } = await supabase
      .from('family_members')
      .select('role, families(name)')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .single()

    if (membership?.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can send invites' }, { status: 403 })
    }

    const rawFamilies = membership?.families
    const familyName = Array.isArray(rawFamilies)
      ? (rawFamilies as { name: string }[])[0]?.name ?? 'our family'
      : (rawFamilies as unknown as { name: string } | null)?.name ?? 'our family'

    // Look up sender name
    const { data: senderPerson } = await supabase
      .from('people')
      .select('first_name, last_name')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .maybeSingle()

    const senderName = senderPerson
      ? `${senderPerson.first_name}${senderPerson.last_name ? ' ' + senderPerson.last_name : ''}`
      : user.email ?? 'A family member'

    // Check if already invited recently (last 7 days) to avoid duplicates
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('family_invites')
      .select('id')
      .eq('family_id', familyId)
      .eq('invited_email', email)
      .gte('created_at', since)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This email was already invited in the last 7 days.' }, { status: 409 })
    }

    // Record the invite
    const { error: insertErr } = await supabase
      .from('family_invites')
      .insert({ family_id: familyId, invited_email: email, invited_by: user.id })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Send the invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kailas.family'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#f59e0b;height:6px;"></td></tr>
        <tr><td style="padding:36px 40px 24px;text-align:center;">
          <p style="margin:0 0 12px;font-size:40px;">🌳</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You're invited to the ${familyName} Family Tree</h1>
          <p style="margin:0;font-size:15px;color:#6b7280;">
            <strong style="color:#374151;">${senderName}</strong> has invited you to join the family tree at <strong style="color:#374151;">kailas.family</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
            Click the button below to sign in with your email. You'll receive a 6-digit code — enter it to access the family tree.
          </p>
          <a href="${appUrl}/login" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
            Join the Family Tree →
          </a>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Sign in with <strong>${email}</strong> — your access is pre-approved.<br/>
            If you weren't expecting this, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Family Tree <onboarding@resend.dev>'
    const { error: sendErr } = await resend.emails.send({
      from: fromAddress,
      to:   [email],
      subject: `${senderName} invited you to the ${familyName} Family Tree`,
      html,
    })

    if (sendErr) {
      console.error('[invite-member] Email send failed:', sendErr.message)
      return NextResponse.json({ error: 'Invite recorded but email failed to send.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[invite-member]', err)
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
