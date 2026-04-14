import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { generateResponse, systemPrompt } from '@/lib/anthropic';
import { Message } from '@/lib/anthropic';

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
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get or create conversation
    let finalConversationId = conversationId;
    if (!finalConversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50),
          archived: false,
        })
        .select('id')
        .single();

      if (createError || !newConversation) {
        throw new Error('Failed to create conversation');
      }
      finalConversationId = newConversation.id;
    }

    // Fetch last 20 messages for context
    const { data: conversationHistory, error: historyError } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', finalConversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      throw new Error('Failed to fetch conversation history');
    }

    // Fetch today's calendar events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: calendarEvents = [] } = await supabase
      .from('calendar_events')
      .select('title, startTime, endTime, location, attendees')
      .eq('user_id', userId)
      .gte('startTime', today.toISOString())
      .lt('startTime', tomorrow.toISOString());

    // Fetch flagged emails
    const { data: flaggedEmails = [] } = await supabase
      .from('emails')
      .select('subject, from, created_at')
      .eq('user_id', userId)
      .eq('is_flagged', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch active tasks
    const { data: activeTasks = [] } = await supabase
      .from('tasks')
      .select('title, dueDate, priority')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('dueDate', { ascending: true })
      .limit(10);

    // Build context
    const context = {
      todaysMeetings: calendarEvents
        .map((e) => `${e.title} at ${new Date(e.startTime).toLocaleTimeString()} ${e.location ? `(${e.location})` : ''}`)
        .join('\n'),
      importantEmails: flaggedEmails
        .map((e) => `${e.subject} from ${e.from}`)
        .join('\n'),
      activeTasks: activeTasks
        .map((t) => `[${t.priority}] ${t.title}${t.dueDate ? ` - Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}`)
        .join('\n'),
    };

    // Prepare conversation history as Message[]
    const messages: Message[] = [
      ...(conversationHistory || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Call Anthropic Claude with context
    const response = await generateResponse(messages, { maxTokens: 1024 });

    // Store user message
    await supabase.from('conversation_messages').insert({
      conversation_id: finalConversationId,
      user_id: userId,
      role: 'user',
      content: message,
    });

    // Store assistant response
    await supabase.from('conversation_messages').insert({
      conversation_id: finalConversationId,
      user_id: userId,
      role: 'assistant',
      content: response.content,
    });

    return NextResponse.json({
      response: response.content,
      conversationId: finalConversationId,
      usage: response.usage,
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
