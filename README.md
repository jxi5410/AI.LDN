# AI.LDN — London AI Ecosystem Map

**Live:** [https://londonai.network](https://londonai.network)

Interactive map of London's AI ecosystem — 115+ companies, 80+ connections, 43 key people, investor & company views, AI-powered podcast summaries, network scoring, and UK AI regulation tracker.

![Companies](https://img.shields.io/badge/companies-115+-red) ![Connections](https://img.shields.io/badge/connections-80+-orange) ![People](https://img.shields.io/badge/people-43-blue)

## What's Mapped

- **7 Frontier Labs** — DeepMind, Anthropic, OpenAI, Meta AI, Microsoft Research, Mistral, Cohere
- **30+ Well-Funded Startups** — Nscale ($14.6B), ElevenLabs ($11B), Wayve ($8.6B), Synthesia ($4B), Helsing (€12B), and more
- **15+ Emerging Startups** — Ineffable Intelligence, Tessl, Isembard, PhysicsX, Conjecture, Latent Labs, etc.
- **15 Investors** — Balderton, Atomico, Sequoia, Accel, SoftBank, Nvidia, GV, Khosla, Index, Plural, MMC, Air Street, LocalGlobe, Lightspeed, Sovereign AI
- **5 Academic Institutions** — UCL, Cambridge, Oxford, Imperial, Alan Turing Institute
- **2 Accelerators** — Entrepreneur First, Seedcamp
- **43 Key People** — founders, CEOs, and investor partners with verified social links and 65+ podcast episodes with AI-generated summaries

## Features

- **D3 force graph** — drag, zoom, pan, hover highlighting, colour-coded connections
- **Company View & Investor View** — toggle between company-centric and investor-centric map layouts with different node sizing and emphasis
- **Selection highlighting** — click a company to highlight its network, shade everything else
- **4 panels** — Map · Insights · Updates · People
- **Insights dashboard** — Recharts charts, UK AI regulation timeline with source links, key policy voices, essential reading
- **80+ ecosystem updates** — funding, acquisitions, people moves, interviews (2016–2026)
- **AI podcast summaries** — Claude API via Supabase Edge Function with web search, cached in database
- **User accounts** — Supabase auth, track connections, star companies and people
- **Network scoring** — 6 levels, 8 badges, leaderboard
- **Feedback system** — category-based with status tracking
- **Search** — companies, people, and saved connections
- **Mobile responsive** — draggable bottom sheet on mobile

## Tech Stack

- **Frontend** — React + Vite, D3.js, Recharts
- **Backend** — Supabase (auth, Postgres, Edge Functions)
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

Requires a `.env` file with Supabase credentials for auth and data features.

## Data Sources

Research compiled from company websites, Crunchbase, Sifted, TechCrunch, PitchBook, and public sources. Data current as of March 2026.

## Author

Built by [Jie Xi](https://linkedin.com/in/jiexi) · [github.com/jxi5410](https://github.com/jxi5410)

## License

MIT
