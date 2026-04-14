import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'image (base64 dataUrl) required' }, { status: 400 })

    // Strip data URL prefix to get pure base64
    const base64Match = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format — expected base64 data URL' }, { status: 400 })
    }
    const mediaType = base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const base64Data = base64Match[2]

    // Use claude-3-5-sonnet for vision (haiku doesn't support vision at this tier)
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `You are a document scanner AI. Please:
1. Extract ALL text from this image verbatim (preserving structure, line breaks, numbers, etc.)
2. Write a concise 1-2 sentence summary of what the document is about
3. Classify it into one of these categories: receipt, invoice, note, letter, form, id, medical, school, menu, other

Respond in this exact JSON format:
{
  "extractedText": "...all text from the image...",
  "summary": "...1-2 sentence summary...",
  "category": "receipt|invoice|note|letter|form|id|medical|school|menu|other"
}

If the image has no readable text, set extractedText to "" and describe what you see visually in the summary.`,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON response
    let parsed: { extractedText: string; summary: string; category: string }
    try {
      // Claude might wrap JSON in ```json...``` blocks
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // Fallback: return raw text if JSON parsing fails
      parsed = {
        extractedText: textContent.text,
        summary: 'Document scanned — see extracted text for details',
        category: 'other',
      }
    }

    return NextResponse.json({
      extractedText: parsed.extractedText || '',
      summary: parsed.summary || 'No summary available',
      category: parsed.category || 'other',
    })
  } catch (err: any) {
    console.error('Scan error:', err)
    return NextResponse.json({ error: err.message || 'Scan failed' }, { status: 500 })
  }
}
