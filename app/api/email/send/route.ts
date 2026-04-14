import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Access token is stored in the JWT session from NextAuth Google provider
  const accessToken = (session as any).accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token — please sign in again' }, { status: 401 })
  }

  try {
    const { to, subject, body, threadId } = await req.json()

    if (!to || !body) {
      return NextResponse.json({ error: 'to and body are required' }, { status: 400 })
    }

    // Build RFC 2822 email
    const fromName = session.user.name || ''
    const fromEmail = session.user.email
    const emailLines = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject || '(no subject)'}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      body,
    ]
    const rawEmail = emailLines.join('\r\n')
    const encodedEmail = Buffer.from(rawEmail).toString('base64url')

    // Build request body
    const gmailBody: Record<string, any> = { raw: encodedEmail }
    if (threadId) gmailBody.threadId = threadId

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gmailBody),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Gmail send error:', data)
      return NextResponse.json({ error: data.error?.message || 'Failed to send email' }, { status: res.status })
    }

    return NextResponse.json({ success: true, messageId: data.id })
  } catch (err: any) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
