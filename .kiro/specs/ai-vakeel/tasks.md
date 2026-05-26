# Implementation Plan: AI Vakeel

## Overview

This plan implements the AI Vakeel agent swarm system — a sequential pipeline of five specialized agents (Arzdar, Vivechak, Shodhak, Munshi, Nyayadoot) that generates Indian legal complaint documents. The implementation uses Next.js App Router, TypeScript, Tailwind CSS, OpenRouter API, Supabase pgvector, and SSE streaming. Tasks are ordered to build foundational infrastructure first, then agents, then orchestration, then UI, with tests integrated alongside each component.

## Tasks

- [x] 1. Set up project structure, configuration, and core interfaces
  - [x] 1.1 Initialize project structure and environment configuration
    - Create directory structure: `lib/`, `lib/agents/`, `lib/schemas/`, `components/`, `app/api/`
    - Create `lib/config.ts` with `AppConfig` interface and environment variable loading (OPENROUTER_API_KEY, OPENROUTER_MODEL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
    - Create `.env.local.example` with all required environment variables
    - Install dependencies: `zod`, `@supabase/supabase-js`, `fast-check` (dev)
    - _Requirements: 11.1, 12.1_

  - [x] 1.2 Define core TypeScript types and base agent interface
    - Create `lib/agents/base-agent.ts` with `AgentName`, `AgentStatus`, `AgentExecutionResult<T>`, and `BaseAgent<TInput, TOutput>` interfaces
    - Create `lib/types.ts` with shared types: `LegalDomain`, `PipelineEvent`, `Session`
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Create Zod validation schemas for all agent outputs
    - Create `lib/schemas/arzdar-schema.ts` with `ArzdarOutputSchema`
    - Create `lib/schemas/vivechak-schema.ts` with `VivechakOutputSchema`
    - Create `lib/schemas/shodhak-schema.ts` with `ShodhakOutputSchema`
    - Create `lib/schemas/munshi-schema.ts` with `MunshiOutputSchema`
    - Create `lib/schemas/nyayadoot-schema.ts` with `NyayadootOutputSchema`
    - Each schema must enforce all constraints from the design (e.g., confidence 0-1, quality score 0-100, max 3 follow-up questions, max 10 issues)
    - _Requirements: 6.2, 1.5, 2.1, 5.2, 5.5_

- [x] 2. Implement OpenRouter client with retry logic
  - [x] 2.1 Implement OpenRouter HTTP client
    - Create `lib/openrouter-client.ts` with `OpenRouterClient` class
    - Implement `chatCompletion` method sending structured chat messages to OpenRouter API
    - Enforce 4096 max input tokens and 4096 max output tokens
    - Implement 60-second timeout per request
    - Implement exponential backoff retry: max 2 retries, 1s initial delay doubling each retry for 5xx/timeout
    - Implement no-retry for 4xx errors (except 429)
    - Implement rate-limit handling: wait min(retry-after, 30s) for 429 responses
    - Return typed `OpenRouterError` on failure with attempts count
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 2.2 Write property tests for OpenRouter retry behavior
    - **Property 18: OpenRouter retry behavior for server errors** — verify max 3 total attempts with exponential backoff for 5xx/timeout
    - **Property 19: OpenRouter no-retry for client errors** — verify exactly 1 attempt for 4xx (non-429)
    - **Property 20: OpenRouter rate limit wait capped at 30 seconds** — verify wait is min(retry-after, 30s)
    - **Validates: Requirements 11.3, 11.4, 11.7**

- [x] 3. Implement Knowledge Base client
  - [x] 3.1 Implement Supabase vector search client
    - Create `lib/knowledge-base.ts` with `KnowledgeBaseClient` class
    - Implement `search` method calling `match_legal_chunks` Supabase RPC function
    - Implement `generateEmbedding` method for query text embedding generation
    - Return results sorted by cosine similarity descending, max 20 chunks
    - Implement status distinction: `success`, `no_matches`, `search_error`
    - Implement retry logic: 2 additional retries on failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 3.2 Write property tests for Knowledge Base search
    - **Property 21: Knowledge Base search result bounds and sorting** — verify max 20 results sorted by similarity descending
    - **Property 22: Knowledge Base error status distinction** — verify correct status for no results vs search error
    - **Validates: Requirements 12.2, 12.5**

- [x] 4. Implement Arzdar (Intake Agent)
  - [x] 4.1 Implement Arzdar agent
    - Create `lib/agents/arzdar.ts` implementing `BaseAgent<ArzdarInput, ArzdarOutput>`
    - Implement input validation: reject descriptions < 50 or > 5000 characters
    - Implement system prompt for fact extraction (complainant, respondent, dates, grievance, relief, language detection)
    - Implement follow-up question generation (max 3) when essential facts are missing
    - Implement `validateOutput` using `ArzdarOutputSchema`
    - Mark missing fields as "not provided" after follow-up exhaustion
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 4.2 Write property tests for Arzdar
    - **Property 1: Arzdar output schema completeness** — verify all required fields present with valid values or "not provided"
    - **Property 2: Follow-up question bound** — verify max 3 follow-up questions
    - **Property 3: Input length validation** — verify rejection outside 50-5000 chars, acceptance within range
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6**

- [x] 5. Implement Vivechak (Router Agent)
  - [x] 5.1 Implement Vivechak agent
    - Create `lib/agents/vivechak.ts` implementing `BaseAgent<VivechakInput, VivechakOutput>`
    - Implement system prompt for legal domain classification and forum selection
    - Implement forum selection logic: Consumer Protection (District/State/National by compensation), RERA (state authority), RTI (PIO)
    - Implement confidence score output (0.0-1.0) and `requiresUserConfirmation` flag when confidence < 0.5
    - Implement `validateOutput` using `VivechakOutputSchema`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 5.2 Write property tests for Vivechak
    - **Property 4: Domain classification output invariants** — verify exactly one domain and confidence in [0, 1]
    - **Property 5: Consumer Protection forum selection by compensation value** — verify correct forum by amount
    - **Property 6: Confidence threshold determines user confirmation** — verify requiresUserConfirmation iff confidence < 0.5
    - **Validates: Requirements 2.1, 2.2, 2.5, 2.6**

- [x] 6. Implement Shodhak (Research Agent)
  - [x] 6.1 Implement Shodhak agent
    - Create `lib/agents/shodhak.ts` implementing `BaseAgent<ShodhakInput, ShodhakOutput>`
    - Implement system prompt for legal section ranking and filtering
    - Implement adaptive threshold: start at 0.7, decrement by 0.05 until 3+ results or threshold reaches 0.5
    - Enforce 3-10 result range, sorted by similarity descending
    - Integrate with `KnowledgeBaseClient` for vector search
    - Implement `validateOutput` using `ShodhakOutputSchema`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.2 Write property tests for Shodhak
    - **Property 7: Shodhak result count bounds and threshold adaptation** — verify 3-10 results with threshold never below 0.5
    - **Property 8: Legal sections sorted by similarity descending** — verify non-increasing similarity order
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 7. Checkpoint - Core agents complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Munshi (Draft Agent)
  - [x] 8.1 Implement Munshi agent
    - Create `lib/agents/munshi.ts` implementing `BaseAgent<MunshiInput, MunshiOutput>`
    - Implement system prompt for complaint document generation in markdown
    - Implement domain-specific formatting: Consumer Protection (CDRC format), RERA (Authority format), RTI (PIO application format)
    - Implement Hindi prayer clause generation when `originalLanguage === 'hi'`
    - Halt with error if Shodhak output is missing or contains no legal sections
    - Implement `validateOutput` using `MunshiOutputSchema`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 8.2 Write property tests for Munshi
    - **Property 9: Munshi document contains all input facts** — verify complainant, respondent, forum, and legal section references present
    - **Property 10: Munshi document structural completeness** — verify all required sections are non-empty strings
    - **Property 11: Hindi input produces Hindi prayer clause** — verify hindiPrayerClause present iff originalLanguage is 'hi'
    - **Validates: Requirements 4.2, 4.3, 4.8**

- [x] 9. Implement Nyayadoot (Review Agent)
  - [x] 9.1 Implement Nyayadoot agent
    - Create `lib/agents/nyayadoot.ts` implementing `BaseAgent<NyayadootInput, NyayadootOutput>`
    - Implement system prompt for document review against domain-specific checklist
    - Implement quality scoring (0-100) across four categories: completeness, legal reference validity, formatting compliance, factual consistency
    - Implement approval logic: score ≥ 70 → approved with empty issues; score < 70 → needs_revision with 1-10 issues
    - Implement `validateOutput` using `NyayadootOutputSchema`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 9.2 Write property tests for Nyayadoot
    - **Property 12: Quality score bounds and approval status consistency** — verify score in [0,100], approved iff ≥70 with empty issues, needs_revision iff <70 with 1-10 issues
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 10. Implement Pipeline Orchestrator and SSE streaming
  - [x] 10.1 Implement SSE emitter
    - Create `lib/sse-emitter.ts` with `SSEEmitter` class using `TransformStream` and `TextEncoder`
    - Implement `emit(event: PipelineEvent)` formatting events as SSE data lines
    - Implement `close()` and `isConnected()` methods
    - Enforce 200-character limit on summary field
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 10.2 Implement Pipeline Orchestrator
    - Create `lib/orchestrator.ts` with `PipelineOrchestrator` class
    - Implement sequential agent execution: Arzdar → Vivechak → Shodhak → Munshi → Nyayadoot
    - Implement inter-agent JSON schema validation (reject invalid output, re-prompt once)
    - Implement timing recording for each agent (startMs, endMs, durationMs)
    - Implement 5-minute total pipeline timeout
    - Emit SSE events for each agent status change (Waiting → Running → Done/Error)
    - Integrate with `SessionManager` for persistence at each step
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 10.3 Write property tests for Pipeline Orchestrator and SSE
    - **Property 13: Pipeline agent execution order** — verify timing shows strict sequential order
    - **Property 14: Inter-agent schema validation catches invalid output** — verify invalid output is rejected
    - **Property 15: SSE event summary length bound** — verify summary ≤ 200 characters
    - **Validates: Requirements 6.1, 6.2, 6.4, 7.3**

- [x] 11. Implement Session Manager
  - [x] 11.1 Implement Session Manager
    - Create `lib/session-manager.ts` with `SessionManager` class
    - Implement `create`: insert session with UUID, ISO 8601 timestamp, status "in_progress", problem description
    - Implement `updateAgentOutput`: append agent output to session JSONB
    - Implement `markComplete` and `markFailed` status transitions
    - Implement `getById` and `list` (paginated, sorted by createdAt DESC, max 20 per page)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.2 Write property tests for Session Manager pagination
    - **Property 17: Session list pagination bound** — verify max 20 sessions per page sorted by createdAt descending
    - **Validates: Requirements 10.4, 10.6**

- [x] 12. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement API route handlers
  - [x] 13.1 Implement pipeline and streaming API routes
    - Create `app/api/pipeline/route.ts` (POST): validate input length (50-5000), create session, start orchestrator, return session ID
    - Create `app/api/pipeline/stream/route.ts` (GET): establish SSE connection for given session ID, stream PipelineEvents
    - _Requirements: 1.6, 6.1, 7.1, 7.4_

  - [x] 13.2 Implement session and export API routes
    - Create `app/api/sessions/route.ts` (GET): list sessions with pagination (page, pageSize query params)
    - Create `app/api/sessions/[id]/route.ts` (GET): return single session with all agent outputs
    - Create `app/api/export/route.ts` (POST): generate PDF from final document, return file buffer; fallback to plain text on failure
    - _Requirements: 9.2, 9.4, 10.4, 10.5_

- [x] 14. Implement UI components
  - [x] 14.1 Implement problem input and agent pipeline UI
    - Create `components/ProblemInput.tsx`: textarea with character count (50-5000), submit button, validation message
    - Create `components/AgentPipeline.tsx`: container rendering 5 agent cards in pipeline order
    - Create `components/AgentCard.tsx`: agent name, status indicator (Waiting/Running/Done/Error), collapsible output section (collapsed by default), 200-char summary when Done, error display when Error
    - _Requirements: 1.6, 7.1, 8.1, 8.2, 8.3, 8.5_

  - [x] 14.2 Implement document viewer and export UI
    - Create `components/DocumentViewer.tsx`: render final complaint as formatted text with headings, paragraphs, legal references
    - Create `components/QualityBadge.tsx`: numerical badge (0-100) with color coding (green ≥70, yellow 50-69, red <50)
    - Create `components/ExportButtons.tsx`: download PDF button, copy-to-clipboard button with 3-second confirmation
    - _Requirements: 8.4, 9.1, 9.2, 9.3, 9.5_

  - [ ]* 14.3 Write property test for quality score color mapping
    - **Property 16: Quality score color mapping** — verify green if ≥70, yellow if 50-69, red if <50
    - **Validates: Requirements 9.5**

  - [x] 14.4 Implement session history UI
    - Create `components/SessionHistory.tsx`: paginated list (max 20 per page), sorted by most recent, showing timestamp, status, 150-char case summary
    - Create `components/SessionDetail.tsx`: full session replay with agent cards and final document
    - Implement pagination controls
    - _Requirements: 10.4, 10.5, 10.6_

- [x] 15. Implement page layouts and SSE client integration
  - [x] 15.1 Wire pages and SSE client
    - Create `app/page.tsx`: main page with ProblemInput, AgentPipeline, DocumentViewer
    - Create `app/sessions/page.tsx`: session history page
    - Create `app/sessions/[id]/page.tsx`: session detail page
    - Implement EventSource client hook for SSE connection management
    - Connect SSE events to agent card status updates in real-time
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 10.4, 10.5_

- [x] 16. Implement Supabase database schema
  - [x] 16.1 Create Supabase migration for sessions and legal_chunks tables
    - Create SQL migration file with `sessions` table (id, created_at, status, problem_description, original_language, agent_outputs, error, timing, final_document, quality_score)
    - Create `legal_chunks` table with pgvector extension (id, content, embedding vector(1536), act_name, section_number, chapter, token_count)
    - Create `match_legal_chunks` RPC function for vector similarity search
    - Create indexes: sessions(created_at DESC), sessions(status), legal_chunks embedding ivfflat, legal_chunks(act_name)
    - _Requirements: 10.1, 12.1, 12.2, 12.3_

- [x] 17. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- All agents share the same OpenRouter client instance for centralized retry/rate-limit handling
- The Supabase migration (task 16.1) can be run in parallel with UI work since it's infrastructure setup

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "16.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2", "8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.1", "11.1"] },
    { "id": 9, "tasks": ["10.2", "11.2"] },
    { "id": 10, "tasks": ["10.3", "13.1", "13.2"] },
    { "id": 11, "tasks": ["14.1", "14.2", "14.4"] },
    { "id": 12, "tasks": ["14.3", "15.1"] }
  ]
}
```
