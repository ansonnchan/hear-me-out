// This is the only file that references the AI provider.
// To swap to Claude: replace the client and model string. Nothing else changes.

import Groq from 'groq-sdk'

export const AI_MODEL = 'llama-3.3-70b-versatile'

export const groq = process.env.GROQ_API_KEY
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null

// Swap to Claude later:
// import Anthropic from '@anthropic-ai/sdk'
// export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
// export const AI_MODEL = 'claude-sonnet-4-20250514'

