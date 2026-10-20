import nodemailer, { type Transporter } from 'nodemailer'

// Outgoing email over SMTP. Defaults to Gmail (smtp.gmail.com:465), so only
// SMTP_USER and SMTP_PASS (a Google app password) are required; set SMTP_HOST
// and SMTP_PORT to use another provider.

let _transport: Transporter | null = null

function env(name: string) {
  return (process.env[name] ?? '').replace(/^﻿/, '').trim()
}

export function isEmailConfigured() {
  return Boolean(env('SMTP_USER') && env('SMTP_PASS'))
}

function getTransport() {
  if (!_transport) {
    const port = Number(env('SMTP_PORT') || 465)
    _transport = nodemailer.createTransport({
      host: env('SMTP_HOST') || 'smtp.gmail.com',
      port,
      secure: port === 465,
      // Google shows app passwords in groups of four ("abcd efgh …"); the spaces aren't part of it
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS').replace(/\s+/g, '') },
    })
  }
  return _transport
}

export async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  if (!isEmailConfigured()) throw new Error('SMTP não configurado (SMTP_USER, SMTP_PASS)')

  await getTransport().sendMail({
    from: env('SMTP_FROM') || `DescomplicandOAB <${env('SMTP_USER')}>`,
    ...params,
  })
}
