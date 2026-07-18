# hear me out

> Same thought. Different lens.

**hear me out** is a private, session-only space to put a thought into words and see it reflected through a voice that fits the moment. Choose a personality yourself, or let the app suggest a lens for your first message.

There are no accounts and no durable chat history. Your conversation stays in the browser for the current visit and disappears when the page is refreshed or closed.

## What it does

- Reflects messages through five distinct personalities: Cotton, Aristotle, Venerable Ming, Angel, and Auntie Zhang.
- Streams replies as they arrive from Groq.
- Keeps the current visit as a scrollable chat transcript, while retaining only a compact working context for longer conversations.
- Offers a first-message personality suggestion without taking control away from the user.
- Uses safety-aware routing to soften the response when a message signals elevated distress.
- Works without sign-up, profiles, or persisted conversation storage.

## Built with

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Zustand for the in-browser session
- Groq for AI generation
- Upstash Redis and Ratelimit for optional rate limiting and worker-backed inference
- Framer Motion for UI transitions

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`GROQ_API_KEY` is optional locally. Without it, the app serves mock replies for UI development.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Production | Enables real AI replies from Groq. |
| `UPSTASH_REDIS_REST_URL` | Optional | Enables Upstash-backed rate limiting and is required for worker mode. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Enables Upstash-backed rate limiting and is required for worker mode. |
| `INFERENCE_USE_WORKER` | Optional | Set to `true` only when a separate inference worker is deployed. Defaults to direct streaming. |
| `INFERENCE_MAX_QUEUE_MS` | Optional | Maximum time a job may wait in the worker queue. |
| `INFERENCE_MAX_EXECUTION_MS` | Optional | Maximum worker execution time for a reply. |
| `INFERENCE_MAX_SSE_WAIT_MS` | Optional | Maximum browser wait for a worker event stream. |
| `INFERENCE_MAX_STALL_MS` | Optional | Maximum allowed idle time for a running job. |
| `INFERENCE_WORKER_LEASE_MS` | Optional | Worker job-claim lease duration. |

### Vercel deployment

For a standard Vercel deployment, add `GROQ_API_KEY` in the project environment variables and leave `INFERENCE_USE_WORKER` unset or `false`. The app streams directly from Groq. Add the Upstash variables only if you also want rate limiting.

Do **not** set `INFERENCE_USE_WORKER=true` on Vercel alone. Worker mode needs a separate host capable of running a persistent Node process:

```bash
npm run worker
```

That worker needs `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` in its own environment. See [the architecture notes](docs/architecture.md) for the queue and SSE lifecycle.

## Useful commands

```bash
npm run dev        # local development server
npm run worker     # optional persistent inference worker
npm run lint       # lint the project
npm run typecheck  # run TypeScript checks
npm test           # run the test suite
npm run build      # create a production build
```

## Privacy and safety

hear me out is designed for reflection, not treatment or crisis care. It does not diagnose, provide clinical advice, or replace trusted people, professional care, or emergency services.

The active chat transcript lives only in browser memory. When optional worker mode is enabled, Redis stores queued requests and streamed events temporarily with a rolling 15-minute TTL; it is not a durable conversation archive.
