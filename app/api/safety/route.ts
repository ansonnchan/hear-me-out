import { NextResponse } from 'next/server'
import { routeSafety } from '@/lib/ai/safety-router'
import type { PersonalityId } from '@/lib/ai/persona-router'
import { normalizePersonalityKey } from '@/lib/personalities'

interface SafetyRequestBody {
  message?: unknown
  personality?: unknown
}

export async function POST(request: Request) {
  let body: SafetyRequestBody

  try {
    body = (await request.json()) as SafetyRequestBody
  } catch {
    return NextResponse.json({ shouldOfferGentleLens: false }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : ''
  const selectedPersona = normalizePersonalityKey(body.personality) ?? 'auntie-zhang'

  if (!message) {
    return NextResponse.json({ shouldOfferGentleLens: false })
  }

  try {
    const route = await routeSafety({
      message,
      selectedPersona: selectedPersona as PersonalityId,
    })

    return NextResponse.json({
      shouldOfferGentleLens: route.level !== 'normal',
    })
  } catch (error) {
    console.error('[vent.ai] api.safety.failed', error)
    return NextResponse.json({ shouldOfferGentleLens: false })
  }
}
