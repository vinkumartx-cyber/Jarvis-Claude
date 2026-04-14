import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface EmailThread {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  snippet: string
  date: string
  isRead: boolean
  isStarred: boolean
  labels: string[]
  body?: string
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function extractBody(payload: any): string {
  if (!payload) return ''
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    // Prefer text/plain, fallback to text/html
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plainPart?.body?.data) return decodeBase64(plainPart.body.data)
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) {
      const html = decodeBase64(htmlPart.body.data)
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
    // Recurse into nested parts
    for (const part of payload.parts) {
      const body = extractBody(part)
      if (body) return body
    }
  }
  return ''
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = (session as any).accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const pageToken = searchParams.get('pageToken') || ''
    const label = searchParams.get('label') || 'INBOX'
    const query = searchParams.get('q') || ''
    const maxResults = Number(searchParams.get('maxResults') || '20')

    // List messages
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    listUrl.searchParams.set('maxResults', String(Math.min(maxResults, 50)))
    listUrl.searchParams.set('labelIds', label)
    if (query) listUrl.searchParams.set('q', query)
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken)

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listData = await listRes.json()

    if (!listRes.ok) {
      return NextResponse.json({ error: listData.error?.message }, { status: listRes.status })
    }

    const messageIds: string[] = (listData.messages || []).map((m: any) => m.id)

    // Fetch each message in parallel (batched)
    const emails: EmailThread[] = await Promise.all(
      messageIds.map(async (id) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const msg = await msgRes.json()

        const headers = msg.payload?.headers || []
        const subject = getHeader(headers, 'Subject') || '(no subject)'
        const fromFull = getHeader(headers, 'From') || ''
        const date = getHeader(headers, 'Date') || ''

        // Parse "Name <email>" format
        const fromMatch = fromFull.match(/^(.+?)\s*<(.+?)>$/)
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : fromFull
        const fromEmail = fromMatch ? fromMatch[2] : fromFull

        return {
          id: msg.id,
          threadId: msg.threadId,
          subject,
          from: fromName,
          fromEmail,
          snippet: msg.snippet || '',
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          isRead: !msg.labelIds?.includes('UNREAD'),
          isStarred: msg.labelIds?.includes('STARRED') || false,
          labels: msg.labelIds || [],
          body: extractBody(msg.payload),
        }
      })
    )

    return NextResponse.json({
      emails,
      nextPageToken: listData.nextPageToken || null,
      totalCount: listData.resultSizeEstimate || emails.length,
    })
  } catch (err: any) {
    console.error('Inbox fetch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
