# LDN/ai — London AI Ecosystem Intelligence

**Live:** [londonai.network](https://londonai.network)
**API:** [Public API v4](https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api)
**Sourcing API:** [Beta docs](https://londonai.network/sourcing)

London's AI ecosystem — mapped, enriched, and queryable. 89 companies, 128 connections, 100 funding rounds ($37B+), 67 key people, Companies House ownership data, hiring signals, GitHub activity, semantic search, and automated weekly collection — all in a single interactive graph with an agent-ready API.

![Companies](https://img.shields.io/badge/companies-89-red) ![Connections](https://img.shields.io/badge/connections-128-orange) ![People](https://img.shields.io/badge/people-67-blue) ![Funding](https://img.shields.io/badge/funding_rounds-100-green) ![CH Records](https://img.shields.io/badge/companies_house-59-purple)

---

## What it does

### For the ecosystem
- Interactive D3 force graph with **Company View** and **Investor View** toggle
- 5 panels: **Map** · **People** · **Events** · **News** · **Bits**
- 64 AI companies + 20 investors + 5 academic institutions
- Company cards with funding, team, milestones, careers links
- People cards with social links, podcasts, and **portfolio company display** for investor-linked people
- Inline company peek cards in People panel (no navigation disruption)
- UK AI regulation timeline with source links
- Mobile responsive

### For deal sourcing (beta)
- **Semantic thesis matching** — Gemini embeddings (768d) power "find companies like X" queries
- **Companies House integration** — 59 verified records with officers, PSC ownership stakes, filing dates
- **Hiring signals** — careers page scraping with role classification (eng/research/GTM/product/leadership)
- **GitHub activity** — stars, forks, repos, commits, top repos tracked per company
- **Warm intro routing** — 1,128 precomputed graph paths (direct + 2-hop) between any two companies
- **Co-investor analysis** — find which companies share multiple investors
- **New company detection** — Companies House searches for recently registered London AI companies, cross-referenced against known people/officers
- **News monitoring** — RSS-based collection from TechCrunch, Sifted, matched to tracked companies

---

## Data

| Layer | Count | Source |
|-------|-------|--------|
| Companies | 89 (64 AI + 20 investors + 5 academic) | Manual research + enrichment |
| Edges | 128 (77 investment, rest partnerships/alumni/acquisitions) | Manual + funding round data |
| People | 67 (founders, execs, VCs — partner to principal level) | Verified against LinkedIn/team pages |
| Funding rounds | 100 ($37.2B total, 94 with numeric USD amounts) | Crunchbase, press releases |
| Companies House | 59 verified records | Companies House API (weekly auto-scrape) |
| Hiring signals | 48 snapshots | Careers page scraping |
| GitHub signals | 13 tracked orgs (518K+ stars across portfolio) | GitHub API |
| News mentions | 19 matched articles | TechCrunch + Sifted RSS |
| Graph paths | 1,128 precomputed (246 direct + 882 two-hop) | Computed from edges |
| Podcast summaries | 73 AI-generated | Claude API |
| Events | 19 London AI meetups/conferences | Manual curation |
| Signals | 74 classified ecosystem signals | Auto-classified from news/hiring |

### Company enrichment
Every company record includes: `name`, `category`, `founded`, `employees`, `funding` (text + numeric USD), `valuation`, `focus`, `ethos`, `hq`, `founders`, `milestones`, `careers_url`, `website_url`, `twitter`, `linkedin_url`, `logo_url`, `tags[]`, `description`, `ch_number`, `github_org`, `embedding` (768d Gemini vector).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Vercel (londonai.network)                          │
│  React + Vite · D3.js · Recharts · Vercel Analytics │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  Supabase (eu-west-2)                               │
│                                                      │
│  Postgres (25 tables)                                │
│  ├── pgvector (semantic search, 768d Gemini)         │
│  ├── pg_cron (4 weekly collection jobs)              │
│  └── pg_net (async HTTP to Edge Functions)           │
│                                                      │
│  Edge Functions (7):                                 │
│  ├── api        — Public API v4 (companies, people,  │
│  │                funding, edges, events, stats)      │
│  ├── sourcing   — Deal sourcing API (beta-gated)     │
│  ├── collectors — Automated data collection          │
│  │                (hiring, GitHub, CH, news)          │
│  ├── embed      — Gemini embedding generation +      │
│  │                semantic search                     │
│  ├── bits       — Content curation scraper           │
│  └── summarize-podcast — Claude API summaries        │
│                                                      │
│  Secrets: ANTHROPIC_API_KEY, GEMINI_API_KEY,         │
│           CH_API_KEY                                  │
│                                                      │
│  Cron (pg_cron + pg_net):                            │
│  ├── Tue 06:00 UTC — Hiring signals                  │
│  ├── Tue 06:30 UTC — GitHub activity                 │
│  ├── Tue 07:00 UTC — Companies House scrape          │
│  └── Tue+Fri 08:00 UTC — News monitoring             │
└──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  External APIs                                       │
│  ├── Companies House API (officers, PSC, filings)    │
│  ├── GitHub API (org stats, repos, stars)             │
│  ├── Gemini API (embeddings, free tier)               │
│  ├── Claude API (podcast summaries)                   │
│  └── Clearbit (company logos)                         │
└──────────────────────────────────────────────────────┘
```

---

## Public API (v4)

No auth required. CORS enabled. All responses JSON.

```
GET /api                                    → Documentation
GET /api?resource=companies                 → All companies (with enrichment fields)
GET /api?resource=companies&category=frontier
GET /api?resource=companies&tag=safety      → Filter by tag (new in v4)
GET /api?resource=companies&id=deepmind     → Single company
GET /api?resource=companies&q=autonomous    → Full-text search
GET /api?resource=people                    → Key people + podcasts
GET /api?resource=people&company=deepmind
GET /api?resource=funding_rounds            → All rounds (sorted by amount_usd)
GET /api?resource=funding_rounds&company=anthropic
GET /api?resource=edges                     → All connections
GET /api?resource=edges&type=investment     → Investment edges only
GET /api?resource=edges&node=deepmind       → Edges for a specific company
GET /api?resource=events                    → London AI events
GET /api?resource=stats                     → Aggregate stats + tag cloud
GET /api?resource=openapi                   → OpenAPI 3.1 spec
```

Base URL: `https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api`

## Sourcing API (beta)

Beta-gated. For deal sourcing, thesis matching, and ecosystem intelligence.

```
GET /sourcing?key=KEY&action=match&thesis=enterprise+AI+safety
GET /sourcing?key=KEY&action=signals
GET /sourcing?key=KEY&action=path&from=deepmind&to=anthropic
GET /sourcing?key=KEY&action=coinvest&investor=sequoia-eu
GET /sourcing?key=KEY&action=overlap
GET /sourcing?key=KEY&action=hiring
GET /sourcing?key=KEY&action=github
GET /sourcing?key=KEY&action=ch&company=wayve
GET /sourcing?key=KEY&action=new_companies
```

## Semantic Search

```
GET /embed?key=KEY&action=search&q=autonomous+driving+robotics
GET /embed?key=KEY&action=status
```

Powered by Gemini `gemini-embedding-001` (768d, free tier). Matryoshka truncation from 3072 native dimensions.

## Collectors (automated)

```
GET /collectors?key=KEY&action=dashboard
GET /collectors?key=KEY&action=hiring        → Scrape careers pages
GET /collectors?key=KEY&action=github        → GitHub org activity
GET /collectors?key=KEY&action=ch_scrape     → Companies House data
GET /collectors?key=KEY&action=news          → News mentions
GET /collectors?key=KEY&action=detect_new    → New AI company registrations
GET /collectors?key=KEY&action=ch_detect     → Auto-detect CH numbers
```

All run automatically via `pg_cron` on weekly schedule.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, D3.js (force graph), Recharts |
| Backend | Supabase (Postgres, Auth, Edge Functions, RLS) |
| Search | pgvector + Gemini embeddings (768d) |
| Automation | pg_cron + pg_net (weekly data collection) |
| AI | Claude API (summaries), Gemini API (embeddings) |
| Data | Companies House API, GitHub API, RSS feeds |
| Hosting | Vercel (with Analytics) |
| Domain | londonai.network |

---

## Local Development

```bash
git clone https://github.com/jxi5410/AI.LDN.git
cd AI.LDN
npm install
npm run dev
```

Create `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Roadmap

- [x] Phase 1: Interactive graph + public API + sourcing API + collectors + embeddings + cron
- [ ] Phase 2: Events auto-detection (Luma/Eventbrite), RSS news expansion, community features
- [ ] Phase 3: MCP server, member profiles, warm-intro routing UX, OpenAPI agent spec

---

## Data Sources

Company and funding data from public sources: company websites, Crunchbase, Sifted, TechCrunch, PitchBook, Companies House, GitHub. People data verified against official fund team pages, LinkedIn, and X profiles. Data current as of March 2026.

---

## Author

Built by [Jie Xi](https://linkedin.com/in/jiexi) · [github.com/jxi5410](https://github.com/jxi5410)

## License

MIT
