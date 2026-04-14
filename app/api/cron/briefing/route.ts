import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Generate daily briefing for executives
    // 1. Fetch calendar events for the day
    // 2. Get email summary
    // 3. Pull financial/QuickBooks data
    // 4. Generate AI briefing
    // 5. Send via email/notification

    console.log('Running daily briefing cron job...')

    const briefingPrompt = `Generate a concise executive briefing for today that includes:
- Key meetings and calendar items
- Important emails and actionable items
- Financial highlights (if available)
- Top priorities for the day
- Weather and travel information

Format it as a structured JSON object with clear sections.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: briefingPrompt,
        },
      ],
    })

    const briefingContent =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // TODO: Send briefing to user via email/notification
    // TODO: Store briefing in database

    return NextResponse.json({
      success: true,
      message: 'Daily briefing generated',
      briefing: briefingContent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Briefing generation error:', error)
    return NextResponse.json(
      {
        error: 'Briefing generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
