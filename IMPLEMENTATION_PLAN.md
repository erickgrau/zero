# Zero Email - Implementation Plan

## Project Overview

Zero is an open-source AI-powered email client that serves as a Gmail/Outlook alternative with self-hosting capabilities. It's built as a pnpm monorepo using modern TypeScript with the following architecture:

- **Frontend** (`apps/mail/`): React Router v7 + Vite, deployed on Cloudflare Workers
- **Backend** (`apps/server/`): Hono framework on Cloudflare Workers with Durable Objects
- **Database**: PostgreSQL (via Drizzle ORM) for persistent data + SQLite (in Durable Objects) for per-user email thread caching
- **Real-time**: Cloudflare Durable Objects (`ZeroAgent`) with WebSocket connections
- **AI**: Multi-provider AI (OpenAI, Anthropic, Google, Groq, Perplexity) via Vercel AI SDK
- **Auth**: Better Auth with Google/Microsoft OAuth

---

## Architecture Summary

### Backend (`apps/server/src/`)

| Component | Location | Purpose |
|---|---|---|
| **Hono App** | `main.ts` | Main HTTP server, middleware, routes, Durable Object exports |
| **tRPC Router** | `trpc/` | Type-safe API layer with 15 routers (mail, ai, brain, labels, settings, etc.) |
| **Email Drivers** | `lib/driver/` | `GoogleMailManager` and `MicrosoftMailManager` implementing `MailManager` interface |
| **ZeroAgent** | `routes/agent/index.ts` | Durable Object handling AI chat, email sync, WebSocket connections, tool execution |
| **ZeroDriver** | `routes/agent/index.ts` | Durable Object for per-connection email caching in SQLite |
| **ShardRegistry** | `routes/agent/index.ts` | Durable Object for managing driver shards |
| **ZeroDB** | `main.ts` | Durable Object wrapping PostgreSQL for RPC access |
| **MCP Server** | `routes/agent/mcp.ts` | Model Context Protocol server for external AI tool integration |
| **Sync Workflows** | `workflows/` | Cloudflare Workflows for background thread syncing |
| **Brain** | `lib/brain.ts` | AI-powered email categorization/labeling system |
| **Writing Style** | `services/writing-style-service.ts` | Learns user writing patterns for AI-composed emails |
| **DB Schema** | `db/schema.ts` | PostgreSQL schema: users, sessions, accounts, connections, notes, labels, templates, OAuth |
| **Agent DB** | `routes/agent/db/schema.ts` | SQLite schema: threads, labels, threadLabels (per-user cache) |

### Frontend (`apps/mail/`)

| Component | Location | Purpose |
|---|---|---|
| **Routes** | `app/routes.ts` | React Router config: mail, settings, auth, static pages |
| **Mail Components** | `components/mail/` | Thread list, thread display, reply composer, mail navigation |
| **Settings** | `components/settings/` | User preferences, connections, appearance, labels, shortcuts |
| **Create/Compose** | `components/create/` | Email composition with TipTap rich text editor |
| **AI Chat** | `components/` | AI-powered chat interface for email assistance |
| **State Management** | `store/` | Jotai atoms for draft state, background queue, optimistic updates |
| **Hooks** | `hooks/` | 30+ React hooks for threads, labels, drafts, settings, connections, etc. |
| **tRPC Client** | `lib/trpc.ts` | Type-safe API client connecting to backend |
| **i18n** | `messages/` | Internationalization with Paraglide |

---

## Identified Areas for Improvement

### 1. Testing Infrastructure (High Priority)

**Current State**: The `packages/testing/` directory exists but appears minimal. There is an `eval` system for AI testing, but no comprehensive unit/integration test suite.

**Plan**:
- Add unit tests for critical backend services: email drivers (`lib/driver/google.ts`, `lib/driver/microsoft.ts`), brain categorization (`lib/brain.ts`), email utilities (`lib/email-utils.ts`)
- Add unit tests for tRPC route handlers in `trpc/routes/`
- Add component tests for key frontend components: `mail-list.tsx`, `thread-display.tsx`, `reply-composer.tsx`
- Add integration tests for the ZeroAgent Durable Object WebSocket protocol
- Add E2E tests for core user flows: login, view inbox, read thread, compose/send email
- Set up CI test pipeline in GitHub Actions

### 2. Microsoft Outlook Integration Completion (High Priority)

**Current State**: `lib/driver/microsoft.ts` exists but may have incomplete feature parity with the Google driver.

**Plan**:
- Audit `MicrosoftMailManager` against the `MailManager` interface for completeness
- Ensure all methods (labels, drafts, attachments, history sync) work correctly
- Add Microsoft OAuth connection flow to the frontend settings
- Test the full sync workflow with Microsoft accounts
- Ensure the brain/AI features work with Microsoft-formatted emails

### 3. Error Handling & Resilience (High Priority)

**Current State**: Some error handling exists (e.g., `withErrorHandler` in Google driver, `FatalErrors` utilities) but could be more systematic.

**Plan**:
- Implement consistent error handling across all tRPC routes with proper error codes
- Add retry logic with exponential backoff for external API calls (Gmail, Microsoft Graph)
- Improve the `gmail-rate-limit.ts` handling to gracefully degrade under load
- Add circuit breaker patterns for external service dependencies
- Implement proper error boundaries in the React frontend
- Add structured logging via the existing `logging-service.ts`

### 4. Email Sync Reliability (High Priority)

**Current State**: Sync uses Cloudflare Workflows (`sync-threads-workflow.ts`, `sync-threads-coordinator-workflow.ts`) with configurable `THREAD_SYNC_MAX_COUNT` and `THREAD_SYNC_LOOP`. The Durable Object `ZeroDriver` caches threads in SQLite.

**Plan**:
- Add conflict resolution for concurrent sync operations
- Implement incremental sync using Gmail's `history.list` API more robustly
- Add sync status tracking visible to users (progress indicators)
- Handle edge cases: deleted threads, label changes during sync, large mailbox initial sync
- Add health checks and monitoring for sync workflows
- Implement sync error recovery without full re-sync

### 5. Security Hardening (High Priority)

**Current State**: Auth via Better Auth with Google OAuth. Token refresh exists. Some rate limiting via Upstash Redis.

**Plan**:
- Audit all endpoints for proper authentication checks (middleware in `main.ts` needs review)
- Ensure refresh tokens are encrypted at rest in the database
- Add CSRF protection for state-changing operations
- Implement rate limiting on AI endpoints to prevent abuse
- Add Content Security Policy headers
- Review the OAuth scope requests for minimal privilege
- Validate all user inputs at the tRPC layer with Zod schemas (partially done)
- Add security headers to Cloudflare Worker responses

### 6. Performance Optimization (Medium Priority)

**Current State**: Uses React Query for caching, Cloudflare R2 for blob storage, Durable Objects for per-user state, and Hyperdrive for DB connection pooling.

**Plan**:
- Implement virtual scrolling for large thread lists (already using `virtua` library - verify it's properly configured)
- Add pagination for large mailboxes in the thread list
- Optimize the thread display rendering for emails with large HTML content
- Implement lazy loading for email attachments
- Add service worker caching for static assets and frequently accessed data
- Profile and optimize the AI chat streaming response path
- Add database query optimization (review Drizzle ORM queries for N+1 issues)

### 7. AI Features Enhancement (Medium Priority)

**Current State**: AI chat via `ZeroAgent` Durable Object, brain categorization, writing style learning, MCP integration, and tool-based actions (compose, search, label management).

**Plan**:
- Improve the brain categorization accuracy with user feedback loop
- Add smart reply suggestions based on writing style matrix
- Implement email summarization for thread previews
- Add AI-powered search that understands natural language queries (partially done with `BuildGmailSearchQuery` tool)
- Enhance the `InboxRag` tool with better vector search using Cloudflare Vectorize
- Add user preference learning for priority inbox sorting
- Implement scheduled email intelligence (best time to send)

### 8. Self-Hosting Experience (Medium Priority)

**Current State**: Docker Compose for PostgreSQL. Cloudflare Workers for deployment. Documentation exists but is focused on cloud deployment.

**Plan**:
- Create a comprehensive `docker-compose.prod.yaml` that includes all services (already exists, needs review)
- Add non-Cloudflare deployment options (Node.js standalone, Docker container)
- Create migration scripts for switching between deployment targets
- Document environment variable configuration more completely
- Add health check endpoints for monitoring
- Create Helm charts for Kubernetes deployment

### 9. Offline Support & PWA (Medium Priority)

**Current State**: No offline support. Uses `idb-keyval` for some client-side storage.

**Plan**:
- Implement service worker for offline access to cached emails
- Add IndexedDB storage for recent threads and drafts
- Implement background sync for draft saves and read status updates
- Add offline compose capability with queue for sending when online
- Create PWA manifest for installable desktop/mobile experience

### 10. Accessibility & i18n Completion (Medium Priority)

**Current State**: i18n infrastructure with Paraglide and Crowdin. English strings in `messages/en.json`. Multiple language files exist.

**Plan**:
- Audit all components for ARIA labels and keyboard navigation
- Ensure screen reader compatibility for the mail list and thread display
- Complete translation coverage for all user-facing strings
- Add RTL layout support for Arabic/Hebrew languages
- Implement high contrast mode alongside existing theme system
- Add focus management for modal dialogs and navigation

### 11. Developer Experience (Low Priority)

**Current State**: Turborepo for builds, ESLint + Oxlint + Prettier for code quality, Husky for git hooks, `nizzy` CLI for env management.

**Plan**:
- Add proper TypeScript strict mode enforcement (noted in CONTRIBUTING.md as future goal)
- Eliminate `any` types (noted in CONTRIBUTING.md)
- Add API documentation generation from tRPC router types
- Create a developer onboarding guide with architecture diagrams
- Add Storybook for UI component development and documentation
- Improve build times with better Turborepo caching configuration

### 12. Call/Voice Integration (Low Priority)

**Current State**: ElevenLabs integration exists (`services/call-service`, `voice-button.tsx`), with `DISABLE_CALLS` env flag.

**Plan**:
- Complete the voice-to-email transcription flow
- Add voice command support for email actions
- Implement call recording and summary generation
- Add voice reply to emails functionality

---

## Implementation Priority Order

| Phase | Focus | Items | Rationale |
|---|---|---|---|
| **Phase 1** | Stability & Security | Testing (#1), Error Handling (#3), Security (#5) | Foundation for all other work |
| **Phase 2** | Core Functionality | Email Sync (#4), Microsoft Integration (#2) | Complete the core email experience |
| **Phase 3** | User Experience | Performance (#6), AI Enhancement (#7), Accessibility (#10) | Polish the user-facing experience |
| **Phase 4** | Platform Growth | Self-Hosting (#8), Offline/PWA (#9), DX (#11), Voice (#12) | Expand the platform's reach |

---

## Key Technical Decisions to Consider

1. **Cloudflare Workers Dependency**: The current architecture is deeply tied to Cloudflare (Durable Objects, R2, KV, Queues, Workflows, Vectorize, Hyperdrive). Self-hosting would require abstraction layers or alternative implementations.

2. **Database Strategy**: The dual-database approach (PostgreSQL for persistent data, SQLite in Durable Objects for per-user cache) is clever for performance but adds complexity. Consider whether the tradeoff is worth it as the codebase grows.

3. **AI Provider Strategy**: Supporting 4+ AI providers gives flexibility but adds maintenance burden. Consider standardizing on fewer providers or making the provider selection more dynamic.

4. **Real-time Architecture**: The WebSocket connection via Durable Objects is effective but complex. Consider whether Server-Sent Events could simplify some use cases.

5. **State Management**: The mix of React Query (server state), Jotai (client state), and URL search params (nuqs) works but could benefit from clearer conventions about when to use each.

---

## File Reference Map

```
zero/
├── apps/
│   ├── mail/                    # Frontend (React Router + Vite + Cloudflare Workers)
│   │   ├── app/                 # Routes and entry points
│   │   │   ├── routes.ts        # Route configuration
│   │   │   ├── root.tsx         # App shell
│   │   │   └── (routes)/        # Authenticated routes (mail, settings, developer)
│   │   ├── components/          # UI components
│   │   │   ├── mail/            # Core email UI (list, display, compose)
│   │   │   ├── settings/        # Settings pages
│   │   │   ├── create/          # Email composition
│   │   │   └── ui/              # Shared UI primitives (Shadcn)
│   │   ├── hooks/               # React hooks (30+ custom hooks)
│   │   ├── store/               # Jotai atoms and state management
│   │   ├── lib/                 # Utilities, tRPC client, auth
│   │   └── messages/            # i18n translation files
│   │
│   └── server/                  # Backend (Hono + Cloudflare Workers)
│       └── src/
│           ├── main.ts          # Entry point, Hono app, Durable Objects
│           ├── env.ts           # Environment type definitions
│           ├── ctx.ts           # Hono context types
│           ├── types.ts         # Shared type definitions
│           ├── routes/
│           │   ├── agent/       # ZeroAgent Durable Object (AI, sync, WebSocket)
│           │   ├── ai.ts        # AI chat HTTP routes
│           │   ├── auth.ts      # Authentication routes
│           │   └── chat.ts      # Chat-related routes
│           ├── trpc/            # tRPC routers (15 domains)
│           ├── lib/
│           │   ├── driver/      # Email provider drivers (Google, Microsoft)
│           │   ├── auth.ts      # Better Auth configuration
│           │   ├── brain.ts     # AI email categorization
│           │   └── ...          # Utilities, prompts, schemas
│           ├── db/
│           │   ├── schema.ts    # PostgreSQL schema (Drizzle)
│           │   └── migrations/  # Database migrations
│           ├── services/        # Business logic services
│           └── workflows/       # Cloudflare Workflow definitions
│
├── packages/
│   ├── cli/                     # `nizzy` CLI tool
│   ├── testing/                 # Test utilities
│   ├── eslint-config/           # Shared ESLint config
│   └── tsconfig/                # Shared TypeScript config
│
├── docker/                      # Docker configurations
├── scripts/                     # Utility scripts
└── patches/                     # Package patches
```

---

*Plan created: 2026-03-08*
