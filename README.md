# 🔥 LeadForge

**Signal-powered lead intelligence platform for freelancers and agencies.**

Find businesses the *moment* they need help — not just when they have a bad website.

## What Makes This Better Than FreelanceLeads.io

| Feature | FreelanceLeads.io | LeadForge |
|---|---|---|
| Lead source | Google Maps only | Google Maps + signals + monitoring |
| Scoring | Static 4-dimension | Dynamic 8-dimension with signal weighting |
| Signals | None | Review spikes, site down, SSL/domain expiry, tech changes |
| Outreach | Single email | Multi-channel sequences (email + LinkedIn + SMS) |
| Timing | Manual search | Auto-monitoring, push alerts when leads get hot |
| Enrichment | Basic | Tech stack, contact finding, social profiles |
| Analysis | Surface-level | Deep: page speed, SEO, content, security |

## Architecture

```
Search → Scrape → Analyze → Score → Signal → Pitch → Sequence
  │         │         │         │        │        │         │
Google    Playwright  SEO     8-axis   Time-    AI-     Multi-
Places    + Crawlee   + Perf  scoring  decay   personal  channel
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up database
cp .env.example .env
# Edit .env with your API keys
pnpm db:migrate

# 3. Start dev servers
pnpm dev
```

## Project Structure

```
lead-gen-saas/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Fastify API server
│   └── workers/      # BullMQ background workers
├── packages/
│   ├── db/           # Prisma schema & migrations
│   ├── shared/       # Core services (analyzer, scorer, signals)
│   └── ui/           # Shared UI components
└── scripts/
```

## Core Services

### Website Analyzer (`packages/shared/src/services/website-analyzer.ts`)
- Page speed & Core Web Vitals
- SSL certificate analysis
- SEO audit (title, meta, headings, schema, images)
- Tech stack detection (CMS, analytics, chat, booking, payments)
- Social media extraction
- Content quality assessment
- Automated issue generation with revenue impact

### Lead Scorer (`packages/shared/src/services/lead-scorer.ts`)
- 8-dimension scoring: website, SEO, social, reviews, signals, opportunity, urgency, budget
- Signal-based time decay (recent signals weigh more)
- Niche-specific bonuses (restaurants, dentists, contractors)
- AI-generated reasoning for each score

### Signal Engine (`packages/shared/src/services/signal-engine.ts`)
- Site down detection
- SSL/domain expiry monitoring
- Review spike detection (bad review velocity)
- Page speed degradation tracking
- Tech stack change detection
- Competitor monitoring
- Job posting signals
- Funding round detection

### Outreach Engine (`packages/shared/src/services/outreach-engine.ts`)
- Multi-variant email pitch generation (A/B testing)
- LinkedIn connection requests + follow-ups
- SMS pitch generation
- PDF audit report generation
- Revenue impact estimation

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/search` | Start a lead search (async pipeline) |
| GET | `/api/search/:id/leads` | Get scored leads from a search |
| GET | `/api/leads` | List all leads with filters |
| GET | `/api/leads/:id` | Get lead detail with signals |
| POST | `/api/sequences` | Create outreach sequence |
| POST | `/api/sequences/:id/enroll` | Enroll leads in sequence |
| POST | `/api/sequences/generate-pitch` | AI-generate a pitch |
| GET | `/api/signals` | List active signals |

## Pricing Strategy

| Plan | Price | Searches/mo | Signals | Sequences |
|---|---|---|---|---|
| Free | $0 | 10 | ✗ | ✗ |
| Starter | $29 | 200 | Basic | 3 |
| Pro | $59 | 1000 | Full | Unlimited |
| Agency | $129 | 5000 | Full + API | Unlimited + white-label |

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui
- **API:** Node.js, Fastify, tRPC
- **Database:** PostgreSQL, Prisma ORM
- **Queue:** BullMQ, Redis
- **Scraping:** Playwright, Crawlee
- **AI:** OpenAI / Claude API
- **Email:** Resend
- **Auth:** Clerk / NextAuth
- **Payments:** Stripe
- **Hosting:** Vercel + Railway/Fly.io

## License

MIT
