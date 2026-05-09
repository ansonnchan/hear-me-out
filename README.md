# vent.ai

Same thought, different lens.

vent.ai is an ephemeral journaling interface for writing what is on your mind and hearing it reflected through five distinct AI personalities. It is not therapy, diagnosis, crisis support, or professional care.

## What It Does

- Polished welcome page with a quiet path into the writing flow.
- Large, distraction-free vent input on `/vent`.
- Five response personalities: Cotton, Aristotle, Venerable Ming, Angel, and Auntie Zhang.
- Optional persona suggestion while writing. The user can accept it or ignore it.
- Safety-aware response routing that can soften the tone for intense moments.
- Progressive in-memory context compression for longer anonymous sessions.
- One vent can be viewed through multiple lenses without retyping.
- Streaming responses through `/api/chat`.
- In-memory response cache only. Refreshing or closing the tab loses everything.
- Mock responses when `GROQ_API_KEY` is missing, so the app still runs locally.

## Tech Stack

- Next.js App Router for the product shell and API route.
- TypeScript for typed personality keys, state, and route contracts.
- Tailwind CSS for the custom dark visual system.
- Framer Motion for subtle entrances and personality transitions.
- Zustand for ephemeral client state.
- Groq SDK for streaming Llama responses when an API key is present.

## Architecture

The user arrives at `/`, meets the product and the five personalities, then starts writing on `/vent`.

The `/vent` route shows `PersonalitySelector`, `VentInput`, and the optional `WhyPersonaPanel`. The user can manually choose any of the five personalities at any time. Once the draft is long enough, a local heuristic can suggest a lens, but it never forces the choice.

Submitting the text shows `ResponsePanel`, which streams the selected personality first and keeps generated responses in Zustand memory for instant tab switching. The client also keeps a temporary in-memory session message list so long sessions can retain continuity without writing vents to storage.

`/api/chat` accepts the new anonymous chat payload, applies optional persona metadata, safety-aware routing, and temporary compressed context, then streams either Groq output or a local mock response. There are no accounts, database writes, saved sessions, profiles, titles, history, or localStorage persistence.

## Privacy-first LLM architecture

vent.ai is anonymous and session-local:

- Anonymous sessions with no accounts.
- No persistent vent storage and no database for sensitive user text.
- Manual persona selection remains the primary control.
- Optional persona suggestion uses a free local heuristic in `lib/ai/persona-router.ts`.
- Safety-aware response routing runs before generation and can switch to Cotton or Angel for a gentler response.
- Progressive context compression summarizes older turns into Zustand memory only, then trims older raw turns from the client session.
- Groq remains the main AI provider for streaming responses and compression.
- TTFT instrumentation stays lightweight through stream timing logs and `Server-Timing` preparation headers.
- Redis/Upstash rate limiting can remain in front of `/api/chat` if added by deployment, but this repo does not require it.

Architecture flow:

```text
User vent
 -> optional persona suggestion
 -> safety-aware routing
 -> Groq streaming response
 -> temporary context compression
 -> session clears when user leaves, refreshes, or resets
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```bash
GROQ_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`GROQ_API_KEY` is optional for local UI work. Without it, the API returns mock streamed responses.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Responsible AI

vent.ai is a reflective journaling interface. It should never present itself as treatment, diagnosis, crisis care, or a replacement for trusted people and emergency services. The global prompt rules in `lib/personalities.ts` apply to every personality, including the firmer Auntie Zhang mode.
