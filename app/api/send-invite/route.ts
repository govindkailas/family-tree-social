import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const title      = formData.get('title') as string
    const message    = formData.get('message') as string
    const eventDate  = formData.get('event_date') as string | null
    const location   = formData.get('location') as string | null
    const familyId   = formData.get('family_id') as string
    const emails     = formData.getAll('emails') as string[]
    const attachment = formData.get('attachment') as File | null

    if (!title || !familyId || emails.length === 0) {
      return NextResponse.json({ error: 'title, family_id and at least one email are required' }, { status: 400 })
    }

    // ── Upload attachment ──────────────────────────────────────────────────
    let attachmentUrl: string | null = null
    let attachmentName: string | null = null

    if (attachment && attachment.size > 0) {
      const ext  = attachment.name.split('.').pop() ?? 'bin'
      const path = `${familyId}/${Date.now()}-${attachment.name}`
      const bytes = Buffer.from(await attachment.arrayBuffer())

      const { error: uploadErr } = await supabase.storage
        .from('event-attachments')
        .upload(path, bytes, { contentType: attachment.type, upsert: false })

      if (uploadErr) {
        return NextResponse.json({ error: `Attachment upload failed: ${uploadErr.message}` }, { status: 500 })
      }

      const { data: urlData } = supabase.storage.from('event-attachments').getPublicUrl(path)
      attachmentUrl  = urlData.publicUrl
      attachmentName = attachment.name
    }

    // ── Save event to DB ──────────────────────────────────────────────────
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .insert({
        family_id:       familyId,
        title,
        message:         message || null,
        event_date:      eventDate || null,
        location:        location || null,
        attachment_url:  attachmentUrl,
        attachment_name: attachmentName,
        sent_by:         user.id,
      })
      .select('id')
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: eventErr?.message ?? 'Failed to save event' }, { status: 500 })
    }

    // ── Save recipients ────────────────────────────────────────────────────
    await supabase.from('event_recipients').insert(
      emails.map((email) => ({ event_id: event.id, email }))
    )

    // ── Look up sender's name ──────────────────────────────────────────────
    const { data: senderPerson } = await supabase
      .from('people')
      .select('first_name, last_name')
      .eq('family_id', familyId)
      .eq('email', user.email)
      .single()

    const senderName = senderPerson
      ? `${senderPerson.first_name}${senderPerson.last_name ? ' ' + senderPerson.last_name : ''}`
      : (user.email ?? 'A family member')

    // ── Build email HTML ───────────────────────────────────────────────────
    const dateStr = eventDate
      ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : null

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kailas.family'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- accent bar -->
        <tr><td style="background:#f59e0b;height:6px;"></td></tr>
        <!-- header -->
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase;">🌳 Family Invite</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#111827;line-height:1.2;">${title}</h1>
          ${dateStr ? `<p style="margin:10px 0 0;font-size:15px;color:#6b7280;">📅 ${dateStr}</p>` : ''}
          ${location ? `<p style="margin:6px 0 0;font-size:15px;color:#6b7280;">📍 ${location}</p>` : ''}
        </td></tr>
        <!-- divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>
        <!-- message -->
        ${message ? `
        <tr><td style="padding:24px 40px;">
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </td></tr>` : ''}
        <!-- attachment -->
        ${attachmentUrl ? `
        <tr><td style="padding:0 40px 24px;">
          <a href="${attachmentUrl}" style="display:inline-flex;align-items:center;gap:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;text-decoration:none;color:#374151;font-size:14px;">
            📎 ${attachmentName ?? 'View attachment'}
          </a>
        </td></tr>` : ''}
        <!-- CTA -->
        <tr><td style="padding:24px 40px 8px;">
          <a href="${appUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">
            View Family Tree →
          </a>
        </td></tr>
        <!-- footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#6b7280;">
            Invited by <strong style="color:#374151;">${senderName}</strong>
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">You received this because you're part of the Kailathuvalappil family tree.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // ── Send emails via Resend ─────────────────────────────────────────────
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Family Tree <onboarding@resend.dev>'

    const { error: sendErr } = await resend.emails.send({
      from: fromAddress,
      to:   emails,
      subject: title,
      html,
    })

    if (sendErr) {
      return NextResponse.json({ error: `Email send failed: ${sendErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, eventId: event.id })
  } catch (err: any) {
    console.error('[send-invite]', err)
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
