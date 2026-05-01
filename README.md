# vent.ai

Same thought, different lens.

vent.ai is a journaling-based web app for writing what is on your mind and hearing it reflected through five distinct AI personalities; it is not therapy, diagnosis, crisis support, or professional care.

> Screenshot / GIF placeholder: add a home-page capture here after connecting env vars and running the full saved-session flow.

## What It Does

- Large, distraction-free vent input with calm, editorial UI.
- Five response personalities: Cotton, Aristotle, Venerable Ming, Angel, and Auntie Zhang.
- One vent can be viewed through multiple lenses without retyping.
- Streaming AI responses through a single provider boundary in `lib/ai.ts`.
- Supabase magic-link auth with saved sessions and profile defaults.
- Auto-generated session titles after save.
- Session history and detail pages with cached per-personality responses.
- Quiet global disclaimer on every page.

## Tech Stack

- Next.js 16 App Router: current stable Next line, still compatible with the requested Next 14+ App Router architecture.
- TypeScript: strict typing for product primitives, API contracts, and page data.
- Tailwind CSS: fast custom visual system without a heavy component template feel.
- shadcn-style primitives: local Radix Slot button primitive and `components.json` aliases for future shadcn additions.
- Framer Motion: subtle response entrances and quote transitions.
- Zustand: active personality, current session, and response cache.
- Supabase: magic-link auth, Postgres persistence, and RLS.
- Groq SDK: streaming Llama 3.3 70B responses behind `lib/ai.ts`.
- Vercel: zero-cost deployment target for the Next app.

## Architecture

The user writes a vent on `/`, chooses a personality, and sends it to `/api/chat`.

`/api/chat` validates the request, loads the selected system prompt from `lib/personalities.ts`, streams a Groq response, and saves the session/response when a Supabase user is present. If the request is anonymous, the stream still works, but nothing is saved.

Saved sessions live in `sessions`; generated personality replies live in `responses`. The client caches generated replies immediately, so switching tabs is instant and does not refetch existing responses.

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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is reserved for future server-only admin tasks. The MVP writes through the authenticated Supabase server client and RLS.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Enable email magic links in Auth settings.
5. Add `http://localhost:3000/auth/callback` to local redirect URLs.
6. Add your deployed Vercel callback URL before production testing.

## Deployment

Deploy to Vercel and set the same environment variables in the project dashboard.

Use `NEXT_PUBLIC_APP_URL` for the deployed origin, for example:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Then add:

```text
https://your-app.vercel.app/auth/callback
```

to Supabase Auth redirect URLs.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Future Improvements

- Voice input through Whisper.
- Text-to-speech with distinct voices per personality.
- Mood timeline and sentiment charting.
- Pattern detection with embeddings and pgvector.
- Markdown export for saved sessions.
- Anonymous demo mode with no persistence.
- Weekly reflection summaries.

## Responsible AI

vent.ai is designed as a reflective journaling interface. It should never present itself as treatment, diagnosis, crisis care, or a replacement for trusted people and emergency services. The global prompt rules in `lib/personalities.ts` apply to every personality, including the firmer Auntie Zhang mode.

