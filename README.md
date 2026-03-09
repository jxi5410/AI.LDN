# London AI Ecosystem Map 🌌

Interactive constellation-style network graph mapping **80+ entities** across London's AI ecosystem — frontier labs, startups, investors, academic institutions, and their connections.

![V2](https://img.shields.io/badge/version-2.0-blue) ![Entities](https://img.shields.io/badge/entities-80+-green) ![Connections](https://img.shields.io/badge/connections-70+-orange)

## What's Mapped

- **7 Frontier Labs**: DeepMind, Anthropic, OpenAI, Meta AI, Microsoft Research, Mistral, Cohere
- **25+ Well-Funded Startups**: Wayve ($8.6B), ElevenLabs ($11B), Synthesia ($4B), Helsing (€12B), Isomorphic Labs, Stability AI, Darktrace, and more
- **15+ Emerging Startups**: Ineffable Intelligence, Tessl, PhysicsX, Conjecture, Latent Labs, Fyxer AI, etc.
- **14 Key Investors**: Balderton, Atomico, Sequoia, SoftBank, Nvidia, GV, Khosla, Accel, etc.
- **5 Academic Institutions**: UCL, Cambridge, Oxford, Imperial, Alan Turing Institute
- **2 Accelerators**: Entrepreneur First, Seedcamp

## Connection Types

| Type | What it shows |
|------|--------------|
| 🔴 Alumni Flow | Talent movement (esp. DeepMind mafia) |
| 🟣 Spin-off | Corporate spin-outs |
| 🟡 Investment | VC/strategic investment relationships |
| 🔵 Academic | University → company founding connections |
| 🟢 Partnership | Strategic partnerships |
| 🟠 Accelerator | Accelerator alumni |

## Features

- **Force-directed constellation graph** (D3.js) — drag, zoom, pan
- **Hover highlighting** — dims unconnected nodes, brightens connections
- **Click for details** — tabbed panel: Info, People, Connections
- **Category filters** — toggle entity types on/off
- **Timeline slider** — filter by founding year (1990–2026)
- **Search** — by company name, focus area, or founder
- **Responsive** — works on any screen size

## Tech Stack

React + D3.js. Single-file component, no build step needed beyond a React environment.


## Environment Setup

Create a local env file before running the app:

```bash
cp .env.example .env
```

Then fill in:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If these are not set, the app falls back to the current public project values and logs a warning in the browser console.

## Usage

Drop `london-ai-map.jsx` into any React project, or render it in Claude.ai artifacts.

```jsx
import LondonAIMap from './london-ai-map';
// Render: <LondonAIMap />
```

## Data Sources

Research compiled from Wikipedia, Crunchbase, Tracxn, Sifted, TechCrunch, company websites, PitchBook, and other public sources. Data current as of March 2026.

## Author

Built by [Jie Xi](https://linkedin.com/in/jiexi) — Executive Director at JPMorgan Chase, building AI products and mapping the ecosystem.

## License

MIT
