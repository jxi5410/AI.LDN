import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";

/* ═══════════════════════════════════════════════════════════════════════════
   LONDON AI ECOSYSTEM — V2.0
   Interactive constellation map: 80+ entities, hover highlight, timeline,
   search, category filters, detail panels, force-directed graph
   ═══════════════════════════════════════════════════════════════════════════ */

// ── DATA ────────────────────────────────────────────────────────────────────

const companies = [
  // FRONTIER LABS
  { id: "deepmind", name: "Google DeepMind", short: "DeepMind", category: "frontier", founded: 2010, employees: "~3,000 LDN", funding: "$500-650M (acq.)", fundingNum: 600, valuation: "Alphabet sub.", founders: "Demis Hassabis, Shane Legg, Mustafa Suleyman", focus: "AGI · AlphaFold · Gemini · RL · robotics · science", ethos: "Solve intelligence, advance science & humanity", hq: "King's Cross", keyPeople: "Demis Hassabis (CEO, Nobel 2024), Shane Legg (Chief Scientist), Koray Kavukcuoglu (VP Research), Lila Ibrahim (COO)", milestones: "AlphaGo (2016) · AlphaFold (2020) · Gemini (2023) · Nobel Prize Chemistry (2024) · Gemini 2.5 (Mar 2025)", interviews: "Hassabis: Lex Fridman, Tim Ferriss, BBC HARDtalk · Shane Legg: Machine Intelligence Research Institute" },
  { id: "anthropic", name: "Anthropic", short: "Anthropic", category: "frontier", founded: 2021, employees: "1,000+ global", funding: "~$30B", fundingNum: 30000, valuation: "$380B", founders: "Dario Amodei, Daniela Amodei (ex-OpenAI VP Research)", focus: "AI safety · Constitutional AI · Claude models · interpretability", ethos: "Safety-first, responsible scaling, pro-regulation", hq: "Cheapside (LDN office)", keyPeople: "Pip White (EMEA North, ex-Google/Salesforce), Guillaume Princen (Head EMEA, ex-Stripe)", milestones: "LDN office (May 2023) · Claude 3.5 Sonnet · 100+ UK roles (Apr 2025) · EU fastest-growing region · 10x large account growth", interviews: "Dario: Lex Fridman, Dwarkesh Patel, All-In · Daniela: Bloomberg, Fortune" },
  { id: "openai", name: "OpenAI", short: "OpenAI", category: "frontier", founded: 2015, employees: "92-300 LDN", funding: "$17B+ (MS)", fundingNum: 17000, valuation: "$157B+", founders: "Sam Altman, Greg Brockman, Ilya Sutskever et al.", focus: "GPT · ChatGPT · DALL-E · Sora · o1/o3 reasoning", ethos: "Ensure AGI benefits all of humanity", hq: "King's Cross (1st non-US office)", keyPeople: "Sam Altman (CEO), Dale Markowitz (LDN)", milestones: "LDN office (Jun 2023) · $6.6B round Oct 2024 · UK govt MoU (Jul 2025) · 'Humphrey' Whitehall AI · $100B round talks at $850B", interviews: "Altman: Lex Fridman, Joe Rogan, All-In" },
  { id: "meta-ai", name: "Meta AI / FAIR", short: "Meta AI", category: "frontier", founded: 2013, employees: "~3,000 global", funding: "Meta sub.", fundingNum: 0, valuation: "Meta sub.", founders: "Yann LeCun (FAIR founder)", focus: "Llama open models · CV · AR/VR · open-source", ethos: "Open-source AI research", hq: "London research office", keyPeople: "Rob Fergus (FAIR lead, ex-DM 5yr), LeCun departed Nov 2025 → AMI Labs", milestones: "Llama 3 · Meta Superintelligence Labs (2025) · 600 cuts (Oct 2025) · LeCun left to found AMI Labs (€500M raise)", interviews: "LeCun: Lex Fridman, TED, NeurIPS" },
  { id: "microsoft-research", name: "Microsoft Research", short: "MS Research", category: "frontier", founded: 1997, employees: "6,000 UK", funding: "MS sub.", fundingNum: 0, valuation: "MS sub.", founders: "Roger Needham (Cambridge lab 1997)", focus: "ML · AI for science · security · mixed reality", ethos: "Empower through technology", hq: "Cambridge + Paddington Hub", keyPeople: "Mustafa Suleyman (CEO MS AI, ex-DM co-founder), Jordan Hoffmann (LDN Hub, ex-DM/Inflection), Aditya Nori (Cambridge dir.)", milestones: "$30B UK investment (2025-28) · Paddington AI Hub (Apr 2024) · UK's largest supercomputer (23,000+ NVIDIA GPUs)", interviews: "Suleyman: Lex Fridman, FT, Bloomberg" },
  { id: "mistral", name: "Mistral AI", short: "Mistral", category: "frontier", founded: 2023, employees: "280+", funding: "€486M+", fundingNum: 550, valuation: "€5.8B", founders: "Arthur Mensch (ex-DM Sr Staff), Guillaume Lample (ex-Meta), Timothée Lacroix (ex-Meta)", focus: "Open-source frontier LLMs · enterprise platform · Le Chat", ethos: "European sovereignty, open-source first", hq: "Paris (LDN satellite, hiring)", keyPeople: "Arthur Mensch (CEO)", milestones: "Mistral 7B (Sep 2023) · Mixtral MoE · Le Chat · LDN entity May 2023 · hiring AI scientists LDN", interviews: "Mensch: Sifted, TC Disrupt, Lex Fridman" },
  { id: "cohere", name: "Cohere", short: "Cohere", category: "frontier", founded: 2019, employees: "500 (25-50 LDN)", funding: "~$1B", fundingNum: 1000, valuation: "$5.5B+", founders: "Aidan Gomez ('Attention Is All You Need' co-author, Oxford), Ivan Zhang, Nick Frosst", focus: "Enterprise NLP · Command · Embed · RAG · North platform", ethos: "Enterprise-focused, cloud-agnostic", hq: "Toronto (LDN research hub)", keyPeople: "Aidan Gomez (CEO), Phil Blunsom (Chief Sci, ex-Oxford NLP prof), Joelle Pineau (CAO, ex-Meta FAIR VP)", milestones: "Hired Pineau Aug 2025 · doubling LDN headcount · North platform launch", interviews: "Gomez: No Priors, TC, Bloomberg" },

  // WELL-FUNDED STARTUPS
  { id: "wayve", name: "Wayve", short: "Wayve", category: "autonomous", founded: 2017, employees: "350+", funding: "~$2.5B", fundingNum: 2500, valuation: "$8.6B", founders: "Alex Kendall (Cambridge PhD/OBE), Amar Shah (departed 2020)", focus: "End-to-end autonomous driving · embodied AI · no lidar/HD maps", ethos: "AI-first generalizable driving", hq: "London", keyPeople: "Alex Kendall (CEO), Jamie Shotton (Chief Sci, ex-MS Kinect/HoloLens), Erez Dagan (President, ex-Mobileye)", milestones: "$1.2B Series D (Feb 2026) · Uber L4 LDN robotaxi (Spring 2026) · Nissan integration 2027 · driven 500+ cities zero-shot", interviews: "Kendall: Lex Fridman, AI Podcast, Cambridge talks" },
  { id: "synthesia", name: "Synthesia", short: "Synthesia", category: "generative", founded: 2017, employees: "400+", funding: "~$530M", fundingNum: 530, valuation: "$4B", founders: "Victor Riparbelli (CEO, Danish), Steffen Tjerrild, Prof M. Niessner (TU Munich), Prof L. Agapito (UCL)", focus: "AI video generation · enterprise comms · avatars · 140+ languages", ethos: "Ethics-first — no deepfakes of real people, consent required", hq: "London (Regent's Place)", keyPeople: "Victor Riparbelli (CEO, Forbes 30U30)", milestones: "$200M Series E (Jan 2026, GV led) · $100M ARR (Apr 2025) · 60-80% Fortune 100 · Adobe strategic investment (Apr 2025)", interviews: "Riparbelli: 20VC, Sifted, Bloomberg" },
  { id: "isomorphic", name: "Isomorphic Labs", short: "Isomorphic", category: "biotech", founded: 2021, employees: "200+", funding: "$600M", fundingNum: 600, valuation: "Alphabet sub.", founders: "Demis Hassabis (dual CEO with DeepMind)", focus: "AI drug discovery · AlphaFold-derived drug design engine", ethos: "Solve all disease through AI-first drug discovery", hq: "King's Cross + Lausanne", keyPeople: "Hassabis (CEO), Max Jaderberg (CTO), Jennifer Doudna (SAB, Nobel laureate)", milestones: "$600M Series A (Apr 2025, Thrive led) · Lilly/Novartis ~$3B milestone deals · IsoDDE 'AlphaFold 4' (Feb 2026) · J&J deal", interviews: "Hassabis on Iso: Nature, CNBC, Fortune, Scientific American" },
  { id: "elevenlabs", name: "ElevenLabs", short: "ElevenLabs", category: "generative", founded: 2022, employees: "330", funding: "$781M", fundingNum: 781, valuation: "$11B", founders: "Mati Staniszewski (ex-Palantir, Imperial maths), Piotr Dąbkowski (ex-Google/DM, Oxbridge)", focus: "AI voice/TTS · dubbing · cloning · music · agents · 70+ languages", ethos: "Break language barriers through voice AI", hq: "London (Soho) + Warsaw R&D", keyPeople: "Staniszewski (CEO), Dąbkowski (CTO)", milestones: "$500M Series D (Feb 2026, Sequoia) · $330M ARR · 41% Fortune 500 · eyeing IPO · childhood friends from Poland", interviews: "Staniszewski: 20VC, Bloomberg, TC" },
  { id: "stability", name: "Stability AI", short: "Stability", category: "generative", founded: 2019, employees: "~190", funding: "~$300M", fundingNum: 300, valuation: "$1B", founders: "Emad Mostaque (departed Mar 2024)", focus: "Open-source image/video/audio/3D generation", ethos: "Open generative AI for all", hq: "Notting Hill", keyPeople: "Prem Akkaraju (CEO, ex-Weta), Sean Parker (Exec Chair, ex-Facebook), James Cameron (Board)", milestones: "Stable Diffusion (Aug 2022, ignited GenAI boom) · leadership crisis (2024) · $80M rescue (Jun 2024) · EA/WMG/UMG deals · won Getty case (Nov 2025)", interviews: "Mostaque (pre-departure): Lex Fridman, TED" },
  { id: "helsing", name: "Helsing", short: "Helsing", category: "defence", founded: 2021, employees: "275-500", funding: "€1.37B", fundingNum: 1500, valuation: "€12B (~$13.8B)", founders: "Torsten Reil, Dr Gundbert Scherf (co-CEOs)", focus: "Military AI · battlefield intelligence · autonomous drones (HX-2) · electronic warfare", ethos: "AI exclusively for democratic governments", hq: "Munich (LDN office Feb 2023)", keyPeople: "Amelia Gould (UK MD), Torsten Reil (co-CEO)", milestones: "€600M Series D (Jun 2025) · AI fighter pilot combat (May 2025, first ever) · £350M UK investment · FCAS backbone · ASGARD contracts", interviews: "Reil: Sifted, FT, defence events" },
  { id: "darktrace", name: "Darktrace", short: "Darktrace", category: "cybersecurity", founded: 2013, employees: "2,400+", funding: "$230M pre-IPO", fundingNum: 230, valuation: "$5.3B (Thoma Bravo)", founders: "Poppy Gustafsson (now Baroness, UK Minister), Jack Stockdale, Nicole Eagan", focus: "Self-learning AI cybersecurity (digital immune system)", ethos: "Immune system approach to cyber defense", hq: "Cambridge + London", keyPeople: "Gustafsson (now UK Minister of Investment — left Darktrace)", milestones: "IPO Apr 2021 (~£7B peak) · Thoma Bravo $5.3B acq. (Oct 2024) · Mike Lynch (founding backer) died Bayesian yacht Aug 2024", interviews: "Gustafsson: BBC, Fortune, FT" },
  { id: "graphcore", name: "Graphcore", short: "Graphcore", category: "hardware", founded: 2016, employees: "~500", funding: "$710M", fundingNum: 710, valuation: "$2.77B peak → acq.", founders: "Nigel Toon, Simon Knowles (both co-founded Icera → Nvidia $435M), Hermann Hauser (ARM co-founder)", focus: "Intelligence Processing Units (IPUs) for AI workloads", ethos: "Purpose-built AI silicon", hq: "Bristol + London + Cambridge", keyPeople: "Nigel Toon (CEO)", milestones: "SoftBank acquired Jul 2024 ~$500M (below total raised) · $1B India investment · angel investors: Hassabis & Brockman (OpenAI)", interviews: "Toon: Bloomberg, Cerebral Valley" },
  { id: "faculty", name: "Faculty AI", short: "Faculty", category: "enterprise", founded: 2014, employees: "400", funding: "~£40M VC", fundingNum: 50, valuation: "£600M+ (Accenture)", founders: "Dr Marc Warner (Marie Curie Fellow, Harvard quantum), Dr Angie Ma (co-founder, PhD physics)", focus: "Decision intelligence · Frontier platform · govt AI", ethos: "AI for institutional decision-making", hq: "Welbeck Street", keyPeople: "Marc Warner (CEO → Accenture CTO)", milestones: "Accenture acq. ~$1B+ (Jan 2026) · OpenAI red-teaming · NHS/MoD/BBC/Rolls Royce · Jaan Tallinn (Skype) invested", interviews: "Warner: AI Summit London" },
  { id: "benevolentai", name: "BenevolentAI", short: "BenevolentAI", category: "biotech", founded: 2013, employees: "~69", funding: "$700M+", fundingNum: 700, valuation: "€1.5B SPAC peak", founders: "Kenneth Mulvany (serial entrepreneur, America's Cup sailor)", focus: "AI knowledge graph for drug discovery", ethos: "Cure disease through AI", hq: "Fitzrovia + Cambridge wet labs", keyPeople: "Mulvany (Exec Chairman, returned late 2024)", milestones: "COVID baricitinib 90-min discovery (FDA EUA followed) · SPAC listing 2021 · AstraZeneca/Merck deals · delisted Mar 2025 → Osaka Holdings", interviews: "Mulvany: Endpoints, BioWorld" },
  { id: "polyai", name: "PolyAI", short: "PolyAI", category: "enterprise", founded: 2017, employees: "200+", funding: "$206M", fundingNum: 206, valuation: "$500M+", founders: "Nikola Mrkšić (ex-Apple/VocalIQ), Tsung-Hsien Wen (ex-Google), Pei-Hao Su (ex-Facebook) — all Cambridge ML Lab PhDs", focus: "Enterprise voice AI agents · 45 languages · authentication/payments", ethos: "Human-quality voice AI for customer service", hq: "Holborn", keyPeople: "Mrkšić (CEO)", milestones: "$86M Series D (Dec 2025) · 100+ clients: FedEx, Marriott, Caesars, PG&E · UK Chancellor cited as AI exemplar", interviews: "Mrkšić: AI Business podcast" },
  { id: "cleo", name: "Cleo AI", short: "Cleo", category: "fintech", founded: 2016, employees: "300-500", funding: "~$175M", fundingNum: 175, valuation: "$500M+", founders: "Barney Hussey-Yeo (ML graduate)", focus: "AI financial assistant for Gen Z/millennials", ethos: "Make money less stressful (with sass — 'Roast Mode')", hq: "London + NYC/SF", keyPeople: "Hussey-Yeo (CEO)", milestones: "$300M+ ARR · profitable · 6M users · 743K paid subs · re-launching UK 2025 · eyeing IPO", interviews: "Hussey-Yeo: TC, Sifted" },
  { id: "tractable", name: "Tractable", short: "Tractable", category: "enterprise", founded: 2014, employees: "117-224", funding: "$185M", fundingNum: 185, valuation: "$1B (Jun 2021)", founders: "Alex Dalyac (LSE/Imperial, French), Razvan Ranca (Cambridge), Adrien Cohen", focus: "Computer vision for insurance/property damage assessment", ethos: "AI to accelerate accident & disaster recovery", hq: "London", keyPeople: "Dalyac (CEO)", milestones: "UK's first CV unicorn (2021) · $7B+ vehicle repairs processed/yr · 20+ top-100 global insurers", interviews: "Dalyac: InsurTech Digital, Sifted" },
  { id: "signal-ai", name: "Signal AI", short: "Signal AI", category: "enterprise", founded: 2013, employees: "220-243", funding: "$268M", fundingNum: 268, valuation: "Undisclosed", founders: "David Benigson (law background), Dr Miguel Martinez (Essex), Wesley Hall — started in a N. London garage", focus: "External intelligence · reputation risk · media monitoring (226 markets, 75 languages)", ethos: "AI decision augmentation for enterprises", hq: "London", keyPeople: "Benigson (CEO)", milestones: "$165M Battery Ventures (Sep 2025, majority stake) · 40% Fortune 500 · Ask AIQ conversational product", interviews: "Benigson: PRmoment Podcast, Sifted, TC" },
  { id: "abound", name: "Abound", short: "Abound", category: "fintech", founded: 2020, employees: "100-130", funding: "£1.6B+ (debt+equity)", fundingNum: 150, valuation: "Undisclosed", founders: "Gerald Chappell (ex-McKinsey partner, PhD maths), Dr Michelle He (ex-EY Director, PhD CS)", focus: "AI lending using Open Banking (replaces credit scores)", ethos: "Fair credit through AI & open data", hq: "London", keyPeople: "Chappell (CEO), He (COO)", milestones: "Profitable since Apr 2024 · £66.8M rev (+151% YoY) · 70-75% lower defaults · £900M+ issued · Citi/Deutsche Bank debt", interviews: "Chappell: City AM, FT" },
  { id: "exscientia", name: "Exscientia", short: "Exscientia", category: "biotech", founded: 2012, employees: "~250 pre-acq", funding: "$674M (IPO+)", fundingNum: 674, valuation: "$2.9B peak", founders: "Prof Andrew Hopkins CBE (ex-Pfizer, TIME 100 AI, Royal Society Fellow)", focus: "AI drug design — first AI-designed drug in clinical trials", ethos: "Precision medicine through AI", hq: "Oxford Science Park", keyPeople: "Hopkins (CEO)", milestones: "First AI drug → clinical trials in 12 months (vs 4.5yr avg) · Nasdaq IPO Oct 2021 ($510M) · acquired by Recursion Nov 2024", interviews: "Hopkins: Nature, FT, Royal Society" },
  { id: "onfido", name: "Onfido → Entrust", short: "Onfido", category: "enterprise", founded: 2012, employees: "600+ pre-acq", funding: "$242M", fundingNum: 242, valuation: "$1.5B peak", founders: "Husayn Kassai, Eamon Jubbawy, Ruhul Amin — all met at Oxford Entrepreneurs", focus: "AI identity verification · 2,500+ doc types · 195 countries", ethos: "Digital identity for everyone", hq: "London → Entrust (acq.)", keyPeople: "Kassai (then founded London AI Hub community)", milestones: "Acquired by Entrust $650M (Apr 2024) · Oxford seeded £20K (80x return) · served 1,200+ global clients incl. Revolut", interviews: "Kassai: Oxford talks, startup events" },

  // EMERGING / HIGH-GROWTH
  { id: "ineffable", name: "Ineffable Intelligence", short: "Ineffable", category: "frontier-emerging", founded: 2025, employees: "Early", funding: "Seeking $1B seed", fundingNum: 0, valuation: "~$4B target", founders: "David Silver (ex-DM 15+ yrs, AlphaGo/Zero/MuZero lead, UCL Professor)", focus: "RL-based superintelligence · self-discovering knowledge from first principles", ethos: "Beyond LLMs — true first-principles intelligence", hq: "London", keyPeople: "David Silver", milestones: "Founded Nov 2025 · potentially Europe's largest-ever seed · Sequoia/Nvidia/Google interest reported", interviews: "Silver: Nature, DeepMind research lectures, YouTube RL course (millions of views)" },
  { id: "tessl", name: "Tessl", short: "Tessl", category: "devtools", founded: 2024, employees: "Early", funding: "$125M", fundingNum: 125, valuation: "$750M", founders: "Guy Podjarny (ex-Akamai CTO, founded Snyk at $7.4B valuation)", focus: "AI-native software development · spec-driven · beyond copilots", ethos: "Spec-driven development replacing code-first", hq: "London", keyPeople: "Podjarny (CEO)", milestones: "$125M raised pre-product (seed + Series A, Index Ventures led) · product on waitlist", interviews: "Podjarny: Sifted, The Changelog" },
  { id: "physicsx", name: "PhysicsX", short: "PhysicsX", category: "enterprise", founded: 2023, employees: "150+", funding: "~$175M", fundingNum: 175, valuation: "~$1B", founders: "Robin Tuluie (ex-Renault F1/Mercedes F1 R&D), Jacomo Corbo (ex-Bentley)", focus: "Large Physics Models for engineering simulation & generative design", ethos: "AI-powered engineering at industrial scale", hq: "London", keyPeople: "Tuluie (CEO)", milestones: "$135M Series B (Jun 2025, Atomico led) · Siemens/Applied Materials partnerships · Temasek backed", interviews: "Tuluie: Deep tech events" },
  { id: "conjecture", name: "Conjecture", short: "Conjecture", category: "safety", founded: 2021, employees: "~13", funding: "~$25M", fundingNum: 25, valuation: "Undisclosed", founders: "Connor Leahy (EleutherAI co-lead), Sid Black, Gabriel Alfour", focus: "Cognitive Emulation — controllable, transparent AI alignment", ethos: "Make AI safe before making it powerful", hq: "London", keyPeople: "Leahy (CEO)", milestones: "$25M from Andrej Karpathy, Patrick & John Collison (Stripe), Nat Friedman (ex-GitHub CEO), Daniel Gross · House of Lords AI policy", interviews: "Leahy: 80,000 Hours, MIRI talks, numerous safety podcasts" },
  { id: "holistic-ai", name: "Holistic AI", short: "Holistic AI", category: "governance", founded: 2020, employees: "43-79", funding: "Undisclosed (raising $200M)", fundingNum: 15, valuation: "Undisclosed", founders: "Dr Adriano Koshiyama (ex-Goldman Sachs, UCL PhD CS), Dr Emre Kazim (UCL PhD Philosophy/AI ethics)", focus: "AI governance · risk management · EU AI Act compliance · NIST/ISO 42001", ethos: "Responsible AI governance at scale", hq: "Soho Square", keyPeople: "Koshiyama (CEO)", milestones: "Mozilla Ventures investment · Tola Capital · Premji Invest · 500+ enterprise clients", interviews: "Koshiyama: AI governance conferences" },
  { id: "encord", name: "Encord", short: "Encord", category: "devtools", founded: 2020, employees: "50+", funding: "~€50M+", fundingNum: 55, valuation: "Undisclosed", founders: "Eric Landau, Ulrik Stig Hansen", focus: "AI data annotation · fine-tuning · agent deployment (images, video, medical)", ethos: "Data-centric AI development", hq: "London", keyPeople: "Landau (CEO)", milestones: "€50M Series C (Feb 2026) · 300+ enterprise clients · Sifted AI 100", interviews: "Landau: AI data talks" },
  { id: "convergence", name: "Convergence AI", short: "Convergence", category: "enterprise", founded: 2024, employees: "Small → acq.", funding: "$12M", fundingNum: 12, valuation: "Undisclosed", founders: "Marvin Purtorab, Andy Toulis (ex-Shopify/Cohere, DM alumni on team)", focus: "Personal AI agents with long-term memory (Large Meta Learning Models)", ethos: "AI that remembers and learns about you", hq: "London → Salesforce", keyPeople: "Purtorab (CEO)", milestones: "Acquired by Salesforce mid-2025 — just 9 months from founding (remarkable velocity)", interviews: "N/A" },
  { id: "latent-labs", name: "Latent Labs", short: "Latent Labs", category: "biotech", founded: 2025, employees: "Early", funding: "$50M", fundingNum: 50, valuation: "Undisclosed", founders: "Simon Kohl (core AlphaFold2 team at DeepMind)", focus: "AI protein design — designing biology from scratch", ethos: "Engineer biology at the molecular level", hq: "London", keyPeople: "Kohl (CEO)", milestones: "First AI model launched Jul 2025 · $50M raised", interviews: "N/A" },
  { id: "fyxer", name: "Fyxer AI", short: "Fyxer", category: "enterprise", founded: 2024, employees: "Growing fast", funding: "€25.5M", fundingNum: 28, valuation: "Undisclosed", founders: "Richard Hollingsworth, Archie Hollingsworth", focus: "AI executive assistant: email triage, meetings, scheduling", ethos: "Your inbox, handled by AI", hq: "London", keyPeople: "R. Hollingsworth (CEO)", milestones: "€1M → €17M ARR in 7 months · 180K users · Marc Benioff (Salesforce) investor · Sifted EU top AI #9", interviews: "N/A" },
  { id: "mimica", name: "Mimica", short: "Mimica", category: "enterprise", founded: 2019, employees: "Growing", funding: "$26.2M", fundingNum: 26, valuation: "Undisclosed", founders: "Raphael Planche (CEO)", focus: "AI process intelligence — observe workflows then automate", ethos: "Observe before you automate", hq: "London", keyPeople: "Planche (CEO)", milestones: "$26.2M Series B (Sep 2025) · Khosla Ventures · EF alumni", interviews: "N/A" },
  { id: "phoebe", name: "Phoebe AI", short: "Phoebe", category: "devtools", founded: 2024, employees: "Early", funding: "$17M", fundingNum: 17, valuation: "Undisclosed", founders: "Matt Henderson, James Summerfield (ex-Stripe EU CEO/CIO, prev. co-founded Rangespan → Google)", focus: "AI for detecting and fixing software failures in production", ethos: "AI software reliability engineering", hq: "London", keyPeople: "Henderson, Summerfield", milestones: "$17M from GV (Google Ventures)", interviews: "N/A" },
  { id: "metaview", name: "Metaview", short: "Metaview", category: "enterprise", founded: 2018, employees: "Growing", funding: "$50M", fundingNum: 50, valuation: "Undisclosed", founders: "Siadhal Magos (CEO)", focus: "AI hiring process automation", ethos: "Better hiring decisions through AI", hq: "London", keyPeople: "Magos (CEO)", milestones: "$35M Series B (Jun 2025, GV led) · Plural/Seedcamp backed", interviews: "N/A" },
  { id: "unitary", name: "Unitary AI", short: "Unitary", category: "safety", founded: 2019, employees: "Small", funding: "Undisclosed", fundingNum: 5, valuation: "Undisclosed", founders: "Josh Bateman", focus: "Multimodal AI content moderation at scale", ethos: "Safer internet through AI moderation", hq: "London", keyPeople: "Bateman (CEO)", milestones: "UK's most disruptive startup 2024 · open-source Detoxify tool · Plural invested", interviews: "N/A" },
  { id: "paid-ai", name: "Paid AI", short: "Paid AI", category: "devtools", founded: 2024, employees: "Early", funding: "$21.6M", fundingNum: 22, valuation: "Undisclosed", founders: "Undisclosed", focus: "Billing infrastructure for autonomous AI agents", ethos: "Payment rails for the AI agent economy", hq: "London", keyPeople: "N/A", milestones: "$21.6M seed (Sep 2025, Lightspeed led)", interviews: "N/A" },
  { id: "maze-ai", name: "Maze (Security)", short: "Maze", category: "cybersecurity", founded: 2024, employees: "Early", funding: "$31M", fundingNum: 31, valuation: "Undisclosed", founders: "Undisclosed", focus: "AI agents for autonomous cloud security", ethos: "AI-native cloud defense", hq: "London", keyPeople: "N/A", milestones: "$25M Series A (Jun 2025)", interviews: "N/A" },

  // INVESTORS
  { id: "balderton", name: "Balderton Capital", short: "Balderton", category: "investor", founded: 2000, focus: "Europe's largest early-stage VC, $3B+ AUM. Key: Wayve, Cleo, Convergence", hq: "London", keyPeople: "Suranga Chandratillake", fundingNum: 0 },
  { id: "atomico", name: "Atomico", short: "Atomico", category: "investor", founded: 2006, focus: "European tech VC (Niklas Zennström/Skype founder). Key: Graphcore, Synthesia, PhysicsX", hq: "London", keyPeople: "Siraj Khaliq (AI)", fundingNum: 0 },
  { id: "localglobe", name: "LocalGlobe / Latitude", short: "LocalGlobe", category: "investor", founded: 2015, focus: "Seed-stage. Key: Synthesia, Cleo, Faculty, Nscale", hq: "London", keyPeople: "Robin & Saul Klein", fundingNum: 0 },
  { id: "air-street", name: "Air Street Capital", short: "Air Street", category: "investor", founded: 2019, focus: "AI-specialist fund. State of AI Report. RAAIS Summit. Key: Wayve, Synthesia, ElevenLabs, Tractable", hq: "London", keyPeople: "Nathan Benaich", fundingNum: 0 },
  { id: "sequoia-eu", name: "Sequoia Capital", short: "Sequoia", category: "investor", founded: 1972, focus: "Global VC. Key: ElevenLabs ($500M D lead), Ineffable Intelligence talks", hq: "London/SF", keyPeople: "Luciana Lixandru", fundingNum: 0 },
  { id: "accel", name: "Accel", short: "Accel", category: "investor", founded: 1983, focus: "Global VC. Key: Synthesia, Helsing. Dealroom GenAI report co-author", hq: "London office", keyPeople: "Luciana Lixandru, Philippe Botteri", fundingNum: 0 },
  { id: "softbank", name: "SoftBank Vision Fund", short: "SoftBank", category: "investor", founded: 2017, focus: "Massive AI bets. Key: Wayve ($1.05B lead), Tractable, Graphcore (acquired), Exscientia", hq: "London office", keyPeople: "Masayoshi Son", fundingNum: 0 },
  { id: "nvidia-inv", name: "Nvidia (Strategic)", short: "Nvidia", category: "investor", founded: 1993, focus: "£2B UK pledge. Key: Wayve, Synthesia, ElevenLabs, PolyAI, Latent Labs", hq: "US (active London)", keyPeople: "Jensen Huang", fundingNum: 0 },
  { id: "gv", name: "GV (Google Ventures)", short: "GV", category: "investor", founded: 2009, focus: "Alphabet VC. Key: Synthesia (led $200M E), Isomorphic, Phoebe, Metaview", hq: "London office", keyPeople: "Tom Hulme", fundingNum: 0 },
  { id: "khosla", name: "Khosla Ventures", short: "Khosla", category: "investor", founded: 2004, focus: "Deep tech. Key: PolyAI, Mimica, ElevenLabs", hq: "US (active London)", keyPeople: "Vinod Khosla", fundingNum: 0 },
  { id: "index", name: "Index Ventures", short: "Index", category: "investor", founded: 1996, focus: "European/global. Key: Tessl (led Series A)", hq: "London/SF", keyPeople: "Danny Rimer", fundingNum: 0 },
  { id: "lightspeed", name: "Lightspeed", short: "Lightspeed", category: "investor", founded: 2000, focus: "Global VC. Key: Helsing, Paid AI, ElevenLabs", hq: "London office", keyPeople: "Various", fundingNum: 0 },
  { id: "plural", name: "Plural", short: "Plural", category: "investor", founded: 2022, focus: "€400M Fund II. Key: Helsing, Unitary, Metaview. Founded by Wise CEO + AISI Chair", hq: "London", keyPeople: "Taavet Hinrikus (Wise), Ian Hogarth (AISI Chair)", fundingNum: 0 },
  { id: "mmc", name: "MMC Ventures", short: "MMC", category: "investor", founded: 2000, focus: "UK's largest domestic AI investor (75 AI cos since 2010). Annual State of AI reports", hq: "London", keyPeople: "David Kelnar", fundingNum: 0 },

  // ACADEMIC
  { id: "ucl", name: "UCL", short: "UCL", category: "academic", founded: 1826, focus: "Gatsby Unit (DeepMind birthplace) · AI Hub in Generative Models · 46 spinouts/5yr raising £3.4B", hq: "Bloomsbury / King's Cross", fundingNum: 0 },
  { id: "cambridge", name: "Cambridge", short: "Cambridge", category: "academic", founded: 1209, focus: "ML Group (Cipolla) · Dialog Systems · #1 GenAI founder university EU (7.9%) · VocalIQ → Apple", hq: "Cambridge", fundingNum: 0 },
  { id: "oxford", name: "Oxford", short: "Oxford", category: "academic", founded: 1096, focus: "OATML (Yarin Gal) · NLP lab · Spin-outs: Onfido, Eigen, Exscientia, Mind Foundry, Diffblue, Oxbotica", hq: "Oxford", fundingNum: 0 },
  { id: "imperial", name: "Imperial College", short: "Imperial", category: "academic", founded: 1907, focus: "Robotics · CV · healthcare AI · 7% EU GenAI founders (#2) · Magic Pony → Twitter", hq: "South Kensington", fundingNum: 0 },
  { id: "turing", name: "Alan Turing Institute", short: "Turing Inst.", category: "academic", founded: 2015, focus: "UK national AI/data science institute · 13+ university partners · Accenture, GCHQ, Gates Foundation", hq: "British Library, King's Cross", fundingNum: 0 },

  // ACCELERATORS
  { id: "ef", name: "Entrepreneur First", short: "EF", category: "accelerator", founded: 2011, focus: "Talent investor, $10B+ portfolio. Alumni: Tractable (unicorn), Cleo, PolyAI, Magic Pony. Backed by a16z, Sequoia, SoftBank", hq: "London", fundingNum: 0 },
  { id: "seedcamp", name: "Seedcamp", short: "Seedcamp", category: "accelerator", founded: 2007, focus: "Europe's pioneering seed fund · 550+ companies · 10+ unicorns (Revolut, Wise, UiPath)", hq: "London", fundingNum: 0 },
];

const edges = [
  // DeepMind alumni flows
  { source: "deepmind", target: "ineffable", type: "alumni", label: "David Silver" },
  { source: "deepmind", target: "isomorphic", type: "spinoff", label: "Hassabis dual CEO" },
  { source: "deepmind", target: "mistral", type: "alumni", label: "Mensch Sr Staff" },
  { source: "deepmind", target: "elevenlabs", type: "alumni", label: "Dąbkowski ML Eng" },
  { source: "deepmind", target: "microsoft-research", type: "alumni", label: "Suleyman → MS AI CEO" },
  { source: "deepmind", target: "meta-ai", type: "alumni", label: "Fergus → FAIR lead" },
  { source: "deepmind", target: "latent-labs", type: "alumni", label: "Kohl (AlphaFold2)" },
  { source: "deepmind", target: "convergence", type: "alumni", label: "DM alumni on team" },

  // Academic origins
  { source: "ucl", target: "deepmind", type: "academic", label: "Gatsby Unit founding" },
  { source: "ucl", target: "synthesia", type: "academic", label: "Agapito co-founder" },
  { source: "ucl", target: "holistic-ai", type: "academic", label: "Both founders UCL" },
  { source: "cambridge", target: "wayve", type: "academic", label: "Kendall PhD" },
  { source: "cambridge", target: "polyai", type: "academic", label: "All 3 founders" },
  { source: "cambridge", target: "darktrace", type: "academic", label: "Cambridge maths" },
  { source: "cambridge", target: "tractable", type: "academic", label: "Ranca" },
  { source: "oxford", target: "cohere", type: "academic", label: "Gomez at Oxford" },
  { source: "oxford", target: "onfido", type: "academic", label: "3 Oxford students" },
  { source: "oxford", target: "exscientia", type: "academic", label: "Oxford spinout" },
  { source: "imperial", target: "elevenlabs", type: "academic", label: "Staniszewski maths" },
  { source: "imperial", target: "tractable", type: "academic", label: "Dalyac" },

  // Investment relationships
  { source: "softbank", target: "wayve", type: "investment", label: "Led $1.05B C" },
  { source: "softbank", target: "tractable", type: "investment", label: "Led $65M E" },
  { source: "softbank", target: "graphcore", type: "investment", label: "Acquired" },
  { source: "softbank", target: "exscientia", type: "investment" },
  { source: "sequoia-eu", target: "elevenlabs", type: "investment", label: "Led $500M D" },
  { source: "sequoia-eu", target: "ineffable", type: "investment", label: "In talks $1B" },
  { source: "nvidia-inv", target: "wayve", type: "investment" },
  { source: "nvidia-inv", target: "synthesia", type: "investment" },
  { source: "nvidia-inv", target: "elevenlabs", type: "investment" },
  { source: "nvidia-inv", target: "polyai", type: "investment" },
  { source: "nvidia-inv", target: "latent-labs", type: "investment" },
  { source: "gv", target: "synthesia", type: "investment", label: "Led $200M E" },
  { source: "gv", target: "isomorphic", type: "investment" },
  { source: "gv", target: "phoebe", type: "investment" },
  { source: "gv", target: "metaview", type: "investment", label: "Led $35M B" },
  { source: "balderton", target: "wayve", type: "investment", label: "Series A" },
  { source: "balderton", target: "cleo", type: "investment" },
  { source: "balderton", target: "convergence", type: "investment", label: "$12M pre-seed" },
  { source: "atomico", target: "graphcore", type: "investment" },
  { source: "atomico", target: "synthesia", type: "investment" },
  { source: "atomico", target: "physicsx", type: "investment", label: "Led $135M B" },
  { source: "localglobe", target: "synthesia", type: "investment" },
  { source: "localglobe", target: "cleo", type: "investment" },
  { source: "localglobe", target: "faculty", type: "investment" },
  { source: "air-street", target: "wayve", type: "investment" },
  { source: "air-street", target: "synthesia", type: "investment" },
  { source: "air-street", target: "elevenlabs", type: "investment" },
  { source: "air-street", target: "tractable", type: "investment" },
  { source: "accel", target: "synthesia", type: "investment" },
  { source: "accel", target: "helsing", type: "investment" },
  { source: "index", target: "tessl", type: "investment", label: "Led Series A" },
  { source: "lightspeed", target: "helsing", type: "investment" },
  { source: "lightspeed", target: "paid-ai", type: "investment" },
  { source: "khosla", target: "polyai", type: "investment" },
  { source: "khosla", target: "mimica", type: "investment" },
  { source: "khosla", target: "elevenlabs", type: "investment" },
  { source: "plural", target: "helsing", type: "investment" },
  { source: "plural", target: "unitary", type: "investment" },
  { source: "plural", target: "metaview", type: "investment" },

  // Accelerator
  { source: "ef", target: "tractable", type: "accelerator", label: "Founded at EF" },
  { source: "ef", target: "cleo", type: "accelerator" },
  { source: "ef", target: "polyai", type: "accelerator" },
  { source: "ef", target: "mimica", type: "accelerator" },
  { source: "seedcamp", target: "metaview", type: "accelerator" },

  // Cross-links
  { source: "faculty", target: "openai", type: "partnership", label: "Red teaming" },
  { source: "turing", target: "ucl", type: "academic" },
  { source: "turing", target: "cambridge", type: "academic" },
  { source: "turing", target: "oxford", type: "academic" },
  { source: "meta-ai", target: "cohere", type: "alumni", label: "Pineau FAIR → Cohere" },
  { source: "cohere", target: "convergence", type: "alumni", label: "Founders ex-Cohere" },
  { source: "graphcore", target: "deepmind", type: "partnership", label: "Hassabis angel" },
];

// ── Category + edge config ──────────────────────────────────────────────
const categoryConfig = {
  frontier: { color: "#FF2D55", label: "Frontier Labs", icon: "⚡" },
  "frontier-emerging": { color: "#FF6B9D", label: "Emerging Frontier", icon: "🌟" },
  autonomous: { color: "#00D4FF", label: "Autonomous", icon: "🚗" },
  generative: { color: "#BF5AF2", label: "Generative AI", icon: "🎨" },
  biotech: { color: "#30D158", label: "AI + Biotech", icon: "🧬" },
  enterprise: { color: "#FFD60A", label: "Enterprise AI", icon: "🏢" },
  cybersecurity: { color: "#FF453A", label: "Cybersecurity", icon: "🛡️" },
  hardware: { color: "#5E5CE6", label: "AI Hardware", icon: "🔧" },
  fintech: { color: "#64D2FF", label: "AI Fintech", icon: "💰" },
  defence: { color: "#FF375F", label: "Defence AI", icon: "🎯" },
  safety: { color: "#FF9F0A", label: "AI Safety", icon: "🔒" },
  governance: { color: "#AC8E68", label: "Governance", icon: "📋" },
  devtools: { color: "#32D74B", label: "Dev Tools", icon: "⚙️" },
  investor: { color: "#FFD700", label: "Investors", icon: "💎" },
  academic: { color: "#5AC8FA", label: "Academic", icon: "🎓" },
  accelerator: { color: "#FF9500", label: "Accelerators", icon: "🚀" },
};

const edgeTypeConfig = {
  alumni: { color: "#FF2D55", label: "Alumni Flow", dash: null },
  spinoff: { color: "#BF5AF2", label: "Spin-off", dash: null },
  investment: { color: "#FFD700", label: "Investment", dash: null },
  academic: { color: "#5AC8FA", label: "Academic", dash: null },
  partnership: { color: "#64D2FF", label: "Partnership", dash: "6,3" },
  accelerator: { color: "#FF9500", label: "Accelerator", dash: null },
};

function getNodeRadius(c) {
  if (c.category === "frontier") return 30;
  if (c.category === "investor") return 12;
  if (c.category === "academic") return 15;
  if (c.category === "accelerator") return 11;
  if (c.category === "frontier-emerging") return 22;
  const f = c.fundingNum || 0;
  if (f >= 1000) return 26;
  if (f >= 500) return 22;
  if (f >= 200) return 18;
  if (f >= 50) return 15;
  if (f >= 10) return 12;
  return 10;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LondonAIMap() {
  const svgRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCats, setActiveCats] = useState(new Set(Object.keys(categoryConfig)));
  const [hovered, setHovered] = useState(null);
  const [yearRange, setYearRange] = useState([1990, 2026]);
  const [dim, setDim] = useState({ w: 1200, h: 800 });
  const [detailTab, setDetailTab] = useState("info");

  // Responsive
  useEffect(() => {
    const u = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    u(); window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  // Filtering
  const filtered = useMemo(() => companies.filter(c => {
    if (!activeCats.has(c.category)) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.focus||"").toLowerCase().includes(search.toLowerCase()) && !(c.founders||"").toLowerCase().includes(search.toLowerCase())) return false;
    if (c.founded && (c.founded < yearRange[0] || c.founded > yearRange[1])) return false;
    return true;
  }), [activeCats, search, yearRange]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filtered.map(c => c.id));
    return edges.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [filtered]);

  // Hover connections
  const hoveredConnections = useMemo(() => {
    if (!hovered) return null;
    const connected = new Set([hovered]);
    edges.forEach(e => {
      if (e.source === hovered) connected.add(e.target);
      if (e.target === hovered) connected.add(e.source);
    });
    return connected;
  }, [hovered]);

  const toggleCat = (c) => setActiveCats(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });

  // ── D3 Force Graph ────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const { w, h } = dim;

    const nodes = filtered.map(c => ({ ...c, r: getNodeRadius(c) }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = filteredEdges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({ ...e }));

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.1, 6])
      .on("zoom", e => g.attr("transform", e.transform));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(w/2, h/2).scale(0.55).translate(-w/2, -h/2));

    // Defs
    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance(d => d.type === "alumni" || d.type === "spinoff" ? 100 : d.type === "investment" ? 160 : 130)
        .strength(0.25))
      .force("charge", d3.forceManyBody().strength(d => -d.r * 22))
      .force("center", d3.forceCenter(w/2, h/2).strength(0.05))
      .force("collision", d3.forceCollide().radius(d => d.r + 6))
      .force("x", d3.forceX(w/2).strength(0.02))
      .force("y", d3.forceY(h/2).strength(0.02));

    // Edges
    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", d => edgeTypeConfig[d.type]?.color || "#333")
      .attr("stroke-width", d => d.type === "alumni" || d.type === "spinoff" ? 1.8 : 1)
      .attr("stroke-opacity", 0.2)
      .attr("stroke-dasharray", d => edgeTypeConfig[d.type]?.dash || null);

    // Node groups
    const node = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e,d) => { if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag", (e,d) => { d.fx=e.x; d.fy=e.y; })
        .on("end", (e,d) => { if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }))
      .on("click", (e,d) => { e.stopPropagation(); setSelected(p => p?.id===d.id ? null : companies.find(c=>c.id===d.id)); setDetailTab("info"); })
      .on("mouseenter", (e,d) => setHovered(d.id))
      .on("mouseleave", () => setHovered(null));

    // Outer glow ring
    node.append("circle").attr("r", d => d.r + 3)
      .attr("fill", "none")
      .attr("stroke", d => categoryConfig[d.category]?.color || "#666")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15)
      .attr("filter", "url(#glow)");

    // Main circle
    node.append("circle").attr("r", d => d.r)
      .attr("fill", d => (categoryConfig[d.category]?.color || "#666") + "22")
      .attr("stroke", d => categoryConfig[d.category]?.color || "#666")
      .attr("stroke-width", 1.5);

    // Icon
    node.append("text")
      .text(d => categoryConfig[d.category]?.icon || "")
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => Math.max(d.r * 0.65, 9) + "px")
      .attr("pointer-events", "none");

    // Label
    node.append("text")
      .text(d => (d.short || d.name).length > 16 ? (d.short || d.name).slice(0,14)+"…" : (d.short || d.name))
      .attr("text-anchor", "middle").attr("dy", d => d.r + 13)
      .attr("fill", "#94A3B8").attr("font-size", d => d.r > 18 ? "10px" : "8px")
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("pointer-events", "none");

    svg.on("click", () => setSelected(null));

    sim.on("tick", () => {
      link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [filtered, filteredEdges, dim]);

  // ── Hover highlight effect ────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    if (!hovered) {
      svg.selectAll("g > g > g").attr("opacity", 1);
      svg.selectAll("line").attr("stroke-opacity", 0.2);
      return;
    }
    const conn = hoveredConnections;
    svg.selectAll("g > g > g").each(function(d) {
      d3.select(this).attr("opacity", conn?.has(d?.id) ? 1 : 0.12);
    });
    svg.selectAll("line").each(function(d) {
      const srcId = typeof d?.source === "object" ? d.source.id : d?.source;
      const tgtId = typeof d?.target === "object" ? d.target.id : d?.target;
      const connected = srcId === hovered || tgtId === hovered;
      d3.select(this).attr("stroke-opacity", connected ? 0.7 : 0.04).attr("stroke-width", connected ? 2.5 : 1);
    });
  }, [hovered, hoveredConnections]);

  // ── Render ────────────────────────────────────────────────────────────
  const cats = Object.entries(categoryConfig);
  const connectedEdges = selected ? edges.filter(e => e.source === selected.id || e.target === selected.id) : [];

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#080C18", overflow: "hidden", fontFamily: "'JetBrains Mono', 'SF Mono', monospace", position: "relative", color: "#E2E8F0" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "14px 20px", background: "linear-gradient(180deg, rgba(8,12,24,0.97) 0%, rgba(8,12,24,0) 100%)", zIndex: 10, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #FF2D55, #BF5AF2, #00D4FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            London AI Ecosystem
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "#475569" }}>
            {filtered.length} entities · {filteredEdges.length} connections · v2.0
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="Search name, focus, founder…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "7px 12px 7px 30px", borderRadius: 8, border: "1px solid #1E293B", background: "#0F172A", color: "#E2E8F0", fontSize: 11, width: 220, outline: "none", fontFamily: "inherit" }} />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#475569" }}>🔍</span>
        </div>
      </div>

      {/* ── LEFT SIDEBAR: Filters ── */}
      <div style={{ position: "absolute", top: 66, left: 10, zIndex: 10, background: "rgba(15,23,42,0.88)", borderRadius: 12, padding: "10px 10px 14px", backdropFilter: "blur(14px)", border: "1px solid #1E293B", maxHeight: "calc(100vh - 90px)", overflowY: "auto", width: 175 }}>
        {/* Quick toggles */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <button onClick={() => setActiveCats(new Set(Object.keys(categoryConfig)))} style={btnStyle}>All</button>
          <button onClick={() => setActiveCats(new Set())} style={btnStyle}>None</button>
          <button onClick={() => setActiveCats(new Set(["frontier","frontier-emerging","autonomous","generative","biotech","enterprise","cybersecurity","hardware","fintech","defence","safety","governance","devtools"]))} style={btnStyle}>Cos</button>
        </div>
        {/* Categories */}
        {cats.map(([k, cfg]) => {
          const active = activeCats.has(k);
          const count = companies.filter(c => c.category === k).length;
          return (
            <div key={k} onClick={() => toggleCat(k)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 5px", borderRadius: 5, cursor: "pointer", opacity: active ? 1 : 0.3, transition: "opacity 0.15s", marginBottom: 1 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: "#CBD5E1", flex: 1 }}>{cfg.label}</span>
              <span style={{ fontSize: 8, color: "#475569", minWidth: 14, textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
        {/* Year filter */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1E293B" }}>
          <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, marginBottom: 6 }}>FOUNDED: {yearRange[0]}–{yearRange[1]}</div>
          <input type="range" min={1990} max={2026} value={yearRange[0]}
            onChange={e => setYearRange([+e.target.value, yearRange[1]])}
            style={{ width: "100%", accentColor: "#FF2D55", height: 3 }} />
          <input type="range" min={1990} max={2026} value={yearRange[1]}
            onChange={e => setYearRange([yearRange[0], +e.target.value])}
            style={{ width: "100%", accentColor: "#BF5AF2", height: 3 }} />
        </div>
        {/* Edge legend */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1E293B" }}>
          <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, marginBottom: 5 }}>CONNECTIONS</div>
          {Object.entries(edgeTypeConfig).map(([t, cfg]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <div style={{ width: 14, height: 2, background: cfg.color, borderRadius: 1 }} />
              <span style={{ fontSize: 8.5, color: "#64748B" }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SVG CANVAS ── */}
      <svg ref={svgRef} width={dim.w} height={dim.h} style={{ display: "block" }} />

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <div style={{ position: "absolute", top: 66, right: 10, width: 350, maxHeight: "calc(100vh - 90px)", overflowY: "auto", background: "rgba(15,23,42,0.94)", borderRadius: 14, backdropFilter: "blur(16px)", border: "1px solid #1E293B", zIndex: 20 }}>
          {/* Header */}
          <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #1E293B" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 9, color: categoryConfig[selected.category]?.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                  {categoryConfig[selected.category]?.icon} {categoryConfig[selected.category]?.label}
                </span>
                <h2 style={{ margin: "4px 0 0", fontSize: 18, fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "#F8FAFC" }}>{selected.name}</h2>
                {selected.hq && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#64748B" }}>📍 {selected.hq}{selected.founded ? ` · Est. ${selected.founded}` : ""}</p>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#475569", fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
              {["info", "people", "connections"].map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  style={{ flex: 1, padding: "6px 0", border: "none", borderBottom: detailTab === t ? `2px solid ${categoryConfig[selected.category]?.color}` : "2px solid transparent", background: "none", color: detailTab === t ? "#F8FAFC" : "#475569", fontSize: 10, fontFamily: "inherit", cursor: "pointer", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ padding: "14px 18px 18px" }}>
            {detailTab === "info" && <>
              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                {selected.funding && <Metric label="Funding" value={selected.funding} />}
                {selected.valuation && <Metric label="Valuation" value={selected.valuation} />}
                {selected.employees && <Metric label="Team" value={selected.employees} />}
                {selected.founded && <Metric label="Founded" value={selected.founded} />}
              </div>
              {selected.focus && <Section title="Focus" text={selected.focus} />}
              {selected.ethos && <Section title="Ethos / Culture" text={selected.ethos} />}
              {selected.milestones && <Section title="Key Milestones" text={selected.milestones} />}
            </>}

            {detailTab === "people" && <>
              {selected.founders && <Section title="Founders" text={selected.founders} />}
              {selected.keyPeople && <Section title="Key People" text={selected.keyPeople} />}
              {selected.interviews && <Section title="Interviews & Podcasts" text={selected.interviews} />}
            </>}

            {detailTab === "connections" && <>
              {connectedEdges.length === 0 ? (
                <p style={{ fontSize: 11, color: "#475569" }}>No mapped connections for this entity.</p>
              ) : (
                connectedEdges.map((e, i) => {
                  const otherId = e.source === selected.id ? e.target : e.source;
                  const other = companies.find(c => c.id === otherId);
                  if (!other) return null;
                  return (
                    <div key={i} onClick={() => { setSelected(other); setDetailTab("info"); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 3, background: "rgba(30,41,59,0.4)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: edgeTypeConfig[e.type]?.color || "#444", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, color: "#CBD5E1" }}>{other.name}</span>
                        {e.label && <span style={{ fontSize: 9, color: "#475569", marginLeft: 6 }}>— {e.label}</span>}
                      </div>
                      <span style={{ fontSize: 8, color: "#475569", textTransform: "uppercase" }}>{e.type}</span>
                    </div>
                  );
                })
              )}
            </>}
          </div>
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      {!selected && (
        <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.8)", borderRadius: 10, padding: "7px 18px", backdropFilter: "blur(8px)", border: "1px solid #1E293B", zIndex: 10 }}>
          <p style={{ margin: 0, fontSize: 10, color: "#475569", textAlign: "center" }}>
            Click node → details · Hover → highlight connections · Drag nodes · Scroll zoom · Filter left panel
          </p>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ position: "absolute", bottom: 14, right: 14, display: "flex", gap: 8, zIndex: 10 }}>
        <StatBadge label="Companies" value={filtered.filter(c => !["investor","academic","accelerator"].includes(c.category)).length} color="#FF2D55" />
        <StatBadge label="Investors" value={filtered.filter(c => c.category === "investor").length} color="#FFD700" />
        <StatBadge label="Academic" value={filtered.filter(c => c.category === "academic").length} color="#5AC8FA" />
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────
const btnStyle = { flex: 1, padding: "3px", borderRadius: 5, border: "1px solid #1E293B", background: "transparent", color: "#64748B", fontSize: 8.5, cursor: "pointer", fontFamily: "inherit" };

function Metric({ label, value }) {
  return (
    <div style={{ background: "#0F172A", borderRadius: 7, padding: "7px 9px" }}>
      <div style={{ fontSize: 8, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: "#E2E8F0", fontWeight: 500 }}>{String(value)}</div>
    </div>
  );
}

function Section({ title, text }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#CBD5E1", lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{ background: "rgba(15,23,42,0.85)", borderRadius: 8, padding: "5px 10px", backdropFilter: "blur(8px)", border: "1px solid #1E293B", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 8, color: "#475569", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
