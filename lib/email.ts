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
