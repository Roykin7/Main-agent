import { Resend } from 'resend'

export type NewConvertData = {
  firstName: string
  lastName: string
  phone: string
  gender: 'Male' | 'Female'
  city: string
  email?: string
  watchingFrom: 'online' | 'physical'
  consent: boolean
}

export async function sendNewConvertEmail(data: NewConvertData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('sendNewConvertEmail: RESEND_API_KEY not set')
    return false
  }

  const from = process.env.RESEND_FROM
  if (!from) {
    // onboarding@resend.dev can only send to the account owner — useless for info@phaneroo.org.
    // RESEND_FROM must be a sender on a verified domain in your Resend account.
    console.error('sendNewConvertEmail: RESEND_FROM not set — email not sent. Set RESEND_FROM to a verified sender, e.g. "ZOE <noreply@yourdomain.com>"')
    return false
  }

  const resend = new Resend(apiKey)
  const date = new Date().toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Kampala',
  })

  const watchingFromLabel =
    data.watchingFrom === 'online'
      ? 'Watching Online (YouTube/Facebook)'
      : 'Physical Service (Phaneroo Grounds)'

  const body = `
New Convert Registration — received via ZOE (WhatsApp Assistant)
Date: ${date}

─────────────────────────────────
REGISTRATION DETAILS
─────────────────────────────────
Where Are You Watching From?  ${watchingFromLabel}

Name:         ${data.firstName} ${data.lastName}
Phone:        ${data.phone}
Gender:       ${data.gender}
City:         ${data.city || '—'}
Country:      Uganda
Email:        ${data.email || '—'}
Consent:      ${data.consent ? 'Yes' : 'No'}
─────────────────────────────────

This person was registered through ZOE, the Phaneroo WhatsApp assistant.
They have been welcomed into the faith and told that Phaneroo will follow up with them.

Please add them to your new converts system.
`.trim()

  const { error } = await resend.emails.send({
    from,
    to: 'info@phaneroo.org',
    subject: `New Convert — ${data.firstName} ${data.lastName} (${data.city || 'Uganda'})`,
    text: body,
  })

  if (error) {
    console.error('sendNewConvertEmail error:', error)
    return false
  }

  console.log(`New convert email sent: ${data.firstName} ${data.lastName} [${data.phone}]`)
  return true
}

export type EscalationEmailData = {
  phone: string
  reason: 'pastoral_crisis' | 'coffee_emergency' | 'human_handoff_request'
  summary: string
}

const ESCALATION_REASON_LABELS: Record<EscalationEmailData['reason'], string> = {
  pastoral_crisis: 'Pastoral crisis (grief, safety, or urgent spiritual need)',
  coffee_emergency: 'Urgent coffee/agronomy issue',
  human_handoff_request: 'User asked to speak with a person',
}

export async function sendEscalationEmail(data: EscalationEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('sendEscalationEmail: RESEND_API_KEY not set')
    return false
  }

  const from = process.env.RESEND_FROM
  if (!from) {
    console.error('sendEscalationEmail: RESEND_FROM not set — email not sent.')
    return false
  }

  const to = process.env.ESCALATION_EMAIL
  if (!to) {
    console.error('sendEscalationEmail: ESCALATION_EMAIL not set — email not sent.')
    return false
  }

  const resend = new Resend(apiKey)
  const timestamp = new Date().toLocaleString('en-UG', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Kampala',
  })

  const body = `
A conversation with ZOE (WhatsApp Assistant) was escalated to a human.

─────────────────────────────────
Reason:   ${ESCALATION_REASON_LABELS[data.reason]}
Phone:    ${data.phone}
Time:     ${timestamp}
─────────────────────────────────

${data.summary}

The user has already been told someone will follow up with them.
`.trim()

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `ZOE Escalation — ${ESCALATION_REASON_LABELS[data.reason]} — ${data.phone}`,
    text: body,
  })

  if (error) {
    console.error('sendEscalationEmail error:', error)
    return false
  }

  console.log(`Escalation email sent: ${data.reason} [${data.phone}]`)
  return true
}
