# vent.ai

Same thought. Different lens.

vent.ai is an ephemeral AI reflection app for writing what is on your mind and hearing it reflected through distinct personality perspectives. It is designed to feel calm, private, and lightweight: no accounts, no saved history, and no persistent user data.

## Preview

<p align="center">
  <img src="assets/vent.ai_pic1.png" alt="Vent.ai Home Page" width="800">
  <br>
vent.ai's home page</em>
</p>
<br>
<p align="center">
  <img src="assets/vent.ai_pic2.png" alt="Chatting with Angel" width="800">
  <br>
 Chat with Angel, one of the AI personalities</em>
</p>

## AI Personalities

vent.ai includes five personality modes, each with its own tone, visual accent, and response style:

- **Cotton**: soft, gentle, and emotionally validating.
- **Aristotle**: clear, grounded, and reasoning-focused.
- **Venerable Ming**: calm, spacious, and perspective-oriented.
- **Angel**: encouraging, supportive, and confidence-building.
- **Auntie Zhang**: direct, caring, and accountability-focused.

Users can write one vent and then choose which personality should respond. Switching personalities keeps the current vent available, but does not automatically replay old responses, so each personality interaction feels fresh and intentional.

## Features

- Distraction-free vent input on `/vent`.
- Five themed AI personalities with dynamic accent colors and character art.
- Streamed AI responses through a REST-style Next.js API route.
- Personality switching for generating different perspectives on the same thought.
- Clear response control that resets the current reflection state.
- Ephemeral in-memory state with Zustand.
- Upstash Redis rate limiting for AI API calls.
- Lightweight client-side metrics for vents submitted, API calls, personality switches, time to first token, total response time, errors, and rate-limit hits.
- Mock streamed responses when `GROQ_API_KEY` is not configured.
- Responsive UI built for desktop and mobile.
- Subtle motion using Framer Motion with reduced-motion support.

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Frontend:** React
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **State:** Zustand
- **AI:** Groq SDK
- **Rate Limiting:** Upstash Redis and Upstash Ratelimit
- **API:** Next.js route handler at `/api/chat`

## How It Works

The user starts on the landing page, chooses a personality, and writes a thought on `/vent`.

When a vent is submitted, the frontend sends `{ message, personality }` to `/api/chat`. The API route validates the request, loads the selected personality prompt from `lib/personalities.ts`, and streams a response back to the UI. If no Groq API key is present, the route returns a local mock response so the interface can still be developed and tested.

The chat route is protected by an optional Upstash Redis sliding-window rate limit. When Upstash credentials are not configured, the app still runs locally without server-side rate limiting.

All session state is kept in memory. Refreshing or closing the tab clears the current vent and responses.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Environment Variables

```bash
GROQ_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`GROQ_API_KEY` is optional for local UI work. Without it, the app uses mock, hard-coded responses.

The Upstash variables are optional locally. Add them to enable Redis-backed rate limiting for `/api/chat`.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Not a Substitute for Support

vent.ai is not therapy, diagnosis, crisis support, medical advice, or professional care. It is a reflective writing tool meant to help users slow down, name what they are feeling, and hear their thoughts from another angle.

If someone is in danger, may hurt themselves, or needs urgent help, they should contact emergency services or reach out to a trusted person or qualified professional. The app is meant to support reflection, not replace human care.
