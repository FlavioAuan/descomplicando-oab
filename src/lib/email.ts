import nodemailer, { type Transporter } from 'nodemailer'

// Outgoing email over SMTP. Works with any provider (Gmail app password,
// Hostinger, Brevo, Resend SMTP…) configured through the SMTP_* env vars.

let _transport: Transporter | null = null

function env(name: string) {
  return (process.env[name] ?? '').replace(/^﻿/, '').trim()
}

export function isEmailConfigured() {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))
}

function getTransport() {
  if (!_transport) {
    const port = Number(env('SMTP_PORT') || 587)
    _transport = nodemailer.createTransport({
      host: env('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
    })
  }
  return _transport
}

export async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  if (!isEmailConfigured()) throw new Error('SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASS)')

  await getTransport().sendMail({
    from: env('SMTP_FROM') || `DescomplicandOAB <${env('SMTP_USER')}>`,
    ...params,
  })
}
