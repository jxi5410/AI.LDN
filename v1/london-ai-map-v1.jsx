import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";

// ── Data ────────────────────────────────────────────────────────────────────
const companies = [
  // FRONTIER LABS
  { id: "deepmind", name: "Google DeepMind", category: "frontier", founded: 2010, employees: "~3,000 (London)", funding: "Acquired $500-650M (2014)", valuation: "Alphabet subsidiary", founders: "Demis Hassabis, Shane Legg, Mustafa Suleyman", focus: "AGI research, AlphaFold, Gemini, RL, robotics, weather", ethos: "Solve intelligence to advance science", hq: "King's Cross", keyPeople: "Demis Hassabis (CEO, Nobel 2024), Shane Legg (Chief Scientist), Koray Kavukcuoglu (VP Research)", milestones: "AlphaGo (2016), AlphaFold (2020), Gemini (2023), Nobel Prize (2024)", interviews: "Demis Hassabis: Lex Fridman, Tim Ferriss, BBC HARDtalk" },
  { id: "anthropic", name: "Anthropic", category: "frontier", founded: 2021, employees: "~1,000+ (global)", funding: "~$30B", valuation: "$380B", founders: "Dario Amodei, Daniela Amodei", focus: "AI safety, Constitutional AI, Claude models", ethos: "Safety-first, responsible scaling", hq: "Cheapside (London office)", keyPeople: "Pip White (EMEA North), Guillaume Princen (Head of EMEA)", milestones: "London office (May 2023), Claude 3.5 (2024), 100+ UK roles (2025)", interviews: "Dario Amodei: Lex Fridman, Dwarkesh Patel, All-In" },
  { id: "openai", name: "OpenAI", category: "frontier", founded: 2015, employees: "~92-300 (London)", funding: "$10B+ (Microsoft)", valuation: "$157B+ (Oct 2024)", founders: "Sam Altman et al.", focus: "GPT models, ChatGPT, DALL-E, Sora, o1 reasoning", ethos: "Ensure AGI benefits all of humanity", hq: "King's Cross (London office)", keyPeople: "Sam Altman (CEO), first non-US office", milestones: "London office (Jun 2023), UK govt MoU (Jul 2025), 'Humphrey' AI for Whitehall", interviews: "Sam Altman: multiple podcast circuits" },
  { id: "meta-ai", name: "Meta AI / FAIR", category: "frontier", founded: 2013, employees: "~3,000 (global post-cuts)", funding: "Meta subsidiary", valuation: "Meta subsidiary", founders: "Yann LeCun (FAIR)", focus: "Llama models, computer vision, AR/VR, open-source AI", ethos: "Open-source AI research", hq: "London research office", keyPeople: "Rob Fergus (FAIR lead, ex-DeepMind), Yann LeCun departed Nov 2025", milestones: "Llama 3 (2024), Meta Superintelligence Labs (2025), 600 job cuts (Oct 2025)", interviews: "Yann LeCun: Lex Fridman, TED" },
  { id: "microsoft-research", name: "Microsoft Research", category: "frontier", founded: 1997, employees: "6,000 UK-wide", funding: "Microsoft subsidiary", valuation: "Microsoft subsidiary", founders: "Roger Needham (Cambridge lab)", focus: "ML, AI for science, security, mixed reality", ethos: "Empowering through technology", hq: "Cambridge + Paddington AI Hub", keyPeople: "Mustafa Suleyman (CEO Microsoft AI), Jordan Hoffmann (London Hub, ex-DeepMind/Inflection)", milestones: "$30B UK investment (2025-28), London AI Hub (Apr 2024), UK's largest supercomputer", interviews: "Mustafa Suleyman: multiple" },
  { id: "mistral", name: "Mistral AI", category: "frontier", founded: 2023, employees: "280+", funding: "€486M+", valuation: "€5.8B", founders: "Arthur Mensch (ex-DeepMind), Guillaume Lample, Timothée Lacroix (ex-Meta)", focus: "Open-source frontier LLMs, enterprise AI", ethos: "European sovereign AI, open-source", hq: "Paris (London satellite)", keyPeople: "Arthur Mensch (CEO)", milestones: "Mistral 7B (2023), Mixtral MoE, Le Chat platform", interviews: "Arthur Mensch: Sifted, TechCrunch Disrupt" },
  { id: "cohere", name: "Cohere", category: "frontier", founded: 2019, employees: "~500 (25-50 London)", funding: "~$1B", valuation: "$5.5B+", founders: "Aidan Gomez (Attention paper co-author, Oxford), Ivan Zhang, Nick Frosst", focus: "Enterprise NLP, Command models, RAG, North platform", ethos: "Enterprise-focused, cloud-agnostic", hq: "Toronto (London research hub)", keyPeople: "Aidan Gomez (CEO), Phil Blunsom (Chief Scientist, ex-Oxford), Joelle Pineau (CAO, ex-Meta FAIR)", milestones: "Plans to double London headcount (2023), Hired Pineau (2025)", interviews: "Aidan Gomez: No Priors, TechCrunch" },

  // WELL-FUNDED STARTUPS
  { id: "wayve", name: "Wayve", category: "autonomous", founded: 2017, employees: "350+", funding: "~$2.5B", valuation: "$8.6B", founders: "Alex Kendall (Cambridge PhD, OBE), Amar Shah", focus: "End-to-end autonomous driving, embodied AI", ethos: "AI-first, no HD maps or lidar", hq: "London", keyPeople: "Alex Kendall (CEO), Jamie Shotton (Chief Scientist, ex-Microsoft)", milestones: "$1.2B Series D (Feb 2026), Uber L4 trials London (2026), Nissan partnership", interviews: "Alex Kendall: Lex Fridman, AI Podcast" },
  { id: "synthesia", name: "Synthesia", category: "generative", founded: 2017, employees: "400+", funding: "~$530M", valuation: "$4B", founders: "Victor Riparbelli (CEO), Steffen Tjerrild, Prof Matthias Niessner (TU Munich), Prof Lourdes Agapito (UCL)", focus: "AI video generation, enterprise communications", ethos: "Ethics-first (no deepfakes of real people)", hq: "London", keyPeople: "Victor Riparbelli (CEO, Forbes 30 Under 30)", milestones: "$200M Series E (Jan 2026), $100M ARR (Apr 2025), 60-80% Fortune 100", interviews: "Victor Riparbelli: 20VC, Sifted" },
  { id: "isomorphic", name: "Isomorphic Labs", category: "biotech", founded: 2021, employees: "200+", funding: "$600M", valuation: "Undisclosed (Alphabet)", founders: "Demis Hassabis (dual CEO)", focus: "AI drug discovery, AlphaFold-derived models", ethos: "Solve all disease", hq: "King's Cross", keyPeople: "Demis Hassabis (CEO), Max Jaderberg (CTO)", milestones: "$600M Series A (Apr 2025), Eli Lilly/Novartis deals (~$3B milestones), IsoDDE 'AlphaFold 4' (Feb 2026)", interviews: "Hassabis on Isomorphic: Nature, CNBC" },
  { id: "elevenlabs", name: "ElevenLabs", category: "generative", founded: 2022, employees: "330", funding: "$781M", valuation: "$11B", founders: "Mati Staniszewski (ex-Palantir, Imperial), Piotr Dąbkowski (ex-Google/DeepMind, Oxford/Cambridge)", focus: "AI voice synthesis, TTS, dubbing, voice cloning, music", ethos: "Break language barriers", hq: "London (Soho)", keyPeople: "Mati Staniszewski (CEO), Piotr Dąbkowski (CTO)", milestones: "$500M Series D (Feb 2026), $330M ARR, 41% Fortune 500, eyeing IPO", interviews: "Staniszewski: 20VC, Bloomberg" },
  { id: "stability", name: "Stability AI", category: "generative", founded: 2019, employees: "~190", funding: "~$181-399M", valuation: "$1B (maintained)", founders: "Emad Mostaque (departed Mar 2024)", focus: "Open-source image/video/audio/3D generation", ethos: "Open-source generative AI", hq: "Notting Hill", keyPeople: "Prem Akkaraju (CEO), Sean Parker (Exec Chairman), James Cameron (Board)", milestones: "Stable Diffusion (Aug 2022), leadership crisis (2024), EA/WMG partnerships", interviews: "Emad Mostaque: multiple (pre-departure)" },
  { id: "darktrace", name: "Darktrace", category: "cybersecurity", founded: 2013, employees: "2,400+", funding: "~$230M (pre-IPO)", valuation: "$5.3B (Thoma Bravo)", founders: "Poppy Gustafsson (now Baroness), Jack Stockdale, Nicole Eagan", focus: "Self-learning AI cybersecurity", ethos: "Immune system approach to cyber", hq: "Cambridge + London", keyPeople: "Poppy Gustafsson (now UK Minister of Investment)", milestones: "IPO (Apr 2021), Thoma Bravo acquisition $5.3B (Oct 2024)", interviews: "Poppy Gustafsson: BBC, Fortune" },
  { id: "graphcore", name: "Graphcore", category: "hardware", founded: 2016, employees: "~500", funding: "$710-767M", valuation: "$2.77B peak → acquired", founders: "Nigel Toon, Simon Knowles, Hermann Hauser (ARM co-founder)", focus: "Intelligence Processing Units (IPUs) for AI", ethos: "Purpose-built AI hardware", hq: "Bristol + London", keyPeople: "Nigel Toon (CEO)", milestones: "Acquired by SoftBank (Jul 2024, ~$500M), $1B India investment", interviews: "Nigel Toon: Cerebral Valley, Bloomberg" },
  { id: "faculty", name: "Faculty AI", category: "enterprise", founded: 2014, employees: "400", funding: "~£40M VC", valuation: "~£600M+ (Accenture acquisition)", founders: "Dr Marc Warner, Dr Angie Ma", focus: "Decision intelligence, government AI", ethos: "AI for institutional decision-making", hq: "Welbeck Street", keyPeople: "Marc Warner (CEO → Accenture CTO)", milestones: "Accenture acquisition ~$1B+ (Jan 2026), OpenAI red teaming, NHS/MoD contracts", interviews: "Marc Warner: AI Summit London" },
  { id: "benevolentai", name: "BenevolentAI", category: "biotech", founded: 2013, employees: "~69", funding: "~$700M+", valuation: "€1.5B (SPAC peak)", founders: "Kenneth Mulvany", focus: "AI knowledge graph for drug discovery", ethos: "AI to cure disease", hq: "Fitzrovia", keyPeople: "Kenneth Mulvany (Exec Chairman)", milestones: "COVID baricitinib discovery (2020), SPAC listing (2021), delisted (Mar 2025)", interviews: "Mulvany: BioWorld, Endpoints" },
  { id: "polyai", name: "PolyAI", category: "enterprise", founded: 2017, employees: "200+", funding: "$206M", valuation: "$500M+", founders: "Nikola Mrkšić (ex-Apple/VocalIQ), Tsung-Hsien Wen (ex-Google), Pei-Hao Su (ex-Facebook)", focus: "Enterprise voice AI agents for customer service", ethos: "Human-quality voice AI", hq: "Holborn", keyPeople: "Nikola Mrkšić (CEO)", milestones: "$86M Series D (Dec 2025), 100+ enterprise clients incl FedEx, Marriott", interviews: "Mrkšić: AI Business podcast" },
  { id: "helsing", name: "Helsing", category: "defence", founded: 2021, employees: "275-500", funding: "€1.37B", valuation: "€12B", founders: "Torsten Reil, Dr Gundbert Scherf", focus: "Military AI, battlefield intelligence, autonomous drones", ethos: "AI for democratic defence only", hq: "Munich (London office)", keyPeople: "Amelia Gould (UK MD)", milestones: "€600M Series D (Jun 2025), AI fighter pilot (May 2025), £350M UK investment", interviews: "Torsten Reil: Sifted, FT" },
  { id: "cleo", name: "Cleo AI", category: "fintech", founded: 2016, employees: "300-500", funding: "~$138-175M", valuation: "$500M+", founders: "Barney Hussey-Yeo", focus: "AI financial assistant for Gen Z", ethos: "Make money less stressful (with sass)", hq: "London", keyPeople: "Barney Hussey-Yeo (CEO)", milestones: "$300M+ ARR, profitable, 6M+ users, 743K paid subscribers", interviews: "Hussey-Yeo: TechCrunch, Sifted" },
  { id: "tractable", name: "Tractable", category: "enterprise", founded: 2014, employees: "~117-224", funding: "$185M", valuation: "$1B (unicorn Jun 2021)", founders: "Alex Dalyac (LSE/Imperial), Razvan Ranca (Cambridge), Adrien Cohen", focus: "Computer vision for insurance damage assessment", ethos: "AI to accelerate accident recovery", hq: "London", keyPeople: "Alex Dalyac (CEO)", milestones: "UK's first CV unicorn (2021), $7B+ vehicle repairs processed annually", interviews: "Dalyac: InsurTech Digital, Sifted" },
  { id: "signal-ai", name: "Signal AI", category: "enterprise", founded: 2013, employees: "220-243", funding: "$268M", valuation: "Undisclosed", founders: "David Benigson, Dr Miguel Martinez, Wesley Hall", focus: "External intelligence, reputation risk, media monitoring", ethos: "AI-powered decision intelligence", hq: "London", keyPeople: "David Benigson (CEO)", milestones: "$165M Battery Ventures growth equity (Sep 2025), 40% Fortune 500 clients", interviews: "Benigson: PRmoment Podcast, Sifted" },
  { id: "abound", name: "Abound", category: "fintech", founded: 2020, employees: "100-130", funding: "£1.6B+ (debt+equity)", valuation: "Undisclosed", founders: "Gerald Chappell (ex-McKinsey, PhD maths), Dr Michelle He (ex-EY, PhD CS)", focus: "AI lending using Open Banking data", ethos: "Fair credit through AI", hq: "London", keyPeople: "Gerald Chappell (CEO), Michelle He (COO)", milestones: "Profitable since Apr 2024, £66.8M revenue (+151% YoY), 70-75% lower defaults", interviews: "Chappell: City AM, FT" },

  // EMERGING / SEED
  { id: "ineffable", name: "Ineffable Intelligence", category: "frontier-emerging", founded: 2025, employees: "Early", funding: "Seeking $1B seed", valuation: "~$4B target", founders: "David Silver (ex-DeepMind, AlphaGo lead, UCL Prof)", focus: "RL-based superintelligence, self-discovering knowledge", ethos: "Beyond LLMs — first-principles intelligence", hq: "London", keyPeople: "David Silver", milestones: "Founded Nov 2025, potentially Europe's largest-ever seed", interviews: "Silver: Nature, DeepMind talks" },
  { id: "tessl", name: "Tessl", category: "devtools", founded: 2024, employees: "Early", funding: "$125M", valuation: "$750M", founders: "Guy Podjarny (ex-Akamai CTO, Snyk founder $7.4B)", focus: "AI-native software development", ethos: "Spec-driven development", hq: "London", keyPeople: "Guy Podjarny (CEO)", milestones: "$125M raised pre-product, Index Ventures led", interviews: "Podjarny: Sifted, The Changelog" },
  { id: "physicsx", name: "PhysicsX", category: "enterprise", founded: 2023, employees: "150+", funding: "~$175M", valuation: "~$1B", founders: "Robin Tuluie (ex-F1 R&D), Jacomo Corbo (ex-Bentley)", focus: "Large Physics Models for engineering simulation", ethos: "AI-powered engineering", hq: "London", keyPeople: "Robin Tuluie (CEO)", milestones: "$135M Series B (Jun 2025) led by Atomico, Siemens partnership", interviews: "Tuluie: Deep Tech talks" },
  { id: "conjecture", name: "Conjecture", category: "safety", founded: 2021, employees: "~13", funding: "~$25M", valuation: "Undisclosed", founders: "Connor Leahy (EleutherAI), Sid Black, Gabriel Alfour", focus: "Cognitive Emulation, controllable AI alignment", ethos: "AI safety research & advocacy", hq: "London", keyPeople: "Connor Leahy (CEO)", milestones: "House of Lords AI policy engagement, $25M from Karpathy/Collisons/Friedman", interviews: "Connor Leahy: 80,000 Hours, MIRI" },
  { id: "holistic-ai", name: "Holistic AI", category: "governance", founded: 2020, employees: "43-79", funding: "Undisclosed (raising $200M)", valuation: "Undisclosed", founders: "Dr Adriano Koshiyama (ex-Goldman, UCL), Dr Emre Kazim (UCL)", focus: "AI governance, risk management, EU AI Act compliance", ethos: "Responsible AI governance", hq: "Soho Square", keyPeople: "Adriano Koshiyama (CEO)", milestones: "Mozilla Ventures investment, 500+ enterprise clients", interviews: "Koshiyama: AI governance conferences" },
  { id: "encord", name: "Encord", category: "devtools", founded: 2020, employees: "50+", funding: "~€50M+", valuation: "Undisclosed", founders: "Eric Landau, Ulrik Stig Hansen", focus: "AI data annotation, fine-tuning, agent deployment", ethos: "Data-centric AI development", hq: "London", keyPeople: "Eric Landau (CEO)", milestones: "€50M Series C (Feb 2026), 300+ enterprise clients, Sifted AI 100", interviews: "Landau: AI data talks" },

  // INVESTORS (shown as nodes)
  { id: "balderton", name: "Balderton Capital", category: "investor", founded: 2000, focus: "Europe's largest early-stage fund, $3B+", hq: "London", keyPeople: "Suranga Chandratillake" },
  { id: "atomico", name: "Atomico", category: "investor", founded: 2006, focus: "European tech VC (Niklas Zennström/Skype)", hq: "London", keyPeople: "Siraj Khaliq (AI)" },
  { id: "localglobe", name: "LocalGlobe", category: "investor", founded: 2015, focus: "Seed-stage VC", hq: "London", keyPeople: "Robin & Saul Klein" },
  { id: "air-street", name: "Air Street Capital", category: "investor", founded: 2019, focus: "AI-specialist fund, State of AI Report", hq: "London", keyPeople: "Nathan Benaich" },
  { id: "sequoia-eu", name: "Sequoia (Europe)", category: "investor", founded: 1972, focus: "Global VC, active in London AI", hq: "London office", keyPeople: "Luciana Lixandru" },
  { id: "accel", name: "Accel", category: "investor", founded: 1983, focus: "Global VC, GenAI reports", hq: "London office", keyPeople: "Luciana Lixandru" },
  { id: "softbank", name: "SoftBank Vision Fund", category: "investor", founded: 2017, focus: "Vision Fund, massive AI bets", hq: "London office", keyPeople: "Masayoshi Son" },
  { id: "nvidia-inv", name: "Nvidia (Strategic)", category: "investor", founded: 1993, focus: "£2B UK pledge, strategic AI investments", hq: "US (active London)", keyPeople: "Jensen Huang" },

  // ACADEMIC
  { id: "ucl", name: "UCL", category: "academic", founded: 1826, focus: "Gatsby Unit (DeepMind birthplace), AI Hub in Generative Models", hq: "Bloomsbury / King's Cross" },
  { id: "cambridge", name: "Cambridge", category: "academic", founded: 1209, focus: "ML Group, #1 GenAI founder university in Europe (7.9%)", hq: "Cambridge" },
  { id: "oxford", name: "Oxford", category: "academic", founded: 1096, focus: "OATML, NLP lab, spin-out powerhouse", hq: "Oxford" },
  { id: "imperial", name: "Imperial College", category: "academic", founded: 1907, focus: "Robotics, CV, healthcare AI, 7% of EU GenAI founders", hq: "South Kensington" },
  { id: "turing", name: "Alan Turing Institute", category: "academic", founded: 2015, focus: "UK national AI/data science institute", hq: "British Library, King's Cross" },

  // ACCELERATORS
  { id: "ef", name: "Entrepreneur First", category: "accelerator", founded: 2011, focus: "Talent investor, $10B+ portfolio value. Alumni: Tractable, Cleo, PolyAI, Magic Pony", hq: "London" },
];

const edges = [
  // DeepMind alumni flows
  { source: "deepmind", target: "ineffable", type: "alumni", label: "David Silver" },
  { source: "deepmind", target: "isomorphic", type: "spinoff", label: "Hassabis dual CEO" },
  { source: "deepmind", target: "mistral", type: "alumni", label: "Arthur Mensch" },
  { source: "deepmind", target: "elevenlabs", type: "alumni", label: "Piotr Dąbkowski" },
  { source: "deepmind", target: "microsoft-research", type: "alumni", label: "Suleyman → MS AI CEO" },
  { source: "deepmind", target: "meta-ai", type: "alumni", label: "Rob Fergus" },
  { source: "deepmind", target: "cohere", type: "alumni", label: "Joelle Pineau path" },

  // Academic → Company
  { source: "ucl", target: "deepmind", type: "academic", label: "Gatsby Unit → founding" },
  { source: "ucl", target: "synthesia", type: "academic", label: "Prof Agapito co-founder" },
  { source: "ucl", target: "holistic-ai", type: "academic", label: "Founded by UCL researchers" },
  { source: "cambridge", target: "wayve", type: "academic", label: "Kendall PhD (Cipolla)" },
  { source: "cambridge", target: "polyai", type: "academic", label: "All 3 founders from ML Lab" },
  { source: "cambridge", target: "darktrace", type: "academic", label: "Cambridge mathematicians" },
  { source: "oxford", target: "cohere", type: "academic", label: "Gomez studied at Oxford" },
  { source: "oxford", target: "conjecture", type: "academic", label: "EleutherAI connections" },
  { source: "imperial", target: "elevenlabs", type: "academic", label: "Staniszewski studied maths" },

  // Investor → Company (key relationships)
  { source: "softbank", target: "wayve", type: "investment", label: "Led $1.05B Series C" },
  { source: "softbank", target: "tractable", type: "investment", label: "Led $65M Series E" },
  { source: "softbank", target: "graphcore", type: "investment", label: "Acquired ($500M)" },
  { source: "sequoia-eu", target: "elevenlabs", type: "investment", label: "Led $500M Series D" },
  { source: "nvidia-inv", target: "wayve", type: "investment" },
  { source: "nvidia-inv", target: "synthesia", type: "investment" },
  { source: "nvidia-inv", target: "elevenlabs", type: "investment" },
  { source: "nvidia-inv", target: "polyai", type: "investment" },
  { source: "balderton", target: "wayve", type: "investment", label: "Series A" },
  { source: "balderton", target: "cleo", type: "investment" },
  { source: "atomico", target: "graphcore", type: "investment" },
  { source: "atomico", target: "synthesia", type: "investment" },
  { source: "atomico", target: "physicsx", type: "investment", label: "Led $135M Series B" },
  { source: "localglobe", target: "synthesia", type: "investment" },
  { source: "localglobe", target: "cleo", type: "investment" },
  { source: "air-street", target: "wayve", type: "investment" },
  { source: "air-street", target: "synthesia", type: "investment" },
  { source: "air-street", target: "elevenlabs", type: "investment" },
  { source: "air-street", target: "tractable", type: "investment" },
  { source: "accel", target: "synthesia", type: "investment" },
  { source: "accel", target: "helsing", type: "investment" },

  // Accelerator → Company
  { source: "ef", target: "tractable", type: "accelerator" },
  { source: "ef", target: "cleo", type: "accelerator" },
  { source: "ef", target: "polyai", type: "accelerator" },

  // Partnerships
  { source: "wayve", target: "openai", type: "partnership", label: "Both in King's Cross" },
  { source: "isomorphic", target: "deepmind", type: "spinoff" },
  { source: "faculty", target: "openai", type: "partnership", label: "Red teaming" },
  { source: "anthropic", target: "openai", type: "competitor" },
  { source: "turing", target: "ucl", type: "academic" },
  { source: "turing", target: "cambridge", type: "academic" },
  { source: "turing", target: "oxford", type: "academic" },
];

// ── Category config ─────────────────────────────────────────────────────────
const categoryConfig = {
  frontier: { color: "#FF3366", label: "Frontier Labs", icon: "⚡" },
  "frontier-emerging": { color: "#FF6B9D", label: "Frontier (Emerging)", icon: "🌟" },
  autonomous: { color: "#00D4FF", label: "Autonomous / Robotics", icon: "🚗" },
  generative: { color: "#A855F7", label: "Generative AI", icon: "🎨" },
  biotech: { color: "#10B981", label: "AI + Biotech", icon: "🧬" },
  enterprise: { color: "#F59E0B", label: "Enterprise AI", icon: "🏢" },
  cybersecurity: { color: "#EF4444", label: "Cybersecurity AI", icon: "🛡️" },
  hardware: { color: "#6366F1", label: "AI Hardware", icon: "🔧" },
  fintech: { color: "#14B8A6", label: "AI Fintech", icon: "💰" },
  defence: { color: "#DC2626", label: "Defence AI", icon: "🎯" },
  safety: { color: "#F97316", label: "AI Safety", icon: "🔒" },
  governance: { color: "#8B5CF6", label: "AI Governance", icon: "📋" },
  devtools: { color: "#06B6D4", label: "Dev Tools", icon: "⚙️" },
  investor: { color: "#FBBF24", label: "Investors", icon: "💎" },
  academic: { color: "#34D399", label: "Academic", icon: "🎓" },
  accelerator: { color: "#FB923C", label: "Accelerators", icon: "🚀" },
};

const edgeTypeColors = {
  alumni: "#FF3366",
  spinoff: "#A855F7",
  investment: "#FBBF24",
  academic: "#34D399",
  partnership: "#60A5FA",
  accelerator: "#FB923C",
  competitor: "#6B7280",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getNodeRadius(c) {
  if (c.category === "frontier") return 28;
  if (c.category === "investor") return 14;
  if (c.category === "academic") return 16;
  if (c.category === "accelerator") return 12;
  if (["frontier-emerging"].includes(c.category)) return 20;
  if (c.valuation) {
    const v = c.valuation.replace(/[^0-9.]/g, "");
    const num = parseFloat(v);
    if (num >= 10) return 24;
    if (num >= 1) return 20;
  }
  if (c.funding) {
    const f = c.funding.replace(/[^0-9.]/g, "");
    const num = parseFloat(f);
    if (num >= 500) return 22;
    if (num >= 100) return 18;
  }
  return 14;
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function LondonAIMap() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState(new Set(Object.keys(categoryConfig)));
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });

  const filteredCompanies = useMemo(() =>
    companies.filter(c => {
      if (!activeCategories.has(c.category)) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), [activeCategories, search]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredCompanies.map(c => c.id));
    return edges.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [filteredCompanies]);

  const toggleCategory = (cat) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const selectAll = () => setActiveCategories(new Set(Object.keys(categoryConfig)));
  const selectNone = () => setActiveCategories(new Set());

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDimensions({ w, h });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { w, h } = dimensions;
    const nodes = filteredCompanies.map(c => ({ ...c, r: getNodeRadius(c) }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = filteredEdges.map(e => ({
      ...e,
      source: e.source,
      target: e.target,
    })).filter(e => nodeMap.has(e.source) && nodeMap.has(e.target));

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.15, 5])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Initial zoom
    svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.6).translate(-w / 2, -h / 2));

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => {
        if (d.type === "alumni" || d.type === "spinoff") return 120;
        if (d.type === "investment") return 180;
        return 150;
      }).strength(0.3))
      .force("charge", d3.forceManyBody().strength(d => -d.r * 25))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(d => d.r + 8))
      .force("x", d3.forceX(w / 2).strength(0.03))
      .force("y", d3.forceY(h / 2).strength(0.03));
    simRef.current = sim;

    // Edges
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", d => edgeTypeColors[d.type] || "#444")
      .attr("stroke-width", d => d.type === "alumni" ? 2 : 1)
      .attr("stroke-opacity", 0.25)
      .attr("stroke-dasharray", d => d.type === "competitor" ? "4,4" : null);

    // Node groups
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelected(prev => prev?.id === d.id ? null : companies.find(c => c.id === d.id));
      })
      .on("mouseenter", (event, d) => setHoveredNode(d.id))
      .on("mouseleave", () => setHoveredNode(null));

    // Glow
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Circle
    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        const c = categoryConfig[d.category]?.color || "#666";
        return c + "33";
      })
      .attr("stroke", d => categoryConfig[d.category]?.color || "#666")
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)");

    // Label
    node.append("text")
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + "…" : d.name)
      .attr("text-anchor", "middle")
      .attr("dy", d => d.r + 14)
      .attr("fill", "#C8D6E5")
      .attr("font-size", d => d.r > 20 ? "11px" : "9px")
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("pointer-events", "none");

    // Icon text inside node
    node.append("text")
      .text(d => categoryConfig[d.category]?.icon || "")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => Math.max(d.r * 0.7, 10) + "px")
      .attr("pointer-events", "none");

    svg.on("click", () => setSelected(null));

    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [filteredCompanies, filteredEdges, dimensions]);

  const categoryList = Object.entries(categoryConfig);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0A0E1A", overflow: "hidden", fontFamily: "'JetBrains Mono', 'SF Mono', monospace", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 24px", background: "linear-gradient(180deg, rgba(10,14,26,0.95) 0%, rgba(10,14,26,0) 100%)", zIndex: 10, display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#F0F4F8", letterSpacing: "-0.5px" }}>
            London AI Ecosystem
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#64748B", marginTop: 2 }}>
            {filteredCompanies.length} entities · {filteredEdges.length} connections · Interactive constellation
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1E293B", background: "#111827", color: "#E2E8F0", fontSize: 12, width: 200, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      {/* Category filters — left sidebar */}
      <div style={{ position: "absolute", top: 70, left: 12, zIndex: 10, background: "rgba(15,23,42,0.85)", borderRadius: 12, padding: "10px 12px", backdropFilter: "blur(12px)", border: "1px solid #1E293B", maxHeight: "calc(100vh - 100px)", overflowY: "auto", width: 180 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={selectAll} style={{ flex: 1, padding: "4px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94A3B8", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>All</button>
          <button onClick={selectNone} style={{ flex: 1, padding: "4px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94A3B8", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>None</button>
        </div>
        {categoryList.map(([key, cfg]) => {
          const active = activeCategories.has(key);
          const count = companies.filter(c => c.category === key).length;
          return (
            <div
              key={key}
              onClick={() => toggleCategory(key)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, cursor: "pointer", opacity: active ? 1 : 0.35, transition: "all 0.2s", marginBottom: 2 }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#CBD5E1", flex: 1 }}>{cfg.label}</span>
              <span style={{ fontSize: 9, color: "#475569" }}>{count}</span>
            </div>
          );
        })}
        {/* Edge legend */}
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #1E293B" }}>
          <div style={{ fontSize: 9, color: "#475569", marginBottom: 6, fontWeight: 600 }}>CONNECTIONS</div>
          {Object.entries(edgeTypeColors).map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 9, color: "#64748B", textTransform: "capitalize" }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg ref={svgRef} width={dimensions.w} height={dimensions.h} style={{ display: "block" }} />

      {/* Detail panel */}
      {selected && (
        <div style={{ position: "absolute", top: 70, right: 12, width: 340, maxHeight: "calc(100vh - 100px)", overflowY: "auto", background: "rgba(15,23,42,0.92)", borderRadius: 14, padding: 20, backdropFilter: "blur(16px)", border: "1px solid #1E293B", zIndex: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: categoryConfig[selected.category]?.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {categoryConfig[selected.category]?.icon} {categoryConfig[selected.category]?.label}
              </div>
              <h2 style={{ margin: 0, fontSize: 18, color: "#F0F4F8", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>{selected.name}</h2>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#64748B", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {selected.founded && <InfoCard label="Founded" value={selected.founded} />}
            {selected.employees && <InfoCard label="Employees" value={selected.employees} />}
            {selected.funding && <InfoCard label="Funding" value={selected.funding} />}
            {selected.valuation && <InfoCard label="Valuation" value={selected.valuation} />}
            {selected.hq && <InfoCard label="Location" value={selected.hq} />}
          </div>

          {selected.founders && <DetailSection title="Founders" text={selected.founders} />}
          {selected.focus && <DetailSection title="Focus" text={selected.focus} />}
          {selected.ethos && <DetailSection title="Ethos" text={selected.ethos} />}
          {selected.keyPeople && <DetailSection title="Key People" text={selected.keyPeople} />}
          {selected.milestones && <DetailSection title="Milestones" text={selected.milestones} />}
          {selected.interviews && <DetailSection title="Interviews & Podcasts" text={selected.interviews} />}

          {/* Connected entities */}
          <ConnectedList selected={selected} />
        </div>
      )}

      {/* Instructions */}
      {!selected && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.8)", borderRadius: 10, padding: "8px 20px", backdropFilter: "blur(8px)", border: "1px solid #1E293B", zIndex: 10 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#64748B", textAlign: "center" }}>
            Click a node for details · Drag to move · Scroll to zoom · Filter by category
          </p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ background: "#111827", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{String(value)}</div>
    </div>
  );
}

function DetailSection({ title, text }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function ConnectedList({ selected }) {
  const connected = edges.filter(e => e.source === selected.id || e.target === selected.id);
  if (connected.length === 0) return null;

  return (
    <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #1E293B" }}>
      <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, fontWeight: 600 }}>Connections ({connected.length})</div>
      {connected.map((e, i) => {
        const otherId = e.source === selected.id ? e.target : e.source;
        const other = companies.find(c => c.id === otherId);
        if (!other) return null;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: edgeTypeColors[e.type] || "#444", flexShrink: 0 }} />
            <span style={{ color: "#94A3B8" }}>{other.name}</span>
            <span style={{ color: "#475569", fontSize: 9, textTransform: "capitalize" }}>({e.type})</span>
            {e.label && <span style={{ color: "#374151", fontSize: 9 }}>— {e.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
