import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Appointment } from './booking'
import { BOOKING_CONFIG } from './booking-config'

/**
 * Builds a one-page appointment confirmation PDF. pdf-lib has no native
 * dependencies, so this runs safely in Vercel's serverless functions.
 */
export async function buildAppointmentConfirmationPdf(appointment: Appointment): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([420, 560])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const config = BOOKING_CONFIG[appointment.domain]
  const dateTimeLabel = new Date(appointment.startsAt).toLocaleString('en-UG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Kampala',
  })

  let y = 500
  const draw = (text: string, opts: { size?: number; useBold?: boolean; gap?: number } = {}) => {
    const size = opts.size ?? 12
    page.drawText(text, { x: 40, y, size, font: opts.useBold ? bold : font, color: rgb(0.1, 0.1, 0.1) })
    y -= opts.gap ?? size + 10
  }

  draw('Appointment Confirmation', { size: 20, useBold: true, gap: 36 })
  draw(config.label, { size: 13, useBold: true, gap: 28 })
  draw(`Service: ${appointment.serviceName}`)
  draw(`Date & time: ${dateTimeLabel} (Africa/Kampala)`)
  draw(`Name: ${appointment.attendeeName}`)
  draw(`Phone: ${appointment.phone}`)
  draw(`Reference: #${appointment.id}`)
  y -= 20
  draw('If you need to cancel or reschedule, just message ZOE on WhatsApp.', { size: 10 })

  return doc.save()
}
