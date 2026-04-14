import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: `You are Vinesh, a helpful and professional AI personal assistant. You help with:
- Calendar management and scheduling
- Email and task management
- Financial tracking and QuickBooks integration
- Business intelligence and analytics
- Executive briefings and summaries
- Voice-to-text communication

Be concise, professional, and helpful. Provide actionable insights when possible.`,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      response: assistantMessage,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
