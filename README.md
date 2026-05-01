# vent.ai

Same thought, different lens.

vent.ai is an ephemeral journaling interface for writing what is on your mind and hearing it reflected through five distinct AI personalities. It is not therapy, diagnosis, crisis support, or professional care.

## What It Does

- Polished welcome page with a quiet path into the writing flow.
- Large, distraction-free vent input on `/vent`.
- Five response personalities: Cotton, Aristotle, Venerable Ming, Angel, and Auntie Zhang.
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

The `/vent` route begins with `PersonalitySelector`. Once a personality is selected, `VentInput` appears. Submitting the text shows `ResponsePanel`, which streams the selected personality first and keeps generated responses in Zustand memory for instant tab switching.

`/api/chat` accepts `{ message, personality }`, loads the matching prompt from `lib/personalities.ts`, and streams either Groq output or a local mock response. There are no accounts, database writes, saved sessions, profiles, titles, history, or localStorage persistence.

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

