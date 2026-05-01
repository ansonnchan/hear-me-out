import { NextResponse } from 'next/server'
import { AI_MODEL, groq } from '@/lib/ai'
import { getPersonalityPrompt, isPersonalityKey, type PersonalityKey } from '@/lib/personalities'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { firstWordsTitle } from '@/lib/utils'

interface ChatRequestBody {
  message?: unknown
  personality?: unknown
  sessionId?: unknown
  regenerate?: unknown
}

function quietError(status: number) {
  return NextResponse.json({ error: 'Something went quiet. Try again in a moment.' }, { status })
}

function cleanTitle(title: string) {
  return title
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/[.!?。！？]+$/g, '')
    .slice(0, 90)
}

async function generateTitle(originalText: string) {
  const fallback = firstWordsTitle(originalText)

  if (!groq) return fallback

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.45,
      max_tokens: 32,
      messages: [
        {
          role: 'system',
          content:
            'Generate a short, evocative title for this journal entry in 8 words or fewer. Return only the title. No quotes. No punctuation at the end. Make it feel human and specific, not generic.',
        },
        {
          role: 'user',
          content: `Entry: ${originalText}`,
        },
      ],
    })

    const title = cleanTitle(completion.choices[0]?.message?.content ?? '')
    return title || fallback
  } catch (error) {
    console.error('Title generation failed', error)
    return fallback
  }
}

async function prepareSession(message: string, sessionId: string | null) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { supabase: null, sessionId: null, created: false }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, sessionId: null, created: false }
  if (sessionId) return { supabase, sessionId, created: false }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      original_text: message,
      title: firstWordsTitle(message),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Session insert failed', error)
    return { supabase, sessionId: null, created: false }
  }

  return { supabase, sessionId: data?.id as string, created: true }
}

async function persistResponse({
  content,
  createdSession,
  message,
  personality,
  sessionId,
  supabase,
  regenerate,
}: {
  content: string
  createdSession: boolean
  message: string
  personality: PersonalityKey
  sessionId: string | null
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  regenerate: boolean
}) {
  if (!supabase || !sessionId || !content.trim()) return

  try {
    if (regenerate) {
      await supabase.from('responses').delete().eq('session_id', sessionId).eq('personality', personality)
    }

    const { error } = await supabase.from('responses').insert({
      session_id: sessionId,
      personality,
      content,
    })

    if (error) {
      console.error('Response insert failed', error)
    }

    if (createdSession) {
      const title = await generateTitle(message)
      const { error: titleError } = await supabase.from('sessions').update({ title }).eq('id', sessionId)
      if (titleError) console.error('Title update failed', titleError)
    }
  } catch (error) {
    console.error('Persistence failed', error)
  }
}

export async function POST(request: Request) {
  let body: ChatRequestBody

  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return quietError(400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const personality = isPersonalityKey(body.personality) ? body.personality : null
  const incomingSessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null
  const regenerate = Boolean(body.regenerate)

  if (!message) {
    return NextResponse.json({ error: 'Write something first. Even one sentence.' }, { status: 400 })
  }

  if (!personality) {
    return quietError(400)
  }

  if (!groq) {
    return quietError(500)
  }

  const { supabase, sessionId, created } = await prepareSession(message, incomingSessionId)

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      stream: true,
      temperature: 0.72,
      max_tokens: 760,
      messages: [
        {
          role: 'system',
          content: getPersonalityPrompt(personality),
        },
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let content = ''

        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (!delta) continue

            content += delta
            controller.enqueue(encoder.encode(delta))
          }

          controller.close()
          await persistResponse({
            content,
            createdSession: created,
            message,
            personality,
            regenerate,
            sessionId,
            supabase,
          })
        } catch (error) {
          console.error('Groq stream failed', error)
          controller.error(error)
        }
      },
    })

    const headers = new Headers({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    })

    if (sessionId) headers.set('x-session-id', sessionId)

    return new Response(stream, { headers })
  } catch (error) {
    console.error('Groq API failed', error)
    return quietError(503)
  }
}
