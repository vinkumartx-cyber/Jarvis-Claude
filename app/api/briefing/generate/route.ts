import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { generateResponse } from '@/lib/anthropic';

function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const supabase = createServerClient();

    // Check rate limit - briefing generated in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentBriefing } = await supabase
      .from('briefings')
      .select('id')
      .eq('user_id', userId)
      .gte('generated_at', oneHourAgo)
      .limit(1)
      .single();

    if (recentBriefing) {
      return NextResponse.json(
        { error: 'Briefing was generated recently. Please try again later.' },
        { status: 429 }
      );
    }

    // Aggregate user data
    const [
      calendarEvents,
      flaggedEmails,
      activeTasks,
      recentMessages,
      schoolEvents,
      financialData,
      newsItems,
    ] = await Promise.all([
      // Calendar events (next 7 days)
      supabase
        .from('calendar_events')
        .select('title, startTime, endTime, location, attendees')
        .eq('user_id', userId)
        .gte('startTime', new Date().toISOString())
        .lte('startTime', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .then((res) => res.data || []),

      // Flagged emails
      supabase
        .from('emails')
        .select('subject, from, body')
        .eq('user_id', userId)
        .eq('is_flagged', true)
        .limit(10)
        .then((res) => res.data || []),

      // Active tasks
      supabase
        .from('tasks')
        .select('title, dueDate, priority, description')
        .eq('user_id', userId)
        .eq('completed', false)
        .limit(10)
        .then((res) => res.data || []),

      // Recent messages
      supabase
        .from('conversation_messages')
        .select('content, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
        .then((res) => res.data || []),

      // School events
      supabase
        .from('school_events')
        .select('title, date, description')
        .eq('user_id', userId)
        .gte('date', new Date().toISOString())
        .lte('date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .then((res) => res.data || []),

      // Financial data
      supabase
        .from('financial_data')
        .select('account, balance, lastUpdated')
        .eq('user_id', userId)
        .order('lastUpdated', { ascending: false })
        .limit(5)
        .then((res) => res.data || []),

      // News items
      supabase
        .from('news_items')
        .select('title, description, source')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
        .then((res) => res.data || []),
    ]);

    // Build aggregated data string for Claude
    const aggregatedData = `
Calendar Events (Next 7 Days):
${calendarEvents.map((e) => `- ${e.title} on ${new Date(e.startTime).toLocaleDateString()} at ${new Date(e.startTime).toLocaleTimeString()}${e.location ? ` (${e.location})` : ''}`).join('\n')}

Flagged Emails:
${flaggedEmails.map((e) => `- ${e.subject} from ${e.from}`).join('\n')}

Active Tasks:
${activeTasks.map((t) => `- [${t.priority}] ${t.title}${t.dueDate ? ` - Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}`).join('\n')}

School Events:
${schoolEvents.map((e) => `- ${e.title} on ${new Date(e.date).toLocaleDateString()}`).join('\n')}

Financial Summary:
${financialData.map((f) => `- ${f.account}: ${f.balance}`).join('\n')}

Latest News:
${newsItems.map((n) => `- ${n.title} (${n.source})`).join('\n')}
    `;

    // Generate briefing with Claude
    const response = await generateResponse([
      {
        role: 'user',
        content: `Please generate an executive briefing based on the following data:\n\n${aggregatedData}\n\nProvide a structured briefing with key items requiring immediate attention, meeting summaries, financial highlights, recommended actions, and any risk alerts.`,
      },
    ]);

    // Store briefing
    const { data: briefing, error: storeError } = await supabase
      .from('briefings')
      .insert({
        user_id: userId,
        content: response.content,
        generated_at: new Date().toISOString(),
      })
      .select('id, content, generated_at')
      .single();

    if (storeError || !briefing) {
      throw new Error('Failed to store briefing');
    }

    return NextResponse.json({
      briefing: {
        id: briefing.id,
        content: briefing.content,
        generatedAt: briefing.generated_at,
      },
    });
  } catch (error) {
    console.error('Error generating briefing:', error);
    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}
