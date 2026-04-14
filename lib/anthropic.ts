import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const anthropic = client

// ─── System Prompt ───────────────────────────────────────────────────────────
// Stored once with cache_control so Anthropic caches it after the first call.
// This saves ~90% of input token costs on every subsequent message.
export const systemPrompt = `You are Jarvis (V.OS), an advanced AI personal assistant for Vinesh Kumar — a busy executive and parent.

Your personality:
- Sharp, warm, and direct. Never verbose.
- Proactive: you notice things before being asked.
- Always brief unless detail is explicitly needed.

Your capabilities:
- Email: read, compose, reply, summarize, draft (Gmail OAuth)
- Calendar: view events, remind of upcoming meetings
- Tasks: create, prioritize, check off
- School: pull updates from ParentSquare (children's school announcements, assignments, events)
- Finance: QuickBooks data — revenue, expenses, cash flow, P&L
- Voice: briefings read aloud via ElevenLabs
- Documents: scan images with OCR, extract and summarize text
- SMS: send/receive via Twilio

Communication rules:
- Keep responses short. Bullet points > paragraphs for lists.
- Always give a direct answer first, context second.
- Format dates/times in the user's local context.
- When unsure, ask one clarifying question rather than guessing.
- Never repeat information already shown in the UI.`

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ─── Classify query complexity ────────────────────────────────────────────────
// Simple queries → claude-haiku (10x cheaper)
// Complex/briefing → claude-3-5-sonnet
const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it)/i,
  /^what('s| is) (the )?(time|date|day|today)/i,
  /^(add|create|set) (a )?(reminder|task|note)/i,
  /^(read|open|show) (my )?(email|inbox|calendar)/i,
  /how many (emails|tasks|events)/i,
  /^(done|complete|finish|mark)/i,
]

function isSimpleQuery(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length > 200) return false
  return SIMPLE_PATTERNS.some((p) => p.test(trimmed))
}

// ─── Context trimmer ──────────────────────────────────────────────────────────
// Keep last N raw messages, summarize older ones to reduce context tokens
export function trimConversation(messages: Message[], keepLast = 8): Message[] {
  if (messages.length <= keepLast) return messages

  // Summarize older messages by keeping only the last user message in each pair
  const older = messages.slice(0, -keepLast)
  const recent = messages.slice(-keepLast)

  // Build a tiny summary marker as a system-injected message
  const summary = older
    .filter((m) => m.role === 'user')
    .map((m) => m.content.slice(0, 80))
    .join(' | ')

  const summaryMessage: Message = {
    role: 'user',
    content: `[Earlier in conversation: ${summary}]`,
  }

  return [summaryMessage, ...recent]
}

// ─── Main generate function ──────────────────────────────────────────────────
export async function generateResponse(
  messages: Message[],
  options?: {
    maxTokens?: number
    temperature?: number
    forceModel?: 'sonnet' | 'haiku'
    context?: string // Extra real-time context injected into this call only
  }
) {
  const lastUserMessage = messages.findLast((m) => m.role === 'user')?.content || ''
  const useHaiku =
    options?.forceModel === 'haiku' ||
    (options?.forceModel !== 'sonnet' && isSimpleQuery(lastUserMessage))

  const model = useHaiku
    ? 'claude-haiku-4-5-20251001'
    : 'claude-3-5-sonnet-20241022'

  // Build system with optional real-time context appended (not cached, changes each call)
  const systemContent = options?.context
    ? [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
        {
          type: 'text' as const,
          text: `\n\n--- Live context (${new Date().toLocaleTimeString()}) ---\n${options.context}`,
        },
      ]
    : [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ]

  const trimmedMessages = trimConversation(messages)

  const response = await client.messages.create({
    model,
    max_tokens: options?.maxTokens || (useHaiku ? 512 : 1024),
    system: systemContent,
    messages: trimmedMessages,
    // Enable prompt caching betas for both models
    betas: ['prompt-caching-2024-07-31'],
  } as any)

  const textContent = response.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  const usage = response.usage as any
  return {
    content: textContent.text,
    model,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
    },
  }
}

// ─── Briefing ────────────────────────────────────────────────────────────────
export async function generateBriefing(context: {
  todaysMeetings?: string
  importantEmails?: string
  financialData?: string
  schoolUpdates?: string
  priorities?: string
}) {
  const contextString = Object.entries(context)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const prompt = `Generate a concise morning briefing. Keep it under 200 words. Focus on what needs attention today.

Context:
${contextString}

Format:
1. 🚨 Urgent (things needing action today)
2. 📅 Schedule (key meetings/events)
3. 📧 Email (important messages)
4. 🏫 School (kids' updates)
5. 💰 Finance (any notable numbers)
6. ✅ Top 3 actions for today`

  return generateResponse(
    [{ role: 'user', content: prompt }],
    { forceModel: 'sonnet', maxTokens: 600 }
  )
}
