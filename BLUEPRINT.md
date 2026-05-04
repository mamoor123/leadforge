# LeadForge — Blueprint

## Vision

A signal-driven lead intelligence platform that finds businesses the *moment* they need help — not just when they have a bad website.

**Kill shot vs FreelanceLeads.io:** They show you who has a bad website. We show you who's *ready to buy right now*.

---

## Core Differentiators

### 1. Signal-Based Lead Discovery (not just search)
- Real-time monitoring: bad reviews spike, site goes down, competitor closes, new job posts, funding rounds, domain expiring
- "Hot lead" alerts pushed daily — no manual search needed
- Time-decay scoring: a signal from yesterday matters more than one from last month

### 2. Deep Enrichment
- Decision-maker emails (pattern matching + verification)
- Phone numbers, LinkedIn profiles, social accounts
- Tech stack detection (what CMS/analytics/ads they run)
- Traffic estimates, ad spend estimates, backlink profile
- Review sentiment analysis (not just star count)

### 3. Multi-Channel Outreach Engine
- Email + LinkedIn + SMS sequences
- AI-personalized templates per channel
- A/B testing built in
- Reply detection & auto-pause
- Email warm-up & deliverability monitoring

### 4. Industry-Specific Intelligence
- **Restaurants:** delivery setup, health scores, menu freshness, reservation system
- **Dentists/Doctors:** insurance acceptance, booking system, HIPAA compliance
- **Contractors:** license verification, permit activity, review velocity
- **E-commerce:** platform detection, checkout flow, page speed, cart abandonment signals
- **SaaS:** pricing page changes, job postings for sales, tech stack shifts

### 5. Autonomous Pipeline
- Set target niche + city → system auto-discovers, enriches, scores, and queues leads
- Auto-enroll high-score leads into outreach sequences
- CRM with pipeline stages, notes, activity timeline
- Revenue attribution: which leads converted, which channels worked

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                │
│  Dashboard · Lead Board · Sequences · CRM · Reports │
└──────────────────────┬──────────────────────────────┘
                       │ REST / WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  API LAYER (Node.js)                 │
│  Auth · Leads · Sequences · Signals · Reports · CRM │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              WORKER LAYER (BullMQ + Redis)           │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Scraper  │ │ Enricher │ │ Scorer   │ │Sender  │ │
│  │ Workers  │ │ Workers  │ │ Workers  │ │Workers │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Signal   │ │ Analyzer │ │ Warm-up  │            │
│  │ Monitor  │ │ (AI/LLM) │ │ Engine   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                    DATA LAYER                        │
│                                                      │
│  PostgreSQL (leads, users, CRM, full-text search)     │
│  Redis (queues, caching, rate limits)                │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Fast dev, great DX, SSR for SEO |
| API | Node.js + Fastify + JWT auth | Fast, type-safe, built-in auth |
| Database | PostgreSQL + Prisma | Relational fits lead data perfectly |
| Queue | BullMQ + Redis | Battle-tested job processing |
| Search | PostgreSQL full-text search | Lead filtering & full-text search |
| Auth | Fastify JWT (built-in) | Simple, no external dependency |
| Email | Resend (sending) + custom IMAP (receiving) | Good deliverability + reply detection |
| AI | OpenAI / Claude API | Scoring, pitch generation, analysis |
| Scraping | Playwright + Crawlee | Reliable, handles JS-rendered sites |
| Hosting | Vercel (FE) + Railway/Fly.io (workers) | Cheap to start, scales well |
| Payments | Stripe | Standard |
| Monitoring | Sentry + PostHog | Errors + product analytics |

---

## Data Sources (Free/cheap → paid as you scale)

### Free / Low Cost
- **Google Places API** — business listings, reviews, ratings ($200/mo free credit)
- **Website scraping** — Playwright/Crawlee for any URL
- **SSL certificate checks** — crt.sh for subdomains
- **DNS records** — detect hosting, email provider
- **Wayback Machine API** — site history

### Medium Cost
- **Hunter.io** — email finding & verification ($49/mo)
- **Abstract API** — phone validation, geolocation
- **BuiltWith / Wappalyzer** — tech stack detection (or build your own)
- **DataForSEO** — SEO metrics, backlinks, SERP data

### Higher Cost (add later)
- **Apollo.io / Clearbit** — contact enrichment at scale
- **SimilarWeb** — traffic estimates
- **Google Ads API** — ad spend data

---

## Feature Roadmap

### Phase 1 — MVP (Weeks 1-4): "Better than FreelanceLeads"
- [ ] User auth (sign up, login, plans)
- [ ] Search by niche + city → Google Places API
- [ ] Website analysis (page speed, SSL, SEO tags, mobile, tech stack)
- [ ] AI lead scoring (0-100) with breakdown
- [ ] AI pitch email generation (personalized per weakness)
- [ ] Basic CRM (save leads, pipeline stages, notes)
- [ ] PDF audit report generation
- [ ] Stripe billing (free/pro/agency)

### Phase 2 — Signals (Weeks 5-8): "The Kill Shot"
- [ ] Signal monitors: review velocity, site downtime, domain expiry, new job posts
- [ ] Daily hot-lead alerts (email + in-app)
- [ ] Time-decay scoring (recent signals weigh more)
- [ ] Competitor comparison engine
- [ ] Niche scanner (auto-find underserved niches in a city)

### Phase 3 — Outreach (Weeks 9-12): "Close the Loop"
- [ ] Email sequence builder (3-5 step drip)
- [ ] Reply detection (IMAP webhook or polling)
- [ ] Auto-pause on reply
- [ ] A/B testing for subject lines / bodies
- [ ] LinkedIn message templates (manual send with AI copy)
- [ ] Email warm-up integration

### Phase 4 — Scale (Months 4-6): "Agency Machine"
- [ ] Multi-user / team support
- [ ] Bulk search (100+ leads at once)
- [ ] CSV import/export
- [ ] API access
- [ ] White-label reports
- [ ] Slack/Discord notifications
- [ ] Revenue attribution dashboard
- [ ] Industry-specific scoring modules

---

## Pricing Strategy

Undercut AND outperform:

| Plan | Price | Searches | Signals | Sequences |
|---|---|---|---|---|
| Free | $0 | 10/mo | ✗ | ✗ |
| Starter | $29/mo | 200/mo | Basic | 3 sequences |
| Pro | $59/mo | 1000/mo | Full | Unlimited |
| Agency | $129/mo | 5000/mo | Full + API | Unlimited + white-label |

FreelanceLeads charges $14-24. We charge more because we deliver **10x the value** with signals + outreach.

---

## Monetization Beyond Subscriptions

1. **Lead data API** — sell enriched data to other tools
2. **Done-for-you outreach** — managed service for agencies
3. **Marketplace** — freelancers bid on hot leads (we take a cut)
4. **Training** — courses on using the tool to close deals

---

## Competitive Moat

1. **Signal data compounds** — the longer you run, the more historical signal data you have
2. **Scoring accuracy improves** — ML model trains on actual conversions
3. **Network effects** — more users = more data = better scoring
4. **Switching cost** — leads + sequences + CRM history = sticky

---

## Next Steps

1. Set up project scaffold (Next.js + Fastify + PostgreSQL)
2. Build the search → scrape → score → pitch pipeline end-to-end
3. Deploy MVP, get 10 beta users
4. Iterate based on feedback
5. Add signals layer (Phase 2) as the differentiator
