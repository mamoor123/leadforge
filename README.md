<![CDATA[<div align="center">

# 🔥 LeadForge

### Signal-Powered Lead Intelligence Platform

**Find businesses the *moment* they need help — not just when they have a bad website.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-API-green?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br />

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API](#-api-endpoints) · [Tech Stack](#-tech-stack) · [Contributing](#-contributing)

</div>

---

## The Problem

Freelancers and agencies waste **hours every week** searching for leads manually. Tools like FreelanceLeads.io show you businesses with bad websites — but a bad website doesn't mean they're ready to buy.

**What if you knew the exact moment a business needed help?**

## The Solution

LeadForge monitors businesses in real-time and alerts you when buying signals appear:

```
🚨  A restaurant just got 3 one-star reviews this week
🚨  A dentist's website went down for 6 hours
🚨  A contractor's SSL certificate expires in 5 days
🚨  A SaaS company just posted 4 engineering jobs (they're growing)
```

**That's your window. That's when you reach out.**

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Signal-Based Discovery
Not just search — **real-time monitoring**
- Review spike detection (bad review velocity)
- Site down / uptime monitoring
- SSL & domain expiry alerts
- Tech stack change detection
- Competitor exit monitoring
- Job posting signals
- Funding round detection

</td>
<td width="50%">

### 🧠 8-Dimension Lead Scoring
Beyond "bad website" — **dynamic scoring**
- Website quality (page speed, UX)
- SEO health (rankings, technical)
- Social presence (profiles, activity)
- Review quality (sentiment, velocity)
- Signal strength (recency, severity)
- Opportunity size (niche, location)
- Urgency (time-decay weighted)
- Budget indicators (tech spend, ads)

</td>
</tr>
<tr>
<td>

### 📧 Multi-Channel Outreach
Not just email — **intelligent sequences**
- Email (AI-personalized, A/B tested)
- LinkedIn connection requests + DMs
- SMS follow-ups
- Auto-pause on reply
- Email warm-up & deliverability
- Revenue impact estimates

</td>
<td>

### 🤖 AI SDR Agent ("Forge Agent")
Autonomous sales development — **24/7**
- Auto-discovers leads per niche + city
- Enriches contacts (email, phone, LinkedIn)
- Scores & prioritizes automatically
- Generates personalized pitches
- Sends multi-channel sequences
- Detects replies, books meetings
- Learns what converts over time

</td>
</tr>
<tr>
<td>

### 🔬 Deep Website Analysis
Surface-level? **Never.**
- Page speed & Core Web Vitals
- SSL certificate grading
- Full SEO audit (title, meta, schema)
- Tech stack detection (CMS, analytics, chat)
- Social media extraction
- Content quality scoring
- Automated issue generation

</td>
<td>

### 📊 CRM & Pipeline
Built-in — **no extra tools needed**
- Pipeline stages (NEW → WON)
- Activity timeline per lead
- Notes & tags
- Revenue attribution
- Sequence performance stats
- Lead board with filters

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 14)                      │
│        Dashboard · Lead Board · Sequences · CRM · Reports       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST API
┌───────────────────────────────▼─────────────────────────────────┐
│                       API SERVER (Fastify)                       │
│    Auth · Leads · Search · Sequences · Signals · Reports · CRM  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │      Redis       │  │   External APIs  │
│   (Prisma ORM)   │  │   (BullMQ Jobs)  │  │  Google · LLMs   │
│   leads · users  │  │   queues · cache │  │  Stripe · Email  │
│   CRM · signals  │  │   rate limits    │  │  LinkedIn · SMS  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    WORKER LAYER (BullMQ)                         │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────┐│
│  │  Scraper   │ │  Enricher  │ │  Scorer   │ │  Signal Monitor  ││
│  │  Workers   │ │  Workers   │ │  Workers  │ │  (runs 24/7)     ││
│  └───────────┘ └───────────┘ └───────────┘ └──────────────────┘│
│  ┌───────────┐ ┌───────────┐ ┌─────────────────────────────────┐│
│  │  Outreach  │ │  Warm-up   │ │  Forge Agent (AI SDR)          ││
│  │  Sender    │ │  Engine    │ │  Discover → Enrich → Score →   ││
│  └───────────┘ └───────────┘ │  Outreach → Learn → Repeat      ││
│                               └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Flow

```
Search → Scrape → Analyze → Score → Signal → Pitch → Sequence
  │         │         │         │        │        │         │
Google    Playwright  SEO     8-axis   Time-    AI-     Multi-
Places    + Crawlee   + Perf  scoring  decay   personal  channel
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | ≥ 20 | `node -v` |
| pnpm | ≥ 9 | `pnpm -v` |
| PostgreSQL | ≥ 15 | `psql --version` |
| Redis | ≥ 7 | `redis-cli ping` |

### Installation

```bash
# Clone the repo
git clone https://github.com/mamoor123/leadforge.git
cd leadforge

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys (see Configuration below)

# Generate Prisma client & run migrations
pnpm db:generate
pnpm db:migrate

# Seed the database (optional)
pnpm db:seed

# Start all dev servers (frontend + API + workers)
pnpm dev
```

### Configuration

Create your `.env` file with these variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/leadforge"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Google Places API (for lead discovery)
GOOGLE_PLACES_API_KEY="your-key-here"

# OpenAI / Anthropic (for AI pitch generation)
OPENAI_API_KEY="your-key-here"

# Stripe (for billing)
STRIPE_SECRET_KEY="your-key-here"
STRIPE_WEBHOOK_SECRET="your-key-here"

# Email (Resend)
RESEND_API_KEY="your-key-here"

# JWT
JWT_SECRET="your-secret-here"
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers (web + api + workers) |
| `pnpm build` | Build all packages for production |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema changes (dev only) |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio (DB GUI) |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm clean` | Clean all build artifacts |

---

## 📁 Project Structure

```
leadforge/
├── apps/
│   ├── web/                 # Next.js 14 frontend
│   │   └── app/
│   │       ├── page.tsx     # Dashboard (search + lead board)
│   │       └── layout.tsx   # Root layout
│   ├── api/                 # Fastify API server
│   │   └── src/
│   │       ├── index.ts     # Server entry + plugin registration
│   │       ├── lib/
│   │       │   └── prisma.ts  # Shared Prisma singleton
│   │       └── routes/
│   │           ├── auth.ts      # JWT authentication
│   │           ├── leads.ts     # Lead CRUD + filtering
│   │           ├── search.ts    # Search initiation + polling
│   │           ├── sequences.ts # Outreach sequences
│   │           ├── signals.ts   # Signal monitoring
│   │           ├── crm.ts       # Notes, activities, pipeline
│   │           ├── billing.ts   # Stripe integration
│   │           └── reports.ts   # PDF report generation
│   └── workers/             # BullMQ background workers
│       └── src/
│           └── search-worker.ts # Search, enrich, score pipeline
├── packages/
│   ├── db/                  # Prisma database layer
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 11 models, enums, relations
│   │   │   └── seed.ts         # Sample data seeder
│   │   └── src/
│   │       └── index.ts        # PrismaClient re-export
│   └── shared/              # Core business logic
│       └── src/
│           ├── index.ts        # Public API exports
│           └── services/
│               ├── website-analyzer.ts     # Page speed, SEO, tech stack
│               ├── lead-scorer.ts          # 8-dimension scoring engine
│               ├── signal-engine.ts        # 8 signal types + monitoring
│               ├── outreach-engine.ts      # Email/LinkedIn/SMS generation
│               ├── ai-sdr-agent.ts         # Autonomous SDR agent
│               ├── google-places.ts        # Google Places API client
│               ├── contact-enrichment.ts   # Email/phone/LinkedIn finding
│               ├── deliverability-engine.ts # Email warm-up & health
│               └── proposal-generator.ts   # ROI proposals & reports
├── turbo.json               # Turborepo pipeline config
├── tsconfig.json            # Root TypeScript config
└── pnpm-workspace.yaml      # Workspace definition
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/me` | Get current user profile |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/search` | Start a lead search (async pipeline) |
| `GET` | `/api/search/:searchId/status` | Check search progress |
| `GET` | `/api/search/:searchId/leads` | Get scored leads from a search |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leads` | List all leads with filters & pagination |
| `GET` | `/api/leads/:id` | Get lead detail with signals & analysis |
| `PATCH` | `/api/leads/:id` | Update lead (pipeline stage, notes, tags) |

### Sequences
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sequences` | Create outreach sequence with steps |
| `GET` | `/api/sequences` | List all sequences |
| `POST` | `/api/sequences/:id/enroll` | Enroll leads in a sequence |
| `POST` | `/api/sequences/generate-pitch` | AI-generate a personalized pitch |
| `GET` | `/api/sequences/:id/stats` | Get sequence performance stats |

### Signals & CRM
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/signals` | List active signals with filters |
| `GET` | `/api/crm/leads/:id/activities` | Get lead activity timeline |
| `POST` | `/api/crm/leads/:id/notes` | Add note to a lead |

### Reports & Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reports/generate` | Generate PDF audit report |
| `GET` | `/api/billing/plan` | Get current plan & limits |
| `POST` | `/api/billing/checkout` | Create Stripe checkout session |
| `GET` | `/health` | Health check |

---

## 💰 Pricing Strategy

| | Free | Starter | Pro | Agency |
|---|:---:|:---:|:---:|:---:|
| **Price** | $0/mo | $29/mo | $59/mo | $129/mo |
| **Searches/mo** | 10 | 200 | 1,000 | 5,000 |
| **Signals** | ✗ | Basic | Full | Full + API |
| **Sequences** | ✗ | 3 | Unlimited | Unlimited |
| **White-label** | ✗ | ✗ | ✗ | ✓ |
| **Support** | Community | Email | Priority | Dedicated |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, Tailwind CSS, React | Dashboard, lead board, CRM |
| **API** | Fastify, TypeScript | REST API server |
| **Database** | PostgreSQL, Prisma ORM | Data persistence, relations |
| **Queue** | BullMQ, Redis | Background job processing |
| **Scraping** | Playwright, Crawlee | Website analysis, data extraction |
| **AI** | OpenAI / Anthropic API | Pitch generation, lead reasoning |
| **Email** | Resend | Transactional email delivery |
| **Auth** | Fastify JWT | Token-based authentication |
| **Payments** | Stripe | Subscription billing |
| **Hosting** | Vercel (web) + Railway/Fly.io (API/workers) | Deployment |

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint

# Type-check all packages
pnpm build
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with 🔥 by [mamoor123](https://github.com/mamoor123)**

[⬆ Back to top](#-leadforge)

</div>
]]>