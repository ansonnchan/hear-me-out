# Architecture

vent.ai is an ephemeral reflection application. The browser owns the active conversation, while Redis holds only short-lived inference jobs and event streams when worker mode is configured. The application has no accounts or durable conversation archive.

## System boundaries

```text
React UI + Zustand
   |              ^
   | POST job     | SSE metadata and tokens
   v              |
Next.js API routes ----------------> rate limiter
   |              ^
   | enqueue      | replay events by stream ID
   v              |
Redis job hash + queue stream + per-job event stream
   |              ^
   | claim        | publish
   v              |
inference worker process
   |
   v
chat application service
   |         |          |
   v         v          v
conversation domain   safety/persona policies   prompt builder
        \                 |                    /
         +----------- AIProvider -------------+
                         |
                         v
                    Groq adapter
```

The API owns HTTP validation, rate limiting, idempotent job creation, SSE delivery, and cancellation requests. It does not execute chat generation when Redis is configured.

The separately runnable worker claims jobs through a Redis Stream consumer group. It invokes the same application service introduced in Phase 1, publishes response metadata before token events, and records a terminal job result before acknowledging the queue entry.

The application service owns compression policy, safety and persona routing, and provider-neutral prompt preparation. `AIProvider` keeps Groq-specific request, stream, and cancellation behavior inside the adapter.

## Worker request lifecycle

```text
Browser POST /api/chat with Idempotency-Key
  -> API validates and rate-limits the bounded conversation snapshot
  -> atomic Redis script creates a queued job or returns the existing job
  <- 202 { jobId, requestId, eventsUrl }

Browser GET eventsUrl using EventSource
  -> SSE route reads events after Last-Event-ID
  -> worker claims queued job and marks it running
  -> application service compresses context and applies safety/persona routing
  -> worker publishes metadata, then ordered token events
  -> SSE route forwards replayable events to the browser
  -> worker atomically marks completed or failed and acknowledges the queue entry
  -> browser adds the completed assistant turn to Zustand
```

Native `EventSource` reconnects automatically and sends its last received event ID. The SSE route uses that ID as an exclusive Redis Stream cursor, preventing already-rendered tokens from being replayed.

When Redis is not configured, `/api/chat` retains the Phase 1 direct streaming path. When Groq is also absent, that path streams a local mock response. This fallback is intended for credential-free UI development, not as the worker deployment mode.

## Redis data model

- `vent-ai:inference:queue`: global queue stream containing job and correlation IDs, not vent text. It is capped to a bounded length.
- `vent-ai:inference:job:{jobId}`: job status, request ID, and validated command payload.
- `vent-ai:inference:job:{jobId}:events`: ordered metadata, token, and terminal events.
- `vent-ai:inference:idempotency:{key}`: maps a browser attempt to its existing job.

Job hashes, event streams, and idempotency keys use a rolling 15-minute TTL. Queue entries contain no conversation payload. There is no durable message or response history.

## Job lifecycle

```text
queued -> running -> completed
                  -> failed
queued  -> cancelled
running -> cancelled
```

Lifecycle transitions and their terminal events are atomic. Cancellation immediately creates a replayable `cancelled` event. The worker watches cancellation while preparing and streaming, then aborts the provider stream where supported.

## Dependency rules

- API routes and the worker depend on `InferenceJobStore`; only the Redis adapter issues Redis commands.
- The worker depends on the chat application service and `AIProvider`, not Next.js routes.
- Application services may depend on domain policies and provider interfaces, not HTTP, Redis, React, or provider SDKs.
- Domain modules remain independent of infrastructure and presentation state.
- Zustand owns the active presentation session; the domain module supplies its shared conversation types.

## Local and deployment constraints

- Worker mode requires Upstash Redis credentials in both the API and worker environments.
- `npm run dev` and `npm run worker` must run as separate processes.
- Upstash uses an HTTP client and does not support a permanently blocking stream read, so the worker and SSE route use bounded polling.
- If Redis is configured but no worker is running, jobs remain queued until their short TTL expires.
- A worker process must run on a host that supports a long-running Node.js process; a serverless Next.js deployment alone is insufficient.

## Current limitations

- Jobs claimed by a worker that crashes remain pending in the Redis consumer group; stale pending-job recovery is deferred.
- Cancellation is checked through polling, so provider abortion is prompt but not instantaneous.
- The optional `/api/safety` suggestion preflight remains a direct lightweight classifier request; final response safety routing runs in the worker.
- No live Redis integration suite runs without external Upstash credentials. Worker orchestration and Redis response parsing are covered locally with deterministic test doubles.
- The browser remains the source of truth for the active conversation and loses it on refresh.

## Deferred Phase 3 scope

Phase 3 should focus on stale pending-job recovery, provider/request timeouts, and a small live-Redis integration harness that runs only when credentials are supplied. It should not introduce durable conversation storage, additional services, event sourcing, CQRS, or unrelated operational infrastructure.
