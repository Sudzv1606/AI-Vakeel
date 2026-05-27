# ⚖️ AI Vakeel

**AI-powered Indian legal complaint document generator using a multi-agent swarm architecture.**

AI Vakeel uses five specialized AI agents (collectively called "Vakeel Panch") that work in sequence to intake a user's legal problem, classify it under the correct Indian law, research relevant legal sections, draft a formal complaint, and review it for quality.

> Built for the **OpenAI × Outskill Hackathon**

---

## How It Works

```
User describes problem → Query Expansion → HyDE → Hybrid Search → LLM Re-ranking
                       → Arzdar → Vivechak → Shodhak → Munshi → Nyayadoot
                       → Legal Complaint Document
```

| Agent | Role | What It Does |
|-------|------|-------------|
| **Arzdar** | Intake Agent | Extracts key facts (names, dates, grievance, relief sought) from natural language input |
| **Vivechak** | Router Agent | Classifies the case under the correct law and selects the appropriate forum |
| **Shodhak** | Research Agent | Advanced RAG pipeline: query expansion, HyDE, hybrid search, LLM re-ranking |
| **Munshi** | Draft Agent | Generates a properly formatted legal complaint document with affidavit |
| **Nyayadoot** | Review Agent | Reviews the draft for completeness and assigns a quality score |

## Supported Legal Domains

- **Consumer Protection Act, 2019** (District Forum / State Commission / National Commission)
- **RERA Act, 2016** (Real Estate Regulatory Authority)
- **RTI Act, 2005** (Right to Information)

## Features

- Multi-language input support (English and Hindi)
- Real-time agent progress streaming via SSE
- **Advanced RAG pipeline:**
  - LLM Query Expansion (reformulates into legal terminology)
  - HyDE (Hypothetical Document Embedding for better semantic matching)
  - Hybrid Search (vector similarity + full-text keyword matching)
  - LLM Re-ranking (evaluates actual relevance to the specific case)
  - Section-aware chunking with metadata-enriched embeddings
- Domain-specific complaint formatting (CDRC, RERA Authority, RTI PIO formats)
- Mandatory legal elements: affidavit, jurisdiction statement, limitation period, annexures list
- Quality scoring with 4-category evaluation (completeness, legal validity, formatting, factual consistency)
- PDF export (via browser print) and clipboard copy
- Session history with persistence
- User authentication (Supabase Auth) with Row Level Security
- Profile management (first name, last name, phone)
- Onboarding walkthrough (English, Hindi, Marathi)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Server-Sent Events (SSE) |
| LLM | OpenRouter API (configurable model) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| Testing | Vitest, fast-check (property-based testing) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
├──────────────┬──────────────────────────────────────────┤
│   Client     │           API Routes                      │
│              │                                           │
│  ProblemInput│  POST /api/pipeline (starts pipeline)     │
│  AgentCards  │  GET  /api/pipeline/stream (SSE events)   │
│  DocViewer   │  GET  /api/sessions (list)                │
│  ExportBtns  │  GET  /api/sessions/[id] (detail)        │
│              │  POST /api/export (PDF/text)              │
└──────┬───────┴──────────────┬───────────────────────────┘
       │                      │
       │ SSE Stream           │ Pipeline Orchestrator
       │                      │
       │         ┌────────────▼────────────────┐
       │         │  Arzdar → Vivechak → Shodhak │
       │         │  → Munshi → Nyayadoot        │
       │         └────────────┬────────────────┘
       │                      │
       │         ┌────────────▼────────────────┐
       │         │      External Services       │
       │         │  OpenRouter API (LLM)        │
       │         │  Supabase (pgvector + Auth)  │
       └─────────┴─────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- An OpenRouter API key

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/ai-vakeel.git
cd ai-vakeel
npm install
```

### 2. Set Up Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Supabase

Link your project and push the database schema:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This creates:
- `sessions` table (pipeline execution records)
- `legal_chunks` table (vector embeddings of legal texts)
- `profiles` table (user profiles)
- `match_legal_chunks` RPC function (vector similarity search)
- Row Level Security policies

### 4. Populate the Knowledge Base

Download the legal texts as `.txt` files and place them in the `/data/` folder:

- `data/consumer_protection_act_2019.txt`
- `data/rera_act_2016.txt`
- `data/rti_act_2005.txt`

Then run the v2 ingestion script (section-aware chunking + metadata-enriched embeddings):

```bash
npx tsx scripts/ingest-legal-texts-v2.ts
```

This:
- Splits text on legal section boundaries (not arbitrary character counts)
- Prepends "Act Name, Section X, Chapter Y:" to each chunk before embedding
- Generates embeddings via OpenRouter API
- Uploads to Supabase pgvector

### 5. Set Up Hybrid Search

Run this SQL in your Supabase Dashboard SQL Editor (Settings > SQL Editor):

```sql
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_legal_chunks_fts ON legal_chunks USING gin(fts);
```

Then create the `hybrid_search_legal_chunks` function (see `supabase/migrations/003_hybrid_search.sql`).

### 5. Enable Authentication

In your Supabase dashboard:
1. Go to Authentication > Providers
2. Enable Email provider (or Google/GitHub as needed)
3. Configure redirect URLs for your domain

### 6. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
├── app/
│   ├── page.tsx                 # Main page (input + pipeline + document)
│   ├── layout.tsx               # Root layout with metadata
│   ├── login/page.tsx           # Login page
│   ├── profile/page.tsx         # User profile page
│   ├── sessions/
│   │   ├── page.tsx             # Session history list
│   │   └── [id]/page.tsx        # Session detail view
│   └── api/
│       ├── pipeline/route.ts    # POST: start pipeline (returns SSE stream)
│       ├── pipeline/stream/     # GET: SSE stream for a session
│       ├── sessions/route.ts    # GET: list sessions
│       ├── sessions/[id]/       # GET: single session
│       └── export/route.ts      # POST: generate PDF/text export
├── lib/
│   ├── agents/
│   │   ├── base-agent.ts        # Base agent interface
│   │   ├── arzdar.ts            # Intake Agent
│   │   ├── vivechak.ts          # Router Agent
│   │   ├── shodhak.ts           # Research Agent
│   │   ├── munshi.ts            # Draft Agent
│   │   └── nyayadoot.ts         # Review Agent
│   ├── schemas/                 # Zod validation schemas for each agent
│   ├── orchestrator.ts          # Pipeline orchestrator (sequential execution)
│   ├── sse-emitter.ts           # SSE stream emitter
│   ├── session-manager.ts       # Supabase session CRUD
│   ├── openrouter-client.ts     # LLM client with retry logic
│   ├── knowledge-base.ts        # Vector search client
│   ├── config.ts                # Environment config loader
│   └── types.ts                 # Shared TypeScript types
├── components/
│   ├── Header.tsx               # App header with auth
│   ├── ProblemInput.tsx         # Text input with validation
│   ├── AgentPipeline.tsx        # Timeline pipeline view
│   ├── AgentCard.tsx            # Individual agent status card
│   ├── DocumentViewer.tsx       # Rendered complaint document
│   ├── QualityBadge.tsx         # Circular quality score indicator
│   ├── ExportButtons.tsx        # PDF/text/copy toolbar
│   ├── Walkthrough.tsx          # Onboarding walkthrough (EN/HI/MR)
│   ├── SessionHistory.tsx       # Paginated session list
│   └── SessionDetail.tsx        # Full session replay
├── hooks/
│   └── useSSE.ts                # SSE streaming hook
├── scripts/
│   └── ingest-legal-texts.ts    # Knowledge base ingestion script
├── supabase/
│   └── migrations/              # Database migrations
├── data/                        # Legal text files (not committed)
└── tests/                       # Unit + property-based tests
```

## RAG Pipeline Architecture

The Shodhak agent implements a state-of-the-art retrieval pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                    Shodhak RAG Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User's Problem Description                                  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐    ┌──────────────────────┐            │
│  │ Query Expansion │    │ HyDE (Hypothetical   │            │
│  │ (3 legal queries│    │ Document Embedding)  │            │
│  │ via LLM)        │    │ via LLM              │            │
│  └────────┬────────┘    └──────────┬───────────┘            │
│           │                        │                         │
│           ▼                        ▼                         │
│  ┌─────────────────────────────────────────────┐            │
│  │     5 Parallel Hybrid Searches               │            │
│  │  (Vector Cosine Similarity + FTS Keyword)    │            │
│  │  via hybrid_search_legal_chunks RPC          │            │
│  └────────────────────┬────────────────────────┘            │
│                       │                                      │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │         Deduplication (by chunk ID)          │            │
│  └────────────────────┬────────────────────────┘            │
│                       │                                      │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │    LLM Re-ranking (relevance scoring)        │            │
│  │    Evaluates: applicability, relief,         │            │
│  │    procedural relevance                      │            │
│  └────────────────────┬────────────────────────┘            │
│                       │                                      │
│                       ▼                                      │
│              Top 10 Legal Sections                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key RAG Techniques Used

| Technique | Purpose | Impact |
|-----------|---------|--------|
| Section-aware chunking | Aligns chunks to legal section boundaries | Precise retrieval |
| Metadata-enriched embeddings | Prepends "Act, Section, Chapter:" before embedding | +44% similarity scores |
| Query expansion | LLM reformulates into legal terminology | Broader coverage |
| HyDE | Generates hypothetical ideal section, embeds that | Bridges semantic gap |
| Hybrid search | Vector + PostgreSQL full-text keyword matching | Catches exact references |
| LLM re-ranking | Evaluates actual relevance to the specific case | Precision over recall |

---

## Testing

Run the full test suite:

```bash
npm test
```

The project has 220+ tests covering:
- Agent input/output validation
- OpenRouter retry logic (exponential backoff, rate limiting)
- Knowledge Base search (adaptive threshold, sorting)
- Pipeline orchestration (sequential execution, timeout, error handling)
- Session management (CRUD, pagination)
- SSE event formatting

---

## How the Pipeline Works (Technical)

1. **User submits** a problem description (50-5000 characters, English or Hindi)
2. **POST /api/pipeline** creates a session, initializes all 5 agents, and starts the orchestrator
3. **Arzdar** extracts facts (complainant, respondent, dates, grievance, relief, language)
4. **Vivechak** classifies the legal domain and selects the forum with confidence scoring
5. **Shodhak** performs advanced RAG research:
   - LLM expands the query into 3 legal terminology searches
   - LLM generates a hypothetical legal section (HyDE) for better embedding match
   - 5 parallel hybrid searches (vector cosine similarity + PostgreSQL full-text keyword matching)
   - Results deduplicated across queries
   - LLM re-ranks top 15 results by actual case relevance (applicability, relief, procedure)
   - Returns top 10 most relevant legal sections
6. **Munshi** generates a domain-specific formatted complaint with:
   - Jurisdiction and pecuniary statement
   - Limitation period declaration (Section 69)
   - Proper section citations (Section 2(17) for traders, not Section 83)
   - Affidavit in prescribed format
   - List of annexures
   - Hindi prayer clause (if input was Hindi)
7. **Nyayadoot** reviews and scores (0-100) across completeness, legal validity, formatting, factual consistency
8. **SSE events** stream to the client in real-time throughout the pipeline
9. **Final document** displayed with quality score, PDF export, and session persistence

---

## Configuration

### LLM Model

Change the model in `.env.local`:

```env
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

Any model available on OpenRouter works. Recommended: Claude 3.5 Sonnet or GPT-4o for best legal document quality.

### Embedding Model

The knowledge base uses `openai/text-embedding-3-small` by default. To change:

```env
EMBEDDING_MODEL=openai/text-embedding-3-small
```

### Pipeline Timeout

Default: 5 minutes. Configured in `lib/config.ts`.

---

## Limitations

- Generated documents are drafts and should be reviewed by a qualified lawyer before filing
- Currently supports only 3 Indian legal domains (Consumer Protection, RERA, RTI)
- Quality depends on the LLM model used and the completeness of the knowledge base
- Hindi input is supported but output documents are generated in English (with Hindi prayer clause where applicable)
- RAG retrieval quality depends on the legal text corpus coverage

---

## Future Roadmap

- [ ] Add more legal domains (Labour Law, Family Law, Criminal Complaints)
- [ ] Multi-turn conversation for fact gathering (Arzdar follow-ups in UI)
- [ ] Document revision loop (if quality score < 70, auto-revise via Nyayadoot feedback)
- [ ] Cross-encoder re-ranking for faster, cheaper relevance scoring
- [ ] Parent-child chunking (retrieve small, return full section context)
- [ ] Case law integration (IndianKanoon precedents)
- [ ] Lawyer marketplace integration
- [ ] Mobile app (React Native)
- [ ] Regional language output (full Hindi/Marathi complaint generation)
- [ ] Citation verification (verify every cited section exists in KB)

---

## License

MIT

---

## Acknowledgments

- Built for the **OpenAI × Outskill Hackathon**
- Legal texts sourced from [India Code](https://www.indiacode.nic.in/) (public domain)
- LLM inference via [OpenRouter](https://openrouter.ai/)
- Database and auth via [Supabase](https://supabase.com/)
