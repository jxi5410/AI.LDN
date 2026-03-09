# AI.LDN — London AI Ecosystem Map

**Live:** [https://londonai.network](https://londonai.network)
**API:** [https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api](https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api)

Interactive map of London's AI ecosystem — 115+ companies, 80+ connections, 43 key people, investor & company views, AI-powered podcast summaries, network scoring, events calendar, and UK AI regulation tracker. Agent-queryable via structured API with OpenAPI spec.

![Companies](https://img.shields.io/badge/companies-115+-red) ![Connections](https://img.shields.io/badge/connections-80+-orange) ![People](https://img.shields.io/badge/people-43-blue) ![Events](https://img.shields.io/badge/events-10-green)

## Features

- **D3 force graph** with Company View & Investor View toggle, selection highlighting
- **5 panels** — Map · Insights · Updates · People · Events
- **API layer** — structured JSON endpoints for companies, people, updates, edges, events, members
- **OpenAPI 3.1 spec** at `?resource=openapi` for agent discovery
- **Events calendar** — curated London AI meetups, conferences, community gatherings
- **Member directory** — skills, interests, looking-for tags (agent-queryable)
- **Podcast summaries** — Claude API via Supabase Edge Function
- **UK AI regulation timeline** with source links
- **80+ ecosystem updates** (2016–2026)
- **Network scoring** — 6 levels, 8 badges, leaderboard
- **User accounts** — Supabase auth, track connections, star entities
- **Mobile responsive** — draggable bottom sheet

## API

All data lives in Supabase and is queryable via a single Edge Function:

```
GET /functions/v1/api                          → Documentation
GET /functions/v1/api?resource=companies       → All companies
GET /functions/v1/api?resource=companies&category=frontier
GET /functions/v1/api?resource=companies&id=deepmind
GET /functions/v1/api?resource=companies&q=safety
GET /functions/v1/api?resource=people          → Key people + podcasts
GET /functions/v1/api?resource=people&company=deepmind
GET /functions/v1/api?resource=updates&type=funding&since=2026-01-01
GET /functions/v1/api?resource=edges&type=investment
GET /functions/v1/api?resource=edges&node=deepmind
GET /functions/v1/api?resource=events          → London AI events
GET /functions/v1/api?resource=events&topic=founders
GET /functions/v1/api?resource=members         → Community directory
GET /functions/v1/api?resource=members&skill=RAG
GET /functions/v1/api?resource=stats           → Aggregate statistics
GET /functions/v1/api?resource=openapi         → OpenAPI 3.1 spec
```

CORS enabled, no auth required for read-only public data.

## Tech Stack

- **Frontend** — React + Vite, D3.js, Recharts
- **Backend** — Supabase (auth, Postgres, Edge Functions, RLS)
- **AI** — Claude API (podcast summaries with web search)
- **Hosting** — Vercel (with Analytics)
- **Domain** — londonai.network

## Local Development

```bash
git clone https://github.com/jxi5410/AI.LDN.git
cd AI.LDN
npm install
npm run dev
```

## Data Sources

Research from company websites, Crunchbase, Sifted, TechCrunch, PitchBook, and public sources. Data current as of March 2026.

## Author

Built by [Jie Xi](https://linkedin.com/in/jiexi) · [github.com/jxi5410](https://github.com/jxi5410)

## License

MIT
