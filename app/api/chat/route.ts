import { NextResponse } from 'next/server'
import { AI_MODEL, groq } from '@/lib/ai'
import { getPersonalityPrompt, isPersonalityKey, personalities, type PersonalityKey } from '@/lib/personalities'

interface ChatRequestBody {
  message?: unknown
  personality?: unknown
}

const RESPONSE_WORD_LIMIT = 160

function quietError(status: number) {
  return NextResponse.json({ error: 'Something went quiet. Try again in a moment.' }, { status })
}

function streamText(text: string) {
  const encoder = new TextEncoder()
  const chunks = text.split(/(\s+)/)

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }

      controller.close()
    },
  })
}

function mockResponse(personality: PersonalityKey, message: string) {
 // const opening = message.length > 180 ? 'There is a lot here.' : 'I hear you.'
 //don't harcode the opening to make it more thoughtful. 

  const copy: Record<PersonalityKey, string> = {
    cotton: `Let it be messy for a moment. You do not have to make it smaller before it is allowed to be held. I am here with the feeling first, before advice, before cleanup, before anyone asks you to be easier to understand.`,
    aristotle: `The first useful move is to separate the feeling from the question. Something in this matters to you, and something in it feels uncertain. Stay with the central issue, then take the next small step that reduces confusion rather than trying to solve the whole knot at once.`,
    ming: `Let the mind set down what it has been carrying. Not everything asks to be solved tonight. A journey of a thousand miles begins with a single step, and sometimes the first step is simply seeing the ground beneath you again.`,
    angel: `I want you to notice that you are still trying to name the truth instead of abandoning yourself inside it. That matters. Whatever this day has asked of you, you are not weak for needing tenderness around it.`,
    "auntie-zhang": `Be honest with yourself, but do not be cruel. The next move does not need drama. Choose one concrete action you can stand behind, do it cleanly, and let that prove to you that you are not as stuck as the feeling says.`,
  }

  return copy[personality] ?? `${personalities[personality].name} is listening. Give the thought a little more room.`
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

  if (!message) {
    return NextResponse.json({ error: 'Write something first. Even one sentence.' }, { status: 400 })
  }

  if (!personality) {
    return quietError(400)
  }

  const headers = new Headers({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
  })

  if (!groq) {
    return new Response(streamText(mockResponse(personality, message)), { headers })
  }

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      stream: true,
      temperature: 0.72,
      max_tokens: 230,
      messages: [
        {
          role: 'system',
          content: `${getPersonalityPrompt(personality)}

Keep the response to one paragraph, about 4 to 6 sentences and no more than ${RESPONSE_WORD_LIMIT} words.

Do not use bullets, headings, numbered steps, or chat-like formatting.

Do not begin with repeated stock phrases. Vary your opening naturally. Respond directly to the user's specific words instead of starting with a generic metaphor.

Sometimes, when it would feel natural and supportive, end with one gentle question that invites the user to keep reflecting. Do not ask a question every time.

Avoid repeating the same metaphor, rhythm, or sentence structure across responses.

Do not sound scripted. Stay true to the active personality, but make each response feel newly written for this exact message.`,
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
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (!delta) continue

            controller.enqueue(encoder.encode(delta))
          }

          controller.close()
        } catch (error) {
          console.error('Groq stream failed', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, { headers })
  } catch (error) {
    console.error('Groq API failed', error)
    return quietError(503)
  }
}
