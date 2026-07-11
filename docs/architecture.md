# Architecture

vent.ai is an ephemeral reflection application. The browser owns the temporary conversation, while the server validates a bounded snapshot for each inference request. No vent text is persisted.

## Phase 1 boundaries

```text
React UI + Zustand
        |
        | POST /api/chat
        v
Next.js route adapter --------> rate limiter
        |
        v
chat application service
   |         |          |
   v         v          v
conversation domain   safety/persona policies   prompt builder
        \                 |                    /
         \                v                   /
          +---------- AIProvider <------------+
                         |
                         v
                    Groq adapter
```

The route adapter owns HTTP parsing, rate-limit headers, response metadata, and bridging provider output into a `ReadableStream`. It does not decide how history is bounded or how a prompt is assembled.

The chat application service coordinates one inference use case. It decides when older turns need compression, applies persona and safety policy, and produces a provider-neutral completion request.

The conversation domain defines the temporary session snapshot: ordered messages and optional compressed context. It validates and bounds client-provided state before application logic uses it.

`AIProvider` is the dependency boundary for text completion and streaming. Groq-specific request and response shapes stay inside the Groq adapter. Safety routing, compression, and chat generation depend on the interface rather than the SDK.

## Request lifecycle

```text
Browser submits message and bounded session snapshot
  -> route applies optional Redis rate limit
  -> command parser validates message, persona, and conversation
  -> application service optionally compresses older turns
  -> application service applies safety and persona routing
  -> prompt builder creates a provider-neutral request
  -> Groq adapter starts a streaming completion
  -> route forwards text chunks without buffering the full response
  -> browser incrementally updates Zustand
  -> completed assistant turn is added to the in-memory session
```

When `GROQ_API_KEY` is absent, the same route and metadata contract return a local streamed response. This keeps local UI development independent of provider credentials.

## Dependency rules

- API routes may depend on application services and infrastructure adapters.
- Application services may depend on domain policy and provider interfaces, not Next.js or the Groq SDK.
- Domain modules do not depend on HTTP, Redis, React, Zustand, or provider SDKs.
- Provider-specific code implements `AIProvider`; it does not leak SDK response types into the application layer.
- Zustand owns presentation state. Shared conversation types come from the domain module, but domain code never imports the store.

## Current limitations

- The browser remains the source of truth for anonymous conversation state. Refreshing or closing the tab clears it.
- Inference still executes within the `/api/chat` request lifecycle.
- Provider cancellation is not yet propagated when a browser disconnects.
- Compression and safety classification can add work before the first streamed token.
- Redis is used only for optional rate limiting.

## Deferred Phase 2 scope

Phase 2 may introduce a Redis-backed inference queue and worker behind the existing chat application and provider contracts. It should add short-lived job state, idempotent enqueueing, token delivery that supports reconnects, and cancellation where practical. It should not add persistent user history, microservices, CQRS, event sourcing, or unrelated operational infrastructure.
