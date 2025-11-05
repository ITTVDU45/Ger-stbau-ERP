import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const phone = (body?.phone || '').toString()

    // simple E.164-ish validation
    if (!/^\+?[1-9][0-9]{6,14}$/.test(phone)) {
      return NextResponse.json({ error: 'Ungültiges Telefonformat' }, { status: 400 })
    }

    const webhook = process.env.N8N_WEBHOOK_URL
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Forwarding failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}


