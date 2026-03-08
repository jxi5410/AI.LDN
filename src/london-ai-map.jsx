import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";

/* ═══════════════════════════════════════════════════════════════════════════
   LONDON AI ECOSYSTEM — V3.0
   110+ entities · Personal network overlay · Career links · Cluster view
   Persistent storage for user connections · Hover highlight · Timeline
   ═══════════════════════════════════════════════════════════════════════════ */

// ── CATEGORY CONFIG ─────────────────────────────────────────────────────
const CC = {
  frontier:           { color: "#FF2D55", label: "Frontier Labs",     icon: "⚡" },
  "frontier-emerging":{ color: "#FF6B9D", label: "Emerging Frontier", icon: "🌟" },
  autonomous:         { color: "#00D4FF", label: "Autonomous",        icon: "🚗" },
  generative:         { color: "#BF5AF2", label: "Generative AI",     icon: "🎨" },
  biotech:            { color: "#30D158", label: "AI + Biotech",      icon: "🧬" },
  enterprise:         { color: "#FFD60A", label: "Enterprise AI",     icon: "🏢" },
  cybersecurity:      { color: "#FF453A", label: "Cybersecurity",     icon: "🛡️" },
  hardware:           { color: "#5E5CE6", label: "AI Hardware",       icon: "🔧" },
  fintech:            { color: "#64D2FF", label: "AI Fintech",        icon: "💰" },
  defence:            { color: "#FF375F", label: "Defence AI",        icon: "🎯" },
  safety:             { color: "#FF9F0A", label: "AI Safety",         icon: "🔒" },
  governance:         { color: "#AC8E68", label: "Governance",        icon: "📋" },
  devtools:           { color: "#32D74B", label: "Dev Tools",         icon: "⚙️" },
  investor:           { color: "#FFD700", label: "Investors",         icon: "💎" },
  academic:           { color: "#5AC8FA", label: "Academic",          icon: "🎓" },
  accelerator:        { color: "#FF9500", label: "Accelerators",      icon: "🚀" },
};

const EC = {
  alumni:      { color: "#FF2D55", label: "Alumni Flow",  dash: null },
  spinoff:     { color: "#BF5AF2", label: "Spin-off",     dash: null },
  investment:  { color: "#FFD700", label: "Investment",    dash: null },
  academic:    { color: "#5AC8FA", label: "Academic",      dash: null },
  partnership: { color: "#64D2FF", label: "Partnership",   dash: "6,3" },
  accelerator: { color: "#FF9500", label: "Accelerator",   dash: null },
};

const USER_STATUS = {
  know_someone:  { color: "#30D158", label: "Know Someone", icon: "🤝" },
  applied:       { color: "#FFD60A", label: "Applied",      icon: "📨" },
  target:        { color: "#00D4FF", label: "Target",       icon: "🎯" },
  interviewing:  { color: "#BF5AF2", label: "Interviewing", icon: "💬" },
  rejected:      { color: "#FF453A", label: "Rejected",     icon: "❌" },
  watching:      { color: "#64748B", label: "Watching",     icon: "👁️" },
};

// ── COMPANY DATA (110+ entities) ────────────────────────────────────────
const companies = [
  // FRONTIER LABS
  { id:"deepmind", name:"Google DeepMind", s:"DeepMind", cat:"frontier", yr:2010, emp:"~3,000 LDN", fund:"$500-650M (acq.)", fn:600, val:"Alphabet sub.", founders:"Demis Hassabis, Shane Legg, Mustafa Suleyman", focus:"AGI · AlphaFold · Gemini · RL · robotics · science", ethos:"Solve intelligence, advance science & humanity", hq:"King's Cross", kp:"Demis Hassabis (CEO, Nobel 2024), Shane Legg (Chief Scientist), Koray Kavukcuoglu (VP Research)", ms:"AlphaGo (2016) · AlphaFold (2020) · Gemini (2023) · Nobel Chemistry (2024) · Gemini 2.5 (Mar 2025)", iv:"Hassabis: Lex Fridman, Tim Ferriss, BBC HARDtalk", jobs:"https://deepmind.google/careers/" },
  { id:"anthropic", name:"Anthropic", s:"Anthropic", cat:"frontier", yr:2021, emp:"1,000+ global", fund:"~$30B", fn:30000, val:"$380B", founders:"Dario Amodei, Daniela Amodei (ex-OpenAI)", focus:"AI safety · Constitutional AI · Claude · interpretability", ethos:"Safety-first, responsible scaling", hq:"Cheapside (LDN)", kp:"Pip White (EMEA North), Guillaume Princen (Head EMEA)", ms:"LDN office (May 2023) · Claude 3.5 · 100+ UK roles · fastest-growing region", iv:"Dario: Lex Fridman, Dwarkesh, All-In", jobs:"https://www.anthropic.com/careers" },
  { id:"openai", name:"OpenAI", s:"OpenAI", cat:"frontier", yr:2015, emp:"92-300 LDN", fund:"$17B+", fn:17000, val:"$157B+", founders:"Sam Altman, Greg Brockman, Ilya Sutskever et al.", focus:"GPT · ChatGPT · DALL-E · Sora · o1/o3 reasoning", ethos:"AGI benefits all of humanity", hq:"King's Cross (1st non-US)", kp:"Sam Altman (CEO)", ms:"LDN office (Jun 2023) · UK govt MoU (Jul 2025) · 'Humphrey' Whitehall AI", iv:"Altman: Lex Fridman, Joe Rogan, All-In", jobs:"https://openai.com/careers/" },
  { id:"meta-ai", name:"Meta AI / FAIR", s:"Meta AI", cat:"frontier", yr:2013, emp:"~3,000 global", fund:"Meta sub.", fn:0, val:"Meta sub.", founders:"Yann LeCun", focus:"Llama · CV · AR/VR · open-source", ethos:"Open-source AI", hq:"LDN research", kp:"Rob Fergus (FAIR, ex-DM), LeCun departed → AMI Labs", ms:"Llama 3 · MSL (2025) · 600 cuts · LeCun → AMI Labs (€500M)", iv:"LeCun: Lex Fridman, TED", jobs:"https://www.metacareers.com/" },
  { id:"ms-research", name:"Microsoft Research", s:"MS Research", cat:"frontier", yr:1997, emp:"6,000 UK", fund:"MS sub.", fn:0, val:"MS sub.", founders:"Roger Needham (1997)", focus:"ML · AI for science · security · mixed reality", ethos:"Empower through technology", hq:"Cambridge + Paddington", kp:"Mustafa Suleyman (MS AI CEO), Jordan Hoffmann (LDN Hub)", ms:"$30B UK invest · Paddington Hub (Apr 2024) · UK's largest supercomputer", iv:"Suleyman: Lex Fridman, FT", jobs:"https://www.microsoft.com/en-us/research/careers/" },
  { id:"mistral", name:"Mistral AI", s:"Mistral", cat:"frontier", yr:2023, emp:"280+", fund:"€486M+", fn:550, val:"€5.8B", founders:"Arthur Mensch (ex-DM), G. Lample, T. Lacroix (ex-Meta)", focus:"Open-source LLMs · enterprise · Le Chat", ethos:"European sovereignty, open-source", hq:"Paris (LDN satellite)", kp:"Mensch (CEO)", ms:"Mistral 7B · Mixtral · LDN hiring", iv:"Mensch: Sifted, TC Disrupt", jobs:"https://jobs.lever.co/mistral/" },
  { id:"cohere", name:"Cohere", s:"Cohere", cat:"frontier", yr:2019, emp:"500 (25-50 LDN)", fund:"~$1B", fn:1000, val:"$5.5B+", founders:"Aidan Gomez (Attention paper, Oxford), Ivan Zhang, Nick Frosst", focus:"Enterprise NLP · Command · North platform", ethos:"Enterprise-focused, cloud-agnostic", hq:"Toronto (LDN hub)", kp:"Gomez (CEO), Phil Blunsom (Chief Sci, ex-Oxford), Joelle Pineau (CAO, ex-Meta FAIR)", ms:"Hired Pineau (Aug 2025) · doubling LDN", iv:"Gomez: No Priors, TC", jobs:"https://jobs.ashbyhq.com/cohere" },

  // WELL-FUNDED STARTUPS
  { id:"wayve", name:"Wayve", s:"Wayve", cat:"autonomous", yr:2017, emp:"350+", fund:"~$2.5B", fn:2500, val:"$8.6B", founders:"Alex Kendall (Cambridge PhD/OBE), Amar Shah", focus:"End-to-end AV · embodied AI · no lidar/HD maps", ethos:"AI-first generalizable driving", hq:"London", kp:"Kendall (CEO), Jamie Shotton (Chief Sci, ex-MS), Erez Dagan (Pres, ex-Mobileye)", ms:"$1.2B Series D (Feb 2026) · Uber L4 LDN (2026) · Nissan (2027) · 500+ cities zero-shot", iv:"Kendall: Lex Fridman", jobs:"https://wayve.ai/careers/" },
  { id:"synthesia", name:"Synthesia", s:"Synthesia", cat:"generative", yr:2017, emp:"400+", fund:"~$530M", fn:530, val:"$4B", founders:"Victor Riparbelli, Steffen Tjerrild, Prof Niessner (TUM), Prof Agapito (UCL)", focus:"AI video · enterprise comms · avatars · 140+ langs", ethos:"Ethics-first — no deepfakes", hq:"London", kp:"Riparbelli (CEO, Forbes 30U30)", ms:"$200M Series E (Jan 2026) · $100M ARR · 60-80% F100 · Adobe investment", iv:"Riparbelli: 20VC, Sifted", jobs:"https://www.synthesia.io/careers" },
  { id:"isomorphic", name:"Isomorphic Labs", s:"Isomorphic", cat:"biotech", yr:2021, emp:"200+", fund:"$600M", fn:600, val:"Alphabet sub.", founders:"Demis Hassabis (dual CEO)", focus:"AI drug discovery · AlphaFold-derived engines", ethos:"Solve all disease", hq:"King's Cross + Lausanne", kp:"Hassabis (CEO), Max Jaderberg (CTO), Jennifer Doudna (SAB)", ms:"$600M A (Apr 2025) · Lilly/Novartis ~$3B · IsoDDE (Feb 2026) · J&J deal", iv:"Hassabis: Nature, CNBC, Fortune", jobs:"https://www.isomorphiclabs.com/careers" },
  { id:"elevenlabs", name:"ElevenLabs", s:"ElevenLabs", cat:"generative", yr:2022, emp:"330", fund:"$781M", fn:781, val:"$11B", founders:"Mati Staniszewski (ex-Palantir, Imperial), Piotr Dąbkowski (ex-DM, Oxbridge)", focus:"AI voice/TTS · dubbing · cloning · music · 70+ langs", ethos:"Break language barriers", hq:"London (Soho) + Warsaw", kp:"Staniszewski (CEO), Dąbkowski (CTO)", ms:"$500M D (Feb 2026, Sequoia) · $330M ARR · 41% F500 · IPO talk", iv:"Staniszewski: 20VC, Bloomberg", jobs:"https://elevenlabs.io/careers" },
  { id:"stability", name:"Stability AI", s:"Stability", cat:"generative", yr:2019, emp:"~190", fund:"~$300M", fn:300, val:"$1B", founders:"Emad Mostaque (departed Mar 2024)", focus:"Open image/video/audio/3D gen", ethos:"Open generative AI", hq:"Notting Hill", kp:"Prem Akkaraju (CEO), Sean Parker (Chair), James Cameron (Board)", ms:"Stable Diffusion (Aug 2022) · $80M rescue · EA/WMG deals · won Getty case", iv:"Mostaque: Lex Fridman (pre-departure)", jobs:"https://stability.ai/careers" },
  { id:"helsing", name:"Helsing", s:"Helsing", cat:"defence", yr:2021, emp:"275-500", fund:"€1.37B", fn:1500, val:"€12B", founders:"Torsten Reil, Dr Gundbert Scherf", focus:"Military AI · battlefield intel · drones · EW", ethos:"AI for democratic defence only", hq:"Munich (LDN Feb 2023)", kp:"Amelia Gould (UK MD)", ms:"€600M D (Jun 2025) · AI fighter pilot (May 2025) · £350M UK · FCAS", iv:"Reil: Sifted, FT", jobs:"https://helsing.ai/careers" },
  { id:"darktrace", name:"Darktrace", s:"Darktrace", cat:"cybersecurity", yr:2013, emp:"2,400+", fund:"$230M pre-IPO", fn:230, val:"$5.3B (Thoma Bravo)", founders:"Poppy Gustafsson (Baroness), Jack Stockdale, Nicole Eagan", focus:"Self-learning AI cybersecurity", ethos:"Digital immune system", hq:"Cambridge + LDN", kp:"Gustafsson (now UK Min. of Investment)", ms:"IPO Apr 2021 · Thoma Bravo $5.3B (Oct 2024)", iv:"Gustafsson: BBC, Fortune", jobs:"https://darktrace.com/careers" },
  { id:"graphcore", name:"Graphcore", s:"Graphcore", cat:"hardware", yr:2016, emp:"~500", fund:"$710M", fn:710, val:"$2.77B → SB acq.", founders:"Nigel Toon, Simon Knowles, Hermann Hauser (ARM)", focus:"IPUs for AI", ethos:"Purpose-built AI silicon", hq:"Bristol + LDN", kp:"Toon (CEO)", ms:"SoftBank acq. Jul 2024 · $1B India · Hassabis/Brockman angels", iv:"Toon: Bloomberg", jobs:"https://www.graphcore.ai/careers" },
  { id:"faculty", name:"Faculty AI", s:"Faculty", cat:"enterprise", yr:2014, emp:"400", fund:"~£40M", fn:50, val:"£600M+ (Accenture)", founders:"Dr Marc Warner, Dr Angie Ma", focus:"Decision intelligence · govt AI · Frontier platform", ethos:"AI for institutions", hq:"Welbeck St", kp:"Warner (CEO → Accenture CTO)", ms:"Accenture ~$1B+ (Jan 2026) · OpenAI red-teaming · NHS/MoD", iv:"Warner: AI Summit", jobs:"https://faculty.ai/careers/" },
  { id:"benevolentai", name:"BenevolentAI", s:"BenevolentAI", cat:"biotech", yr:2013, emp:"~69", fund:"$700M+", fn:700, val:"€1.5B peak", founders:"Kenneth Mulvany", focus:"AI knowledge graph drug discovery", ethos:"AI to cure disease", hq:"Fitzrovia + Cambridge", kp:"Mulvany (Exec Chair)", ms:"COVID baricitinib (2020) · SPAC 2021 · delisted Mar 2025 · AZ/Merck", iv:"Mulvany: Endpoints", jobs:"https://www.benevolent.com/careers" },
  { id:"polyai", name:"PolyAI", s:"PolyAI", cat:"enterprise", yr:2017, emp:"200+", fund:"$206M", fn:206, val:"$500M+", founders:"Nikola Mrkšić (ex-Apple), T-H Wen (ex-Google), P-H Su (ex-FB) — all Cambridge PhDs", focus:"Enterprise voice agents · 45 langs", ethos:"Human-quality voice AI", hq:"Holborn", kp:"Mrkšić (CEO)", ms:"$86M D (Dec 2025) · FedEx/Marriott/Caesars/PG&E", iv:"Mrkšić: AI Business pod", jobs:"https://poly.ai/careers/" },
  { id:"cleo", name:"Cleo AI", s:"Cleo", cat:"fintech", yr:2016, emp:"300-500", fund:"~$175M", fn:175, val:"$500M+", founders:"Barney Hussey-Yeo", focus:"AI financial assistant (Gen Z)", ethos:"Money less stressful, with sass", hq:"London + NYC", kp:"Hussey-Yeo (CEO)", ms:"$300M+ ARR · profitable · 6M users · re-launching UK", iv:"Hussey-Yeo: TC, Sifted", jobs:"https://web.meetcleo.com/careers" },
  { id:"tractable", name:"Tractable", s:"Tractable", cat:"enterprise", yr:2014, emp:"117-224", fund:"$185M", fn:185, val:"$1B", founders:"Alex Dalyac (LSE/Imperial), Razvan Ranca (Cambridge), Adrien Cohen", focus:"CV for insurance damage", ethos:"Accelerate accident recovery", hq:"London", kp:"Dalyac (CEO)", ms:"UK's 1st CV unicorn · $7B+ repairs/yr · 20+ top insurers", iv:"Dalyac: InsurTech Digital", jobs:"https://tractable.ai/careers/" },
  { id:"signal-ai", name:"Signal AI", s:"Signal AI", cat:"enterprise", yr:2013, emp:"220-243", fund:"$268M", fn:268, val:"Undisclosed", founders:"David Benigson, Dr Miguel Martinez, Wesley Hall", focus:"External intelligence · reputation risk · 226 markets", ethos:"AI decision augmentation", hq:"London", kp:"Benigson (CEO)", ms:"$165M Battery (Sep 2025) · 40% F500 · Ask AIQ", iv:"Benigson: PRmoment Pod", jobs:"https://www.signal-ai.com/careers" },
  { id:"abound", name:"Abound", s:"Abound", cat:"fintech", yr:2020, emp:"100-130", fund:"£1.6B+", fn:150, val:"Undisclosed", founders:"Gerald Chappell (McKinsey, PhD), Dr Michelle He (EY, PhD)", focus:"AI lending via Open Banking", ethos:"Fair credit through AI", hq:"London", kp:"Chappell (CEO), He (COO)", ms:"Profitable Apr 2024 · £66.8M rev · 70-75% lower defaults", iv:"Chappell: City AM", jobs:"https://www.getabound.com/careers" },
  { id:"exscientia", name:"Exscientia", s:"Exscientia", cat:"biotech", yr:2012, emp:"~250 pre-acq", fund:"$674M", fn:674, val:"$2.9B peak", founders:"Prof Andrew Hopkins CBE (ex-Pfizer, TIME 100 AI)", focus:"AI drug design — 1st AI drug in trials", ethos:"Precision medicine", hq:"Oxford", kp:"Hopkins (CEO)", ms:"1st AI drug in 12mo (vs 4.5yr) · Nasdaq IPO $510M · Recursion acq. Nov 2024", iv:"Hopkins: Nature, FT", jobs:"https://www.exscientia.ai/careers" },
  { id:"onfido", name:"Onfido → Entrust", s:"Onfido", cat:"enterprise", yr:2012, emp:"600+ pre-acq", fund:"$242M", fn:242, val:"$1.5B peak", founders:"Husayn Kassai, Eamon Jubbawy, Ruhul Amin (Oxford)", focus:"AI identity verification · 195 countries", ethos:"Digital identity for all", hq:"LDN → Entrust", kp:"Kassai → London AI Hub", ms:"Entrust $650M (Apr 2024) · Oxford £20K seed (80x return)", iv:"Kassai: Oxford talks", jobs:null },

  // EMERGING / HIGH-GROWTH
  { id:"ineffable", name:"Ineffable Intelligence", s:"Ineffable", cat:"frontier-emerging", yr:2025, emp:"Early", fund:"Seeking $1B", fn:0, val:"~$4B target", founders:"David Silver (DM 15yr, AlphaGo/Zero lead, UCL Prof)", focus:"RL superintelligence · first-principles knowledge", ethos:"Beyond LLMs", hq:"London", kp:"David Silver", ms:"Founded Nov 2025 · Europe's largest seed? · Sequoia/Nvidia interest", iv:"Silver: YouTube RL course (millions of views)", jobs:null },
  { id:"tessl", name:"Tessl", s:"Tessl", cat:"devtools", yr:2024, emp:"Early", fund:"$125M", fn:125, val:"$750M", founders:"Guy Podjarny (Akamai CTO → Snyk $7.4B)", focus:"AI-native spec-driven dev", ethos:"Beyond copilots", hq:"London", kp:"Podjarny (CEO)", ms:"$125M pre-product (Index led)", iv:"Podjarny: Sifted", jobs:"https://www.tessl.io/careers" },
  { id:"physicsx", name:"PhysicsX", s:"PhysicsX", cat:"enterprise", yr:2023, emp:"150+", fund:"~$175M", fn:175, val:"~$1B", founders:"Robin Tuluie (ex-F1), Jacomo Corbo (ex-Bentley)", focus:"Large Physics Models · engineering sim", ethos:"AI-powered engineering", hq:"London", kp:"Tuluie (CEO)", ms:"$135M B (Jun 2025, Atomico) · Siemens · Temasek", iv:null, jobs:"https://physicsx.com/careers" },
  { id:"conjecture", name:"Conjecture", s:"Conjecture", cat:"safety", yr:2021, emp:"~13", fund:"~$25M", fn:25, val:"Undisclosed", founders:"Connor Leahy (EleutherAI), Sid Black, Gabriel Alfour", focus:"Cognitive Emulation · controllable alignment", ethos:"Safe before powerful", hq:"London", kp:"Leahy (CEO)", ms:"$25M (Karpathy/Collisons/Friedman) · House of Lords", iv:"Leahy: 80,000 Hours", jobs:"https://www.conjecture.dev/careers" },
  { id:"holistic-ai", name:"Holistic AI", s:"Holistic AI", cat:"governance", yr:2020, emp:"43-79", fund:"Raising $200M", fn:15, val:"Undisclosed", founders:"Dr Adriano Koshiyama (Goldman/UCL), Dr Emre Kazim (UCL)", focus:"AI governance · EU AI Act · risk mgmt", ethos:"Responsible AI governance", hq:"Soho Square", kp:"Koshiyama (CEO)", ms:"Mozilla Ventures · 500+ clients", iv:null, jobs:"https://www.holisticai.com/careers" },
  { id:"encord", name:"Encord", s:"Encord", cat:"devtools", yr:2020, emp:"50+", fund:"~€50M+", fn:55, val:"Undisclosed", founders:"Eric Landau, Ulrik Stig Hansen", focus:"AI data annotation · fine-tuning · agents", ethos:"Data-centric AI", hq:"London", kp:"Landau (CEO)", ms:"€50M C (Feb 2026) · 300+ clients · Sifted AI 100", iv:null, jobs:"https://encord.com/careers/" },
  { id:"convergence", name:"Convergence AI → Salesforce", s:"Convergence", cat:"enterprise", yr:2024, emp:"Acquired", fund:"$12M", fn:12, val:"Acq.", founders:"Marvin Purtorab, Andy Toulis (ex-Shopify/Cohere, DM team)", focus:"AI agents w/ long-term memory", ethos:"AI that remembers", hq:"LDN → Salesforce", kp:"Purtorab", ms:"Salesforce acq. mid-2025 — 9 months from founding", iv:null, jobs:null },
  { id:"latent-labs", name:"Latent Labs", s:"Latent Labs", cat:"biotech", yr:2025, emp:"Early", fund:"$50M", fn:50, val:"Undisclosed", founders:"Simon Kohl (core AlphaFold2, DM)", focus:"AI protein design", ethos:"Design biology from scratch", hq:"London", kp:"Kohl (CEO)", ms:"1st AI model Jul 2025", iv:null, jobs:null },
  { id:"fyxer", name:"Fyxer AI", s:"Fyxer", cat:"enterprise", yr:2024, emp:"Growing", fund:"€25.5M", fn:28, val:"Undisclosed", founders:"Richard & Archie Hollingsworth", focus:"AI exec assistant: email, meetings", ethos:"AI handles your inbox", hq:"London", kp:null, ms:"€1M→€17M ARR in 7mo · 180K users · Benioff investor · Sifted #9", iv:null, jobs:null },
  { id:"mimica", name:"Mimica", s:"Mimica", cat:"enterprise", yr:2019, emp:"Growing", fund:"$26.2M", fn:26, val:"Undisclosed", founders:"Raphael Planche", focus:"AI process intelligence → automation", ethos:"Observe then automate", hq:"London", kp:"Planche (CEO)", ms:"$26.2M B (Sep 2025) · Khosla · EF alum", iv:null, jobs:"https://www.mimica.ai/careers" },
  { id:"phoebe", name:"Phoebe AI", s:"Phoebe", cat:"devtools", yr:2024, emp:"Early", fund:"$17M", fn:17, val:"Undisclosed", founders:"Matt Henderson, James Summerfield (ex-Stripe EU CEO → Google)", focus:"AI software failure detection", ethos:"AI reliability engineering", hq:"London", kp:"Henderson, Summerfield", ms:"$17M from GV", iv:null, jobs:null },
  { id:"metaview", name:"Metaview", s:"Metaview", cat:"enterprise", yr:2018, emp:"Growing", fund:"$50M", fn:50, val:"Undisclosed", founders:"Siadhal Magos", focus:"AI hiring automation", ethos:"Better hiring through AI", hq:"London", kp:"Magos (CEO)", ms:"$35M B (Jun 2025, GV) · Plural/Seedcamp", iv:null, jobs:"https://www.metaview.ai/careers" },
  { id:"unitary", name:"Unitary AI", s:"Unitary", cat:"safety", yr:2019, emp:"Small", fund:"Undisclosed", fn:5, val:"Undisclosed", founders:"Josh Bateman", focus:"Multimodal content moderation", ethos:"Safer internet", hq:"London", kp:"Bateman (CEO)", ms:"UK most disruptive 2024 · open-source Detoxify", iv:null, jobs:"https://www.unitary.ai/careers" },
  { id:"paid-ai", name:"Paid AI", s:"Paid AI", cat:"devtools", yr:2024, emp:"Early", fund:"$21.6M", fn:22, val:"Undisclosed", founders:null, focus:"Billing for AI agents", ethos:"Payment rails for AI economy", hq:"London", kp:null, ms:"$21.6M seed (Lightspeed)", iv:null, jobs:null },
  { id:"maze-ai", name:"Maze Security", s:"Maze", cat:"cybersecurity", yr:2024, emp:"Early", fund:"$31M", fn:31, val:"Undisclosed", founders:null, focus:"AI cloud security agents", ethos:"Autonomous cloud defence", hq:"London", kp:null, ms:"$25M A (Jun 2025)", iv:null, jobs:null },

  // NEW IN V3 — additional companies
  { id:"oxbotica", name:"Oxbotica", s:"Oxbotica", cat:"autonomous", yr:2014, emp:"200+", fund:"~$225M", fn:225, val:"$1B+", founders:"Prof Paul Newman (Oxford), Ingmar Posner (Oxford)", focus:"Universal autonomous driving software", ethos:"Autonomy everywhere", hq:"Oxford + London", kp:"Newman (CEO)", ms:"$140M B (Jan 2023, backed by Google) · bp/Ocado partnerships · on-road UK trials", iv:null, jobs:"https://www.oxbotica.com/careers/" },
  { id:"mind-foundry", name:"Mind Foundry", s:"Mind Foundry", cat:"enterprise", yr:2016, emp:"50-100", fund:"~$30M", fn:30, val:"Undisclosed", founders:"Prof Stephen Roberts (Oxford), Prof Michael Osborne (Oxford)", focus:"Human-centric AI decision support · defence/govt", ethos:"AI humans can trust", hq:"Oxford + London", kp:"Roberts, Osborne", ms:"UK MoD contracts · Oxford ML Group spinout", iv:null, jobs:"https://www.mindfoundry.ai/careers" },
  { id:"healx", name:"Healx", s:"Healx", cat:"biotech", yr:2014, emp:"50-100", fund:"~$68M", fn:68, val:"Undisclosed", founders:"Dr Tim Guilliams (Cambridge PhD)", focus:"AI rare disease drug discovery · drug repurposing", ethos:"Treatments for rare disease patients", hq:"Cambridge + London", kp:"Guilliams (CEO)", ms:"$56M B (2020, Atomico led) · 12+ rare disease programmes · 100+ patient groups", iv:null, jobs:"https://healx.io/careers/" },
  { id:"nscale", name:"Nscale", s:"Nscale", cat:"hardware", yr:2023, emp:"Growing", fund:"$155M", fn:155, val:"Undisclosed", founders:"Undisclosed", focus:"Sovereign AI cloud · GPU infrastructure · European data sovereignty", ethos:"European AI compute independence", hq:"London", kp:null, ms:"$155M raised · European sovereign cloud play", iv:null, jobs:null },
  { id:"robin-ai", name:"Robin AI", s:"Robin AI", cat:"enterprise", yr:2019, emp:"100+", fund:"~$52M", fn:52, val:"Undisclosed", founders:"Richard Robinson", focus:"AI contract review & drafting for legal teams", ethos:"AI-powered legal", hq:"London", kp:"Robinson (CEO)", ms:"$26M B (2024) · Plural invested · 600+ enterprise clients", iv:null, jobs:"https://www.robinai.com/careers" },
  { id:"v7", name:"V7 Labs", s:"V7", cat:"devtools", yr:2018, emp:"80+", fund:"~$33M", fn:33, val:"Undisclosed", founders:"Alberto Rizzoli, Simon Edwardsson", focus:"AI training data platform · auto-annotation", ethos:"Build better AI with better data", hq:"London", kp:"Rizzoli (CEO)", ms:"$33M A (Radical Ventures, Air Street) · used by Samsung, Genentech", iv:null, jobs:"https://www.v7labs.com/careers" },
  { id:"diffblue", name:"Diffblue", s:"Diffblue", cat:"devtools", yr:2016, emp:"50-100", fund:"~$40M", fn:40, val:"Undisclosed", founders:"Prof Daniel Kroening (Oxford CS), Peter Sheridan Dodds", focus:"AI-powered code testing (Java unit tests)", ethos:"AI writes your tests", hq:"Oxford + London", kp:"Kroening", ms:"Oxford CS spinout · Goldman Sachs Strategic Inv. backed · Cover tool", iv:null, jobs:"https://www.diffblue.com/careers/" },
  { id:"builderai", name:"Builder.ai", s:"Builder.ai", cat:"enterprise", yr:2016, emp:"700+", fund:"~$450M", fn:450, val:"$1B+ (reported)", founders:"Sachin Dev Duggal", focus:"AI-powered software building (no-code)", ethos:"Software building for everyone", hq:"London", kp:"Duggal (CEO)", ms:"$250M raised in 2024 (Microsoft + QIA backed) · serious governance issues 2024", iv:null, jobs:"https://www.builder.ai/careers" },
  { id:"basecamp-res", name:"Basecamp Research", s:"Basecamp Res.", cat:"biotech", yr:2020, emp:"50+", fund:"~$80M", fn:80, val:"Undisclosed", founders:"Glen Mayall", focus:"Nature's DNA → protein design (world's largest biodiversity database for AI)", ethos:"Nature-first biotech", hq:"London", kp:"Mayall (CEO)", ms:"$60M B (2024, Nvidia backed) · 4B+ protein sequences", iv:null, jobs:null },
  { id:"five-ai", name:"Five AI → Bosch", s:"Five AI", cat:"autonomous", yr:2015, emp:"Acquired", fund:"~$77M", fn:77, val:"Acq.", founders:"Stan Sherborne, Ben Peters", focus:"AV simulation & testing platform", ethos:"Safe AV through simulation", hq:"Cambridge + London", kp:null, ms:"Acquired by Bosch 2024 · backed by Kindred, Amadeus", iv:null, jobs:null },
  { id:"papercup", name:"Papercup", s:"Papercup", cat:"generative", yr:2017, emp:"50+", fund:"~$20M", fn:20, val:"Undisclosed", founders:"Jesse Sherwood, Jiameng Gao, Ben Sherwood", focus:"AI video dubbing / voice translation", ethos:"Every voice in every language", hq:"London", kp:"J. Sherwood (CEO)", ms:"Sky News, Bloomberg clients · Series A (LocalGlobe)", iv:null, jobs:null },

  // INVESTORS
  { id:"balderton", name:"Balderton Capital", s:"Balderton", cat:"investor", yr:2000, focus:"Europe's largest early-stage, $3B+. Key: Wayve, Cleo, Convergence", hq:"London", kp:"Suranga Chandratillake", fn:0, jobs:null },
  { id:"atomico", name:"Atomico", s:"Atomico", cat:"investor", yr:2006, focus:"European VC (Zennström/Skype). Key: Graphcore, Synthesia, PhysicsX, Healx", hq:"London", kp:"Siraj Khaliq", fn:0, jobs:null },
  { id:"localglobe", name:"LocalGlobe", s:"LocalGlobe", cat:"investor", yr:2015, focus:"Seed. Key: Synthesia, Cleo, Faculty, Nscale, Papercup", hq:"London", kp:"Robin & Saul Klein", fn:0, jobs:null },
  { id:"air-street", name:"Air Street Capital", s:"Air Street", cat:"investor", yr:2019, focus:"AI-specialist. State of AI Report. Key: Wayve, Synthesia, ElevenLabs, Tractable, V7", hq:"London", kp:"Nathan Benaich", fn:0, jobs:null },
  { id:"sequoia-eu", name:"Sequoia Capital", s:"Sequoia", cat:"investor", yr:1972, focus:"Global. Key: ElevenLabs ($500M D), Ineffable talks", hq:"London/SF", kp:"Luciana Lixandru", fn:0, jobs:null },
  { id:"accel", name:"Accel", s:"Accel", cat:"investor", yr:1983, focus:"Global. Key: Synthesia, Helsing", hq:"London", kp:"Luciana Lixandru", fn:0, jobs:null },
  { id:"softbank", name:"SoftBank Vision Fund", s:"SoftBank", cat:"investor", yr:2017, focus:"Key: Wayve ($1.05B), Tractable, Graphcore (acq.), Exscientia", hq:"London", kp:"Son", fn:0, jobs:null },
  { id:"nvidia-inv", name:"Nvidia (Strategic)", s:"Nvidia", cat:"investor", yr:1993, focus:"£2B UK. Key: Wayve, Synthesia, ElevenLabs, PolyAI, Latent Labs, Basecamp", hq:"US", kp:"Jensen Huang", fn:0, jobs:null },
  { id:"gv", name:"GV", s:"GV", cat:"investor", yr:2009, focus:"Alphabet VC. Key: Synthesia (led E), Isomorphic, Phoebe, Metaview", hq:"London", kp:"Tom Hulme", fn:0, jobs:null },
  { id:"khosla", name:"Khosla Ventures", s:"Khosla", cat:"investor", yr:2004, focus:"Deep tech. Key: PolyAI, Mimica, ElevenLabs", hq:"US", kp:"Vinod Khosla", fn:0, jobs:null },
  { id:"index", name:"Index Ventures", s:"Index", cat:"investor", yr:1996, focus:"EU/global. Key: Tessl (led A)", hq:"London/SF", kp:"Danny Rimer", fn:0, jobs:null },
  { id:"lightspeed", name:"Lightspeed", s:"Lightspeed", cat:"investor", yr:2000, focus:"Global. Key: Helsing, Paid AI, ElevenLabs", hq:"London", kp:null, fn:0, jobs:null },
  { id:"plural", name:"Plural", s:"Plural", cat:"investor", yr:2022, focus:"€400M II. Key: Helsing, Unitary, Metaview, Robin AI. Founders: Wise CEO + AISI Chair", hq:"London", kp:"Taavet Hinrikus, Ian Hogarth", fn:0, jobs:null },
  { id:"mmc", name:"MMC Ventures", s:"MMC", cat:"investor", yr:2000, focus:"UK's largest AI investor (75 cos). State of AI reports", hq:"London", kp:"David Kelnar", fn:0, jobs:null },

  // ACADEMIC
  { id:"ucl", name:"UCL", s:"UCL", cat:"academic", yr:1826, focus:"Gatsby Unit (DM birthplace) · AI Hub GenModels · 46 spinouts/5yr £3.4B", hq:"King's Cross", fn:0, jobs:null },
  { id:"cambridge", name:"Cambridge", s:"Cambridge", cat:"academic", yr:1209, focus:"ML Group · Dialog Systems · #1 GenAI founders EU (7.9%) · VocalIQ→Apple", hq:"Cambridge", fn:0, jobs:null },
  { id:"oxford", name:"Oxford", s:"Oxford", cat:"academic", yr:1096, focus:"OATML · NLP · Spinouts: Onfido, Eigen, Exscientia, Mind Foundry, Diffblue, Oxbotica", hq:"Oxford", fn:0, jobs:null },
  { id:"imperial", name:"Imperial College", s:"Imperial", cat:"academic", yr:1907, focus:"Robotics · CV · 7% EU GenAI founders (#2) · Magic Pony→Twitter", hq:"S. Kensington", fn:0, jobs:null },
  { id:"turing", name:"Alan Turing Institute", s:"Turing Inst.", cat:"academic", yr:2015, focus:"UK national AI institute · 13+ unis · GCHQ/Gates/Accenture", hq:"British Library, KX", fn:0, jobs:null },

  // ACCELERATORS
  { id:"ef", name:"Entrepreneur First", s:"EF", cat:"accelerator", yr:2011, focus:"Talent investor, $10B+. Alumni: Tractable, Cleo, PolyAI, Magic Pony, Mimica", hq:"London", fn:0, jobs:null },
  { id:"seedcamp", name:"Seedcamp", s:"Seedcamp", cat:"accelerator", yr:2007, focus:"550+ cos · 10+ unicorns (Revolut, Wise, UiPath)", hq:"London", fn:0, jobs:null },
];

// ── EDGES ───────────────────────────────────────────────────────────────
const edges = [
  // DM alumni
  {s:"deepmind",t:"ineffable",ty:"alumni",l:"David Silver"},
  {s:"deepmind",t:"isomorphic",ty:"spinoff",l:"Hassabis dual CEO"},
  {s:"deepmind",t:"mistral",ty:"alumni",l:"Mensch Sr Staff"},
  {s:"deepmind",t:"elevenlabs",ty:"alumni",l:"Dąbkowski ML Eng"},
  {s:"deepmind",t:"ms-research",ty:"alumni",l:"Suleyman→MS AI CEO"},
  {s:"deepmind",t:"meta-ai",ty:"alumni",l:"Fergus→FAIR"},
  {s:"deepmind",t:"latent-labs",ty:"alumni",l:"Kohl (AlphaFold2)"},
  {s:"deepmind",t:"convergence",ty:"alumni",l:"DM alumni on team"},
  // Academic
  {s:"ucl",t:"deepmind",ty:"academic",l:"Gatsby→founding"},
  {s:"ucl",t:"synthesia",ty:"academic",l:"Agapito co-founder"},
  {s:"ucl",t:"holistic-ai",ty:"academic",l:"Both founders UCL"},
  {s:"cambridge",t:"wayve",ty:"academic",l:"Kendall PhD"},
  {s:"cambridge",t:"polyai",ty:"academic",l:"All 3 founders"},
  {s:"cambridge",t:"darktrace",ty:"academic",l:"Cambridge maths"},
  {s:"cambridge",t:"tractable",ty:"academic",l:"Ranca"},
  {s:"cambridge",t:"healx",ty:"academic",l:"Guilliams PhD"},
  {s:"oxford",t:"cohere",ty:"academic",l:"Gomez at Oxford"},
  {s:"oxford",t:"onfido",ty:"academic",l:"3 Oxford students"},
  {s:"oxford",t:"exscientia",ty:"academic",l:"Oxford spinout"},
  {s:"oxford",t:"oxbotica",ty:"academic",l:"Newman & Posner"},
  {s:"oxford",t:"mind-foundry",ty:"academic",l:"Roberts & Osborne"},
  {s:"oxford",t:"diffblue",ty:"academic",l:"Kroening CS"},
  {s:"imperial",t:"elevenlabs",ty:"academic",l:"Staniszewski"},
  {s:"imperial",t:"tractable",ty:"academic",l:"Dalyac"},
  // Investment
  {s:"softbank",t:"wayve",ty:"investment",l:"Led $1.05B C"},
  {s:"softbank",t:"tractable",ty:"investment",l:"Led $65M E"},
  {s:"softbank",t:"graphcore",ty:"investment",l:"Acquired"},
  {s:"softbank",t:"exscientia",ty:"investment"},
  {s:"sequoia-eu",t:"elevenlabs",ty:"investment",l:"Led $500M D"},
  {s:"sequoia-eu",t:"ineffable",ty:"investment",l:"In talks $1B"},
  {s:"nvidia-inv",t:"wayve",ty:"investment"},
  {s:"nvidia-inv",t:"synthesia",ty:"investment"},
  {s:"nvidia-inv",t:"elevenlabs",ty:"investment"},
  {s:"nvidia-inv",t:"polyai",ty:"investment"},
  {s:"nvidia-inv",t:"latent-labs",ty:"investment"},
  {s:"nvidia-inv",t:"basecamp-res",ty:"investment",l:"Backed $60M B"},
  {s:"gv",t:"synthesia",ty:"investment",l:"Led $200M E"},
  {s:"gv",t:"isomorphic",ty:"investment"},
  {s:"gv",t:"phoebe",ty:"investment"},
  {s:"gv",t:"metaview",ty:"investment",l:"Led $35M B"},
  {s:"balderton",t:"wayve",ty:"investment",l:"Series A"},
  {s:"balderton",t:"cleo",ty:"investment"},
  {s:"balderton",t:"convergence",ty:"investment"},
  {s:"atomico",t:"graphcore",ty:"investment"},
  {s:"atomico",t:"synthesia",ty:"investment"},
  {s:"atomico",t:"physicsx",ty:"investment",l:"Led $135M B"},
  {s:"atomico",t:"healx",ty:"investment",l:"Led $56M B"},
  {s:"localglobe",t:"synthesia",ty:"investment"},
  {s:"localglobe",t:"cleo",ty:"investment"},
  {s:"localglobe",t:"faculty",ty:"investment"},
  {s:"localglobe",t:"papercup",ty:"investment"},
  {s:"air-street",t:"wayve",ty:"investment"},
  {s:"air-street",t:"synthesia",ty:"investment"},
  {s:"air-street",t:"elevenlabs",ty:"investment"},
  {s:"air-street",t:"tractable",ty:"investment"},
  {s:"air-street",t:"v7",ty:"investment"},
  {s:"accel",t:"synthesia",ty:"investment"},
  {s:"accel",t:"helsing",ty:"investment"},
  {s:"index",t:"tessl",ty:"investment",l:"Led A"},
  {s:"lightspeed",t:"helsing",ty:"investment"},
  {s:"lightspeed",t:"paid-ai",ty:"investment"},
  {s:"khosla",t:"polyai",ty:"investment"},
  {s:"khosla",t:"mimica",ty:"investment"},
  {s:"khosla",t:"elevenlabs",ty:"investment"},
  {s:"plural",t:"helsing",ty:"investment"},
  {s:"plural",t:"unitary",ty:"investment"},
  {s:"plural",t:"metaview",ty:"investment"},
  {s:"plural",t:"robin-ai",ty:"investment"},
  // Accelerator
  {s:"ef",t:"tractable",ty:"accelerator",l:"Founded at EF"},
  {s:"ef",t:"cleo",ty:"accelerator"},
  {s:"ef",t:"polyai",ty:"accelerator"},
  {s:"ef",t:"mimica",ty:"accelerator"},
  {s:"seedcamp",t:"metaview",ty:"accelerator"},
  // Cross-links
  {s:"faculty",t:"openai",ty:"partnership",l:"Red teaming"},
  {s:"turing",t:"ucl",ty:"academic"},
  {s:"turing",t:"cambridge",ty:"academic"},
  {s:"turing",t:"oxford",ty:"academic"},
  {s:"meta-ai",t:"cohere",ty:"alumni",l:"Pineau FAIR→Cohere"},
  {s:"cohere",t:"convergence",ty:"alumni",l:"Ex-Cohere founders"},
  {s:"graphcore",t:"deepmind",ty:"partnership",l:"Hassabis angel"},
  {s:"oxbotica",t:"wayve",ty:"partnership",l:"Both LDN AV"},
];

// ── HELPERS ─────────────────────────────────────────────────────────────
function nr(c) {
  if(c.cat==="frontier") return 28;
  if(c.cat==="investor") return 11;
  if(c.cat==="academic") return 14;
  if(c.cat==="accelerator") return 10;
  if(c.cat==="frontier-emerging") return 20;
  const f=c.fn||0;
  if(f>=1000) return 24; if(f>=500) return 20; if(f>=200) return 17; if(f>=50) return 13; if(f>=10) return 11;
  return 9;
}

// ── STORAGE HELPERS ─────────────────────────────────────────────────────
function loadUserData() {
  try {
    const r = localStorage.getItem("user-network-v1");
    return r ? JSON.parse(r) : {};
  } catch { return {}; }
}
function saveUserData(data) {
  try { localStorage.setItem("user-network-v1", JSON.stringify(data)); } catch(e) { console.error("Save failed:", e); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const svgRef = useRef(null);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [cats, setCats] = useState(new Set(Object.keys(CC)));
  const [hov, setHov] = useState(null);
  const [yr, setYr] = useState([1990,2026]);
  const [dim, setDim] = useState({w:1200,h:800});
  const [tab, setTab] = useState("info");
  const [layout, setLayout] = useState("force"); // force | cluster
  const [userData, setUserData] = useState({});
  const [showMyNet, setShowMyNet] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [connForm, setConnForm] = useState({status:"target",contact:"",notes:""});

  // Load persistent user data
  useEffect(() => { setUserData(loadUserData()); }, []);

  // Responsive
  useEffect(() => {
    const u=()=>setDim({w:window.innerWidth,h:window.innerHeight});
    u(); window.addEventListener("resize",u); return()=>window.removeEventListener("resize",u);
  },[]);

  // Filter
  const filt = useMemo(()=>companies.filter(c=>{
    if(!cats.has(c.cat)) return false;
    if(search) { const q=search.toLowerCase(); if(!c.name.toLowerCase().includes(q) && !(c.focus||"").toLowerCase().includes(q) && !(c.founders||"").toLowerCase().includes(q) && !(c.s||"").toLowerCase().includes(q)) return false; }
    if(c.yr && (c.yr<yr[0]||c.yr>yr[1])) return false;
    if(showMyNet && !userData[c.id]) return false;
    return true;
  }),[cats,search,yr,showMyNet,userData]);

  const fEdges = useMemo(()=>{
    const ids=new Set(filt.map(c=>c.id));
    return edges.filter(e=>ids.has(e.s)&&ids.has(e.t));
  },[filt]);

  const hovConn = useMemo(()=>{
    if(!hov) return null;
    const c=new Set([hov]);
    edges.forEach(e=>{ if(e.s===hov)c.add(e.t); if(e.t===hov)c.add(e.s); });
    return c;
  },[hov]);

  const tc=(c)=>setCats(p=>{const n=new Set(p); n.has(c)?n.delete(c):n.add(c); return n;});

  // Save user connection
  const saveConn = (compId, data) => {
    const next = {...userData};
    if(data) next[compId]=data; else delete next[compId];
    setUserData(next);
    saveUserData(next);
    setEditingConn(null);
  };

  // ── D3 ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!svgRef.current) return;
    const svg=d3.select(svgRef.current); svg.selectAll("*").remove();
    const {w,h}=dim;
    const nodes=filt.map(c=>({...c,r:nr(c)}));
    const nodeMap=new Map(nodes.map(n=>[n.id,n]));
    const links=fEdges.filter(e=>nodeMap.has(e.s)&&nodeMap.has(e.t)).map(e=>({...e,source:e.s,target:e.t}));

    const g=svg.append("g");
    const zoom=d3.zoom().scaleExtent([0.08,6]).on("zoom",e=>g.attr("transform",e.transform));
    svg.call(zoom);
    svg.call(zoom.transform,d3.zoomIdentity.translate(w/2,h/2).scale(0.5).translate(-w/2,-h/2));

    // Glow filter
    const defs=svg.append("defs");
    const gl=defs.append("filter").attr("id","gl").attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%");
    gl.append("feGaussianBlur").attr("stdDeviation","4").attr("result","b");
    const mg=gl.append("feMerge"); mg.append("feMergeNode").attr("in","b"); mg.append("feMergeNode").attr("in","SourceGraphic");

    // Cluster positions
    const catCenters = {};
    if(layout==="cluster") {
      const catList = [...new Set(filt.map(c=>c.cat))];
      const cols = Math.ceil(Math.sqrt(catList.length));
      catList.forEach((cat,i)=>{
        const col=i%cols, row=Math.floor(i/cols);
        catCenters[cat]={x:w*0.15+col*(w*0.7/(cols-1||1)), y:h*0.15+row*(h*0.7/(Math.ceil(catList.length/cols)-1||1))};
      });
    }

    const sim=d3.forceSimulation(nodes)
      .force("link",d3.forceLink(links).id(d=>d.id).distance(d=>d.ty==="alumni"||d.ty==="spinoff"?90:d.ty==="investment"?140:110).strength(layout==="force"?0.2:0.05))
      .force("charge",d3.forceManyBody().strength(d=>-d.r*(layout==="force"?20:12)))
      .force("center",layout==="force"?d3.forceCenter(w/2,h/2).strength(0.04):null)
      .force("collision",d3.forceCollide().radius(d=>d.r+5))
      .force("x",d3.forceX(d=>layout==="cluster"&&catCenters[d.cat]?catCenters[d.cat].x:w/2).strength(layout==="cluster"?0.3:0.02))
      .force("y",d3.forceY(d=>layout==="cluster"&&catCenters[d.cat]?catCenters[d.cat].y:h/2).strength(layout==="cluster"?0.3:0.02));

    // Cluster labels
    if(layout==="cluster") {
      Object.entries(catCenters).forEach(([cat,pos])=>{
        g.append("text").text(CC[cat]?.label||cat).attr("x",pos.x).attr("y",pos.y-60)
          .attr("text-anchor","middle").attr("fill",CC[cat]?.color||"#666").attr("font-size","11px")
          .attr("font-family","'Outfit',sans-serif").attr("font-weight","600").attr("opacity",0.5);
      });
    }

    // Edges
    const link=g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke",d=>EC[d.ty]?.color||"#333").attr("stroke-width",d=>d.ty==="alumni"?1.5:0.8).attr("stroke-opacity",0.18).attr("stroke-dasharray",d=>EC[d.ty]?.dash||null);

    // Nodes
    const node=g.append("g").selectAll("g").data(nodes).enter().append("g").attr("cursor","pointer")
      .call(d3.drag()
        .on("start",(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;})
        .on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y;})
        .on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}))
      .on("click",(e,d)=>{e.stopPropagation();setSel(p=>p?.id===d.id?null:companies.find(c=>c.id===d.id));setTab("info");})
      .on("mouseenter",(e,d)=>setHov(d.id)).on("mouseleave",()=>setHov(null));

    // Glow ring
    node.append("circle").attr("r",d=>d.r+2).attr("fill","none")
      .attr("stroke",d=>CC[d.cat]?.color||"#666").attr("stroke-width",0.8).attr("stroke-opacity",0.12).attr("filter","url(#gl)");

    // Main circle
    node.append("circle").attr("r",d=>d.r)
      .attr("fill",d=>(CC[d.cat]?.color||"#666")+"1A")
      .attr("stroke",d=>CC[d.cat]?.color||"#666").attr("stroke-width",1.3);

    // User connection indicator (outer ring)
    node.filter(d=>userData[d.id]).append("circle").attr("r",d=>d.r+5)
      .attr("fill","none")
      .attr("stroke",d=>USER_STATUS[userData[d.id]?.status]?.color||"#30D158")
      .attr("stroke-width",2).attr("stroke-dasharray","3,2").attr("stroke-opacity",0.8);

    // Icon
    node.append("text").text(d=>CC[d.cat]?.icon||"")
      .attr("text-anchor","middle").attr("dominant-baseline","central")
      .attr("font-size",d=>Math.max(d.r*0.6,8)+"px").attr("pointer-events","none");

    // Label
    node.append("text").text(d=>{const n=d.s||d.name; return n.length>15?n.slice(0,13)+"…":n;})
      .attr("text-anchor","middle").attr("dy",d=>d.r+12)
      .attr("fill","#8899AA").attr("font-size",d=>d.r>16?"9.5px":"7.5px")
      .attr("font-family","'JetBrains Mono',monospace").attr("pointer-events","none");

    svg.on("click",()=>setSel(null));

    sim.on("tick",()=>{
      link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      node.attr("transform",d=>`translate(${d.x},${d.y})`);
    });
    return()=>sim.stop();
  },[filt,fEdges,dim,layout,userData]);

  // Hover highlight
  useEffect(()=>{
    if(!svgRef.current) return;
    const svg=d3.select(svgRef.current);
    if(!hov){svg.selectAll("g>g>g").attr("opacity",1);svg.selectAll("line").attr("stroke-opacity",0.18);return;}
    svg.selectAll("g>g>g").each(function(d){d3.select(this).attr("opacity",hovConn?.has(d?.id)?1:0.08);});
    svg.selectAll("line").each(function(d){
      const si=typeof d?.source==="object"?d.source.id:d?.source;
      const ti=typeof d?.target==="object"?d.target.id:d?.target;
      const c=si===hov||ti===hov;
      d3.select(this).attr("stroke-opacity",c?0.65:0.03).attr("stroke-width",c?2.5:0.8);
    });
  },[hov,hovConn]);

  const ce=sel?edges.filter(e=>e.s===sel.id||e.t===sel.id):[];
  const ud=sel?userData[sel.id]:null;
  const myNetCount=Object.keys(userData).length;

  return (
    <div style={{width:"100vw",height:"100vh",background:"#060A14",overflow:"hidden",fontFamily:"'JetBrains Mono','SF Mono',monospace",position:"relative",color:"#E2E8F0"}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:4px}
        input[type=range]{-webkit-appearance:none;background:transparent}input[type=range]::-webkit-slider-track{height:3px;background:#1E293B;border-radius:2px}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;background:#FF2D55;margin-top:-3.5px;cursor:pointer}
      `}</style>

      {/* HEADER */}
      <div style={{position:"absolute",top:0,left:0,right:0,padding:"12px 16px",background:"linear-gradient(180deg,rgba(6,10,20,0.97),rgba(6,10,20,0))",zIndex:10,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flexShrink:0}}>
          <h1 style={{margin:0,fontSize:20,fontFamily:"'Outfit',sans-serif",fontWeight:800,letterSpacing:"-0.5px",background:"linear-gradient(135deg,#FF2D55,#BF5AF2,#00D4FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>London AI Ecosystem</h1>
          <p style={{margin:"1px 0 0",fontSize:9.5,color:"#475569"}}>{filt.length} entities · {fEdges.length} connections · {myNetCount>0?`${myNetCount} in your network · `:""}v3.0</p>
        </div>
        <div style={{flex:1}}/>
        {/* Layout toggle */}
        <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:"1px solid #1E293B"}}>
          {[["force","Constellation"],["cluster","Cluster"]].map(([k,l])=>(
            <button key={k} onClick={()=>setLayout(k)} style={{padding:"4px 10px",border:"none",background:layout===k?"#1E293B":"transparent",color:layout===k?"#E2E8F0":"#475569",fontSize:9,fontFamily:"inherit",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {/* My Network toggle */}
        <button onClick={()=>setShowMyNet(!showMyNet)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${showMyNet?"#30D158":"#1E293B"}`,background:showMyNet?"#30D15822":"transparent",color:showMyNet?"#30D158":"#64748B",fontSize:9,fontFamily:"inherit",cursor:"pointer"}}>
          {showMyNet?"🤝 My Network":"🤝 My Network"}
        </button>
        <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{padding:"6px 10px 6px 26px",borderRadius:7,border:"1px solid #1E293B",background:"#0F172A",color:"#E2E8F0",fontSize:10.5,width:180,outline:"none",fontFamily:"inherit"}}/>
      </div>

      {/* LEFT SIDEBAR */}
      <div style={{position:"absolute",top:60,left:8,zIndex:10,background:"rgba(15,23,42,0.9)",borderRadius:11,padding:"8px 8px 12px",backdropFilter:"blur(14px)",border:"1px solid #1E293B",maxHeight:"calc(100vh - 80px)",overflowY:"auto",width:165}}>
        <div style={{display:"flex",gap:3,marginBottom:6}}>
          <button onClick={()=>setCats(new Set(Object.keys(CC)))} style={B}>All</button>
          <button onClick={()=>setCats(new Set())} style={B}>None</button>
          <button onClick={()=>setCats(new Set(Object.keys(CC).filter(k=>!["investor","academic","accelerator"].includes(k))))} style={B}>Cos</button>
        </div>
        {Object.entries(CC).map(([k,cfg])=>{
          const a=cats.has(k), cnt=companies.filter(c=>c.cat===k).length;
          return(
            <div key={k} onClick={()=>tc(k)} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 4px",borderRadius:4,cursor:"pointer",opacity:a?1:0.25,transition:"opacity 0.15s"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:cfg.color,flexShrink:0}}/>
              <span style={{fontSize:9,color:"#CBD5E1",flex:1}}>{cfg.label}</span>
              <span style={{fontSize:7.5,color:"#475569"}}>{cnt}</span>
            </div>
          );
        })}
        <div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #1E293B"}}>
          <div style={{fontSize:8,color:"#475569",fontWeight:600,marginBottom:4}}>FOUNDED {yr[0]}–{yr[1]}</div>
          <input type="range" min={1990} max={2026} value={yr[0]} onChange={e=>setYr([+e.target.value,yr[1]])} style={{width:"100%"}}/>
          <input type="range" min={1990} max={2026} value={yr[1]} onChange={e=>setYr([yr[0],+e.target.value])} style={{width:"100%"}}/>
        </div>
        <div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #1E293B"}}>
          <div style={{fontSize:8,color:"#475569",fontWeight:600,marginBottom:4}}>CONNECTIONS</div>
          {Object.entries(EC).map(([t,cfg])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
              <div style={{width:12,height:1.5,background:cfg.color,borderRadius:1}}/>
              <span style={{fontSize:8,color:"#64748B"}}>{cfg.label}</span>
            </div>
          ))}
        </div>
        {myNetCount>0&&<div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #1E293B"}}>
          <div style={{fontSize:8,color:"#475569",fontWeight:600,marginBottom:4}}>YOUR NETWORK ({myNetCount})</div>
          {Object.entries(USER_STATUS).map(([k,cfg])=>{
            const cnt=Object.values(userData).filter(d=>d.status===k).length;
            if(!cnt) return null;
            return(<div key={k} style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
              <span style={{fontSize:8}}>{cfg.icon}</span>
              <span style={{fontSize:8,color:cfg.color}}>{cfg.label}: {cnt}</span>
            </div>);
          })}
        </div>}
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={dim.w} height={dim.h} style={{display:"block"}}/>

      {/* DETAIL PANEL */}
      {sel&&<div style={{position:"absolute",top:60,right:8,width:340,maxHeight:"calc(100vh - 80px)",overflowY:"auto",background:"rgba(15,23,42,0.95)",borderRadius:13,backdropFilter:"blur(16px)",border:"1px solid #1E293B",zIndex:20}}>
        {/* Header */}
        <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #1E293B"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div>
              <span style={{fontSize:8.5,color:CC[sel.cat]?.color,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{CC[sel.cat]?.icon} {CC[sel.cat]?.label}</span>
              <h2 style={{margin:"3px 0 0",fontSize:17,fontFamily:"'Outfit',sans-serif",fontWeight:700,color:"#F8FAFC"}}>{sel.name}</h2>
              {sel.hq&&<p style={{margin:"2px 0 0",fontSize:9.5,color:"#64748B"}}>📍 {sel.hq}{sel.yr?` · ${sel.yr}`:""}</p>}
            </div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"#475569",fontSize:16,cursor:"pointer",padding:0}}>✕</button>
          </div>
          {/* User connection badge */}
          {ud&&<div style={{marginTop:8,padding:"5px 8px",borderRadius:6,background:USER_STATUS[ud.status]?.color+"1A",border:`1px solid ${USER_STATUS[ud.status]?.color}33`,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>{USER_STATUS[ud.status]?.icon}</span>
            <span style={{fontSize:10,color:USER_STATUS[ud.status]?.color,fontWeight:600}}>{USER_STATUS[ud.status]?.label}</span>
            {ud.contact&&<span style={{fontSize:9,color:"#94A3B8",marginLeft:4}}>· {ud.contact}</span>}
          </div>}
          {/* Tabs */}
          <div style={{display:"flex",gap:0,marginTop:10}}>
            {["info","people","connections","my network"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"5px 0",border:"none",borderBottom:tab===t?`2px solid ${CC[sel.cat]?.color}`:"2px solid transparent",background:"none",color:tab===t?"#F8FAFC":"#475569",fontSize:9,fontFamily:"inherit",cursor:"pointer",textTransform:"uppercase",fontWeight:600,letterSpacing:0.3}}>{t==="my network"?"🤝 Mine":t}</button>
            ))}
          </div>
        </div>

        <div style={{padding:"12px 16px 16px"}}>
          {tab==="info"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:12}}>
              {sel.fund&&<M l="Funding" v={sel.fund}/>}
              {sel.val&&<M l="Valuation" v={sel.val}/>}
              {sel.emp&&<M l="Team" v={sel.emp}/>}
              {sel.yr&&<M l="Founded" v={sel.yr}/>}
            </div>
            {sel.focus&&<S t="Focus" v={sel.focus}/>}
            {sel.ethos&&<S t="Ethos" v={sel.ethos}/>}
            {sel.ms&&<S t="Milestones" v={sel.ms}/>}
            {sel.jobs&&<div style={{marginTop:10}}>
              <a href={sel.jobs} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"7px 14px",borderRadius:7,background:"#1E293B",color:"#E2E8F0",fontSize:10,textDecoration:"none",fontFamily:"inherit",fontWeight:500,border:"1px solid #334155"}}>
                🔗 Careers Page →
              </a>
            </div>}
          </>}
          {tab==="people"&&<>
            {sel.founders&&<S t="Founders" v={sel.founders}/>}
            {sel.kp&&<S t="Key People" v={sel.kp}/>}
            {sel.iv&&<S t="Interviews & Podcasts" v={sel.iv}/>}
          </>}
          {tab==="connections"&&<>
            {ce.length===0?<p style={{fontSize:10,color:"#475569"}}>No mapped connections.</p>:
              ce.map((e,i)=>{
                const oid=e.s===sel.id?e.t:e.s;
                const o=companies.find(c=>c.id===oid);
                if(!o) return null;
                return(<div key={i} onClick={()=>{setSel(o);setTab("info");}} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:5,cursor:"pointer",marginBottom:2,background:"rgba(30,41,59,0.3)"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:EC[e.ty]?.color||"#444",flexShrink:0}}/>
                  <span style={{fontSize:10.5,color:"#CBD5E1",flex:1}}>{o.name}</span>
                  {e.l&&<span style={{fontSize:8,color:"#475569"}}>{e.l}</span>}
                  <span style={{fontSize:7.5,color:"#374151",textTransform:"uppercase"}}>{e.ty}</span>
                </div>);
              })
            }
          </>}
          {tab==="my network"&&<>
            <p style={{fontSize:9.5,color:"#64748B",marginBottom:10}}>Track your personal connection to {sel.name}. Saved across sessions.</p>
            {editingConn===sel.id?<>
              <div style={{marginBottom:8}}>
                <label style={{fontSize:8.5,color:"#64748B",display:"block",marginBottom:3}}>STATUS</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {Object.entries(USER_STATUS).map(([k,cfg])=>(
                    <button key={k} onClick={()=>setConnForm(p=>({...p,status:k}))} style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${connForm.status===k?cfg.color:"#1E293B"}`,background:connForm.status===k?cfg.color+"22":"transparent",color:connForm.status===k?cfg.color:"#64748B",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:8}}>
                <label style={{fontSize:8.5,color:"#64748B",display:"block",marginBottom:3}}>CONTACT NAME (optional)</label>
                <input type="text" value={connForm.contact} onChange={e=>setConnForm(p=>({...p,contact:e.target.value}))} placeholder="e.g. Jane Smith, PM" style={{width:"100%",padding:"5px 8px",borderRadius:5,border:"1px solid #1E293B",background:"#0F172A",color:"#E2E8F0",fontSize:10,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:8.5,color:"#64748B",display:"block",marginBottom:3}}>NOTES (optional)</label>
                <textarea value={connForm.notes} onChange={e=>setConnForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. Met at conference, warm intro possible" rows={3} style={{width:"100%",padding:"5px 8px",borderRadius:5,border:"1px solid #1E293B",background:"#0F172A",color:"#E2E8F0",fontSize:10,fontFamily:"inherit",outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>saveConn(sel.id,connForm)} style={{flex:1,padding:"6px",borderRadius:6,border:"none",background:"#30D158",color:"#000",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                <button onClick={()=>setEditingConn(null)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #1E293B",background:"transparent",color:"#64748B",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                {ud&&<button onClick={()=>saveConn(sel.id,null)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #FF453A33",background:"transparent",color:"#FF453A",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>}
              </div>
            </>:<>
              {ud?<div>
                <div style={{padding:"10px",borderRadius:8,background:"#0F172A",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:14}}>{USER_STATUS[ud.status]?.icon}</span>
                    <span style={{fontSize:12,color:USER_STATUS[ud.status]?.color,fontWeight:600}}>{USER_STATUS[ud.status]?.label}</span>
                  </div>
                  {ud.contact&&<div style={{fontSize:10.5,color:"#CBD5E1",marginBottom:2}}>Contact: {ud.contact}</div>}
                  {ud.notes&&<div style={{fontSize:10,color:"#94A3B8",lineHeight:1.4,marginTop:4}}>{ud.notes}</div>}
                </div>
                <button onClick={()=>{setConnForm(ud);setEditingConn(sel.id);}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #1E293B",background:"transparent",color:"#94A3B8",fontSize:9.5,cursor:"pointer",fontFamily:"inherit"}}>Edit Connection</button>
              </div>:<>
                <p style={{fontSize:10,color:"#475569",marginBottom:8}}>No connection tracked yet.</p>
                <button onClick={()=>{setConnForm({status:"target",contact:"",notes:""});setEditingConn(sel.id);}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #30D15855",background:"#30D15811",color:"#30D158",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>+ Add Connection</button>
              </>}
            </>}
          </>}
        </div>
      </div>}

      {/* BOTTOM */}
      {!sel&&<div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",background:"rgba(15,23,42,0.8)",borderRadius:9,padding:"6px 16px",backdropFilter:"blur(8px)",border:"1px solid #1E293B",zIndex:10}}>
        <p style={{margin:0,fontSize:9.5,color:"#475569",textAlign:"center"}}>Click → details · Hover → highlight · Drag · Scroll zoom · 🤝 My Network to track your connections</p>
      </div>}

      {/* Stats */}
      <div style={{position:"absolute",bottom:12,right:12,display:"flex",gap:6,zIndex:10}}>
        <SB l="Companies" v={filt.filter(c=>!["investor","academic","accelerator"].includes(c.cat)).length} c="#FF2D55"/>
        <SB l="Investors" v={filt.filter(c=>c.cat==="investor").length} c="#FFD700"/>
        {myNetCount>0&&<SB l="Your Net" v={myNetCount} c="#30D158"/>}
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────────────────
const B={flex:1,padding:"2px",borderRadius:4,border:"1px solid #1E293B",background:"transparent",color:"#64748B",fontSize:8,cursor:"pointer",fontFamily:"inherit"};
function M({l,v}){return(<div style={{background:"#0F172A",borderRadius:6,padding:"6px 8px"}}><div style={{fontSize:7.5,color:"#475569",textTransform:"uppercase",letterSpacing:0.5,marginBottom:1}}>{l}</div><div style={{fontSize:11,color:"#E2E8F0",fontWeight:500}}>{String(v)}</div></div>);}
function S({t,v}){return(<div style={{marginBottom:10}}><div style={{fontSize:8.5,color:"#64748B",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2,fontWeight:600}}>{t}</div><div style={{fontSize:10.5,color:"#CBD5E1",lineHeight:1.5}}>{v}</div></div>);}
function SB({l,v,c}){return(<div style={{background:"rgba(15,23,42,0.85)",borderRadius:7,padding:"4px 9px",backdropFilter:"blur(8px)",border:"1px solid #1E293B",textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:c,fontFamily:"'Outfit',sans-serif"}}>{v}</div><div style={{fontSize:7.5,color:"#475569",textTransform:"uppercase"}}>{l}</div></div>);}
