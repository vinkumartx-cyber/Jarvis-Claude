/**
 * ParentSquare Integration
 * Credential-based scraper — no public API available.
 * Uses node-fetch + cookie-session to authenticate and pull school data.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PSPost {
  id: string
  title: string
  body: string
  author: string
  school: string
  postedAt: string
  category: 'announcement' | 'assignment' | 'event' | 'alert' | 'general'
  attachments?: string[]
}

interface PSLoginResult {
  success: boolean
  cookies?: string
  error?: string
}

/** Authenticate with ParentSquare and return session cookies */
async function loginToParentSquare(username: string, password: string): Promise<PSLoginResult> {
  try {
    // Step 1: Get CSRF token from login page
    const loginPageRes = await fetch('https://www.parentsquare.com/signin', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    const loginPageHtml = await loginPageRes.text()
    const csrfMatch = loginPageHtml.match(/name="authenticity_token"[^>]+value="([^"]+)"/)
    const csrfToken = csrfMatch?.[1] || ''
    const setCookieHeader = loginPageRes.headers.get('set-cookie') || ''
    const sessionCookie = setCookieHeader.split(';')[0] || ''

    // Step 2: POST credentials
    const formData = new URLSearchParams({
      'user[email]': username,
      'user[password]': password,
      'authenticity_token': csrfToken,
      'commit': 'Sign In',
    })

    const loginRes = await fetch('https://www.parentsquare.com/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': sessionCookie,
        'Referer': 'https://www.parentsquare.com/signin',
      },
      body: formData.toString(),
      redirect: 'manual',
    })

    if (loginRes.status === 302 || loginRes.status === 200) {
      const authCookies = loginRes.headers.get('set-cookie') || ''
      if (authCookies.includes('_parentsquare_session') || loginRes.status === 302) {
        // Combine initial + auth cookies
        const allCookies = [sessionCookie, ...authCookies.split(',').map((c) => c.split(';')[0])].join('; ')
        return { success: true, cookies: allCookies }
      }
    }

    return { success: false, error: 'Login failed — check credentials' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/** Fetch recent posts/announcements from the ParentSquare feed */
async function fetchParentSquareFeed(cookies: string): Promise<PSPost[]> {
  const posts: PSPost[] = []

  try {
    // Try JSON API first (ParentSquare has a semi-public JSON endpoint)
    const feedRes = await fetch('https://www.parentsquare.com/feeds.json?page=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest',
      },
    })

    if (feedRes.ok) {
      const data = await feedRes.json()
      const items = data.posts || data.feeds || data.items || []

      for (const item of items.slice(0, 50)) {
        posts.push({
          id: String(item.id || item.post_id || Math.random()),
          title: item.subject || item.title || item.heading || 'School Update',
          body: item.body || item.content || item.message || '',
          author: item.author_name || item.sender_name || item.school_name || 'School',
          school: item.school_name || item.group_name || 'School',
          postedAt: item.created_at || item.posted_at || new Date().toISOString(),
          category: categorizePost(item.subject || item.title || ''),
          attachments: item.attachments?.map((a: any) => a.url || a.file_url) || [],
        })
      }
    }
  } catch {
    // Fallback: parse HTML feed
    const htmlRes = await fetch('https://www.parentsquare.com/feeds', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cookies,
      },
    })

    if (htmlRes.ok) {
      const html = await htmlRes.text()
      // Extract post data from HTML — basic regex scrape
      const postMatches = html.matchAll(/<article[^>]*data-post-id="(\d+)"[^>]*>([\s\S]*?)<\/article>/g)
      for (const match of Array.from(postMatches).slice(0, 20)) {
        const postHtml = match[2]
        const titleMatch = postHtml.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/)
        const bodyMatch = postHtml.match(/<div[^>]*class="[^"]*body[^"]*"[^>]*>([\s\S]*?)<\/div>/)
        const dateMatch = postHtml.match(/datetime="([^"]+)"/)

        posts.push({
          id: match[1],
          title: titleMatch?.[1]?.trim() || 'School Update',
          body: bodyMatch?.[1]?.replace(/<[^>]+>/g, ' ').trim() || '',
          author: 'School',
          school: 'School',
          postedAt: dateMatch?.[1] || new Date().toISOString(),
          category: categorizePost(titleMatch?.[1] || ''),
        })
      }
    }
  }

  return posts
}

function categorizePost(title: string): PSPost['category'] {
  const lower = title.toLowerCase()
  if (lower.includes('assignment') || lower.includes('homework') || lower.includes('project')) return 'assignment'
  if (lower.includes('event') || lower.includes('field trip') || lower.includes('meeting')) return 'event'
  if (lower.includes('alert') || lower.includes('urgent') || lower.includes('emergency')) return 'alert'
  if (lower.includes('announcement') || lower.includes('important') || lower.includes('reminder')) return 'announcement'
  return 'general'
}

/** Main sync function — called by cron job and manual sync */
export async function syncParentSquare(userId: string): Promise<{ synced: number; error?: string }> {
  try {
    // Get stored credentials from Supabase (stored in accounts table, access_token field)
    const { data: conn, error: connErr } = await supabase
      .from('accounts')
      .select('access_token')
      .eq('user_id', userId)
      .eq('service', 'parentsquare')
      .eq('is_active', true)
      .single()

    if (connErr || !conn) {
      return { synced: 0, error: 'ParentSquare not connected' }
    }

    // Decode credentials (stored as base64 JSON)
    let creds: { username: string; password: string }
    try {
      const decoded = Buffer.from(conn.access_token, 'base64').toString('utf8')
      creds = JSON.parse(decoded)
    } catch {
      return { synced: 0, error: 'Failed to decode credentials' }
    }

    // Login
    const loginResult = await loginToParentSquare(creds.username, creds.password)
    if (!loginResult.success || !loginResult.cookies) {
      return { synced: 0, error: loginResult.error || 'Login failed' }
    }

    // Fetch feed
    const posts = await fetchParentSquareFeed(loginResult.cookies)

    if (posts.length === 0) {
      return { synced: 0 }
    }

    // Upsert into school_events table
    const rows = posts.map((p) => ({
      user_id: userId,
      external_id: `ps_${p.id}`,
      title: p.title,
      description: p.body.slice(0, 2000),
      source: 'parentsquare',
      school_name: p.school,
      author: p.author,
      category: p.category,
      event_date: p.postedAt,
      raw_data: p,
    }))

    const { error: upsertErr } = await supabase
      .from('school_events')
      .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })

    if (upsertErr) {
      console.error('ParentSquare upsert error:', upsertErr)
      return { synced: 0, error: upsertErr.message }
    }

    // Log sync
    await supabase.from('sync_logs').insert({
      user_id: userId,
      service: 'parentsquare',
      status: 'success',
      items_synced: rows.length,
    })

    return { synced: rows.length }
  } catch (err: any) {
    console.error('ParentSquare sync error:', err)
    return { synced: 0, error: err.message }
  }
}
