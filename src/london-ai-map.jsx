import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";

/* ═══════════════════════════════════════════════════════════════════════════
   LONDON AI ECOSYSTEM — V4.0
   110+ entities · Gamification · Network Score · Leaderboard · Social links
   Ecosystem updates · Career links · Cluster view · Personal overlay
   ═══════════════════════════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────────────────────
const CC={
  frontier:{c:"#FF2D55",l:"Frontier Labs",i:"⚡"},
  "frontier-emerging":{c:"#FF6B9D",l:"Emerging Frontier",i:"🌟"},
  autonomous:{c:"#00D4FF",l:"Autonomous",i:"🚗"},
  generative:{c:"#BF5AF2",l:"Generative AI",i:"🎨"},
  biotech:{c:"#30D158",l:"AI + Biotech",i:"🧬"},
  enterprise:{c:"#FFD60A",l:"Enterprise AI",i:"🏢"},
  cybersecurity:{c:"#FF453A",l:"Cybersecurity",i:"🛡️"},
  hardware:{c:"#5E5CE6",l:"AI Hardware",i:"🔧"},
  fintech:{c:"#64D2FF",l:"AI Fintech",i:"💰"},
  defence:{c:"#FF375F",l:"Defence AI",i:"🎯"},
  safety:{c:"#FF9F0A",l:"AI Safety",i:"🔒"},
  governance:{c:"#AC8E68",l:"Governance",i:"📋"},
  devtools:{c:"#32D74B",l:"Dev Tools",i:"⚙️"},
  investor:{c:"#FFD700",l:"Investors",i:"💎"},
  academic:{c:"#5AC8FA",l:"Academic",i:"🎓"},
  accelerator:{c:"#FF9500",l:"Accelerators",i:"🚀"},
};
const ECfg={
  alumni:{c:"#FF2D55",l:"Alumni Flow"},spinoff:{c:"#BF5AF2",l:"Spin-off"},investment:{c:"#FFD700",l:"Investment"},academic:{c:"#5AC8FA",l:"Academic"},partnership:{c:"#64D2FF",l:"Partnership",d:"6,3"},accelerator:{c:"#FF9500",l:"Accelerator"},
};
const US={
  know_someone:{c:"#30D158",l:"Know Someone",i:"🤝",pts:15},
  applied:{c:"#FFD60A",l:"Applied",i:"📨",pts:5},
  target:{c:"#00D4FF",l:"Target",i:"🎯",pts:3},
  interviewing:{c:"#BF5AF2",l:"Interviewing",i:"💬",pts:20},
  rejected:{c:"#FF453A",l:"Rejected",i:"❌",pts:2},
  watching:{c:"#64748B",l:"Watching",i:"👁️",pts:1},
};

// ── BADGES ──────────────────────────────────────────────────────────────
const BADGES=[
  {id:"frontier_tracker",name:"Frontier Tracker",desc:"Track all 7 frontier labs",icon:"⚡",check:ud=>["deepmind","anthropic","openai","meta-ai","ms-research","mistral","cohere"].filter(id=>ud[id]).length>=7},
  {id:"dm_insider",name:"DeepMind Insider",desc:"Connected to 3+ DeepMind-linked companies",icon:"🧠",check:(ud,cos)=>{const dm=edges.filter(e=>e.s==="deepmind"||e.t==="deepmind").flatMap(e=>[e.s,e.t]);return Object.keys(ud).filter(id=>dm.includes(id)).length>=3;}},
  {id:"seed_scout",name:"Seed Scout",desc:"Track 10+ emerging startups",icon:"🌱",check:(ud,cos)=>Object.keys(ud).filter(id=>{const co=cos.find(c=>c.id===id);return co&&co.fn<100&&co.fn>0;}).length>=10},
  {id:"money_trail",name:"Money Trail",desc:"Track 5+ investors",icon:"💎",check:(ud,cos)=>Object.keys(ud).filter(id=>{const co=cos.find(c=>c.id===id);return co?.cat==="investor";}).length>=5},
  {id:"biotech_buff",name:"Biotech Buff",desc:"Track all biotech companies",icon:"🧬",check:(ud,cos)=>cos.filter(c=>c.cat==="biotech").every(c=>ud[c.id])},
  {id:"first_contact",name:"First Contact",desc:"Add your first connection",icon:"👋",check:ud=>Object.keys(ud).length>=1},
  {id:"networker",name:"Networker",desc:"Track 15+ companies",icon:"🕸️",check:ud=>Object.keys(ud).length>=15},
  {id:"power_player",name:"Power Player",desc:"Track 30+ companies",icon:"👑",check:ud=>Object.keys(ud).length>=30},
  {id:"safety_first",name:"Safety First",desc:"Track all AI safety companies",icon:"🔒",check:(ud,cos)=>cos.filter(c=>c.cat==="safety").every(c=>ud[c.id])},
  {id:"unicorn_hunter",name:"Unicorn Hunter",desc:"Track 5+ unicorns ($1B+)",icon:"🦄",check:(ud,cos)=>Object.keys(ud).filter(id=>{const co=cos.find(c=>c.id===id);return co&&co.fn>=500;}).length>=5},
];

// ── ECOSYSTEM UPDATES ───────────────────────────────────────────────────
const UPDATES=[
  {date:"2026-03-01",type:"funding",text:"Wayve closes $1.2B Series D at $8.6B valuation",company:"wayve"},
  {date:"2026-02-04",type:"funding",text:"ElevenLabs raises $500M Series D at $11B valuation, eyes IPO",company:"elevenlabs"},
  {date:"2026-01-26",type:"funding",text:"Synthesia raises $200M Series E at $4B from GV & Nvidia",company:"synthesia"},
  {date:"2026-01-15",type:"acquisition",text:"Accenture acquires Faculty AI for ~$1B+",company:"faculty"},
  {date:"2025-12-15",type:"funding",text:"PolyAI raises $86M Series D (Georgian, Nvidia, Khosla)",company:"polyai"},
  {date:"2025-11-25",type:"founding",text:"David Silver founds Ineffable Intelligence, seeks $1B seed",company:"ineffable"},
  {date:"2025-09-24",type:"funding",text:"Signal AI raises $165M from Battery Ventures",company:"signal-ai"},
  {date:"2025-08-01",type:"people",text:"Joelle Pineau (ex-Meta FAIR VP) joins Cohere as Chief AI Officer",company:"cohere"},
  {date:"2025-07-22",type:"milestone",text:"Latent Labs (DeepMind AlphaFold2 alumni) launches first AI model",company:"latent-labs"},
  {date:"2025-07-01",type:"partnership",text:"OpenAI signs strategic MoU with UK government",company:"openai"},
  {date:"2025-06-25",type:"funding",text:"Helsing raises €600M Series D at €12B valuation",company:"helsing"},
  {date:"2025-06-15",type:"funding",text:"PhysicsX raises $135M Series B led by Atomico",company:"physicsx"},
  {date:"2025-06-01",type:"people",text:"Convergence AI acquired by Salesforce — 9 months from founding",company:"convergence"},
  {date:"2025-05-01",type:"milestone",text:"Helsing achieves first AI-piloted fighter jet combat (Project Beyond)",company:"helsing"},
  {date:"2025-04-01",type:"funding",text:"Isomorphic Labs raises $600M Series A from Thrive Capital",company:"isomorphic"},
  {date:"2025-03-24",type:"people",text:"Emad Mostaque resigns as Stability AI CEO",company:"stability"},
  {date:"2024-10-01",type:"acquisition",text:"Thoma Bravo acquires Darktrace for $5.3B",company:"darktrace"},
  {date:"2024-07-11",type:"acquisition",text:"SoftBank acquires Graphcore for ~$500M",company:"graphcore"},
  {date:"2024-04-01",type:"acquisition",text:"Entrust acquires Onfido for $650M",company:"onfido"},
];

// ── PEOPLE WITH SOCIAL LINKS ────────────────────────────────────────────
const PEOPLE={
  "Demis Hassabis":{role:"CEO, Google DeepMind + Isomorphic Labs",tw:"https://x.com/demaboreal",li:"https://linkedin.com/in/demis-hassabis/",co:["deepmind","isomorphic"]},
  "Sam Altman":{role:"CEO, OpenAI",tw:"https://x.com/sama",li:"https://linkedin.com/in/samaltman/",co:["openai"]},
  "Dario Amodei":{role:"CEO, Anthropic",tw:"https://x.com/DarioAmodei",li:"https://linkedin.com/in/dario-amodei/",co:["anthropic"]},
  "Arthur Mensch":{role:"CEO, Mistral AI",tw:"https://x.com/arthurmensch",li:"https://linkedin.com/in/arthur-mensch-a3b95ab8/",co:["mistral"]},
  "Aidan Gomez":{role:"CEO, Cohere",tw:"https://x.com/aidangomez",li:"https://linkedin.com/in/aidangomez/",co:["cohere"]},
  "Alex Kendall":{role:"CEO, Wayve",tw:"https://x.com/alexloukendall",li:"https://linkedin.com/in/alexgkendall/",co:["wayve"]},
  "Victor Riparbelli":{role:"CEO, Synthesia",tw:"https://x.com/vriparbelli",li:"https://linkedin.com/in/victorriparbelli/",co:["synthesia"]},
  "Mati Staniszewski":{role:"CEO, ElevenLabs",tw:"https://x.com/maborosh1",li:"https://linkedin.com/in/matistaniszewski/",co:["elevenlabs"]},
  "Connor Leahy":{role:"CEO, Conjecture",tw:"https://x.com/NPCollapse",li:"https://linkedin.com/in/connor-leahy/",co:["conjecture"]},
  "David Silver":{role:"Founder, Ineffable Intelligence",tw:null,li:"https://linkedin.com/in/david-silver-a4537222/",co:["ineffable","deepmind"]},
  "Yann LeCun":{role:"Ex-FAIR Chief, now AMI Labs",tw:"https://x.com/ylecun",li:"https://linkedin.com/in/yann-lecun-0b999/",co:["meta-ai"]},
  "Mustafa Suleyman":{role:"CEO Microsoft AI, DM co-founder",tw:"https://x.com/mustaboreal",li:"https://linkedin.com/in/mustafa-suleyman/",co:["ms-research","deepmind"]},
  "Nathan Benaich":{role:"GP, Air Street Capital",tw:"https://x.com/nathanbenaich",li:"https://linkedin.com/in/nathanbenaich/",co:["air-street"]},
  "Ian Hogarth":{role:"AISI Chair, Plural co-founder",tw:"https://x.com/ianhogarth",li:"https://linkedin.com/in/ianhogarth/",co:["plural"]},
  "Poppy Gustafsson":{role:"Baroness, ex-CEO Darktrace, UK Minister",tw:"https://x.com/PoppyGustafsson",li:"https://linkedin.com/in/poppygustafsson/",co:["darktrace"]},
  "Nikola Mrkšić":{role:"CEO, PolyAI",tw:"https://x.com/nmrksic",li:"https://linkedin.com/in/nikola-mrksic/",co:["polyai"]},
  "Guy Podjarny":{role:"CEO, Tessl (ex-Snyk founder)",tw:"https://x.com/guaboreal",li:"https://linkedin.com/in/guypo/",co:["tessl"]},
  "Torsten Reil":{role:"Co-CEO, Helsing",tw:null,li:"https://linkedin.com/in/torsten-reil/",co:["helsing"]},
  "Barney Hussey-Yeo":{role:"CEO, Cleo AI",tw:"https://x.com/barneyhy",li:"https://linkedin.com/in/barneyhy/",co:["cleo"]},
  "Alex Dalyac":{role:"CEO, Tractable",tw:"https://x.com/alexdalyac",li:"https://linkedin.com/in/alexdalyac/",co:["tractable"]},
};

// ── COMPANY DATA ────────────────────────────────────────────────────────
const companies=[
  {id:"deepmind",name:"Google DeepMind",s:"DeepMind",cat:"frontier",yr:2010,emp:"~3,000 LDN",fund:"$500-650M (acq.)",fn:600,val:"Alphabet sub.",founders:"Demis Hassabis, Shane Legg, Mustafa Suleyman",focus:"AGI · AlphaFold · Gemini · RL · robotics",ethos:"Solve intelligence",hq:"King's Cross",kp:"Hassabis (CEO, Nobel '24), Legg (Chief Sci), Kavukcuoglu (VP Res)",ms:"AlphaGo '16 · AlphaFold '20 · Gemini '23 · Nobel '24",iv:"Hassabis: Lex Fridman, Ferriss, BBC",jobs:"https://deepmind.google/careers/"},
  {id:"anthropic",name:"Anthropic",s:"Anthropic",cat:"frontier",yr:2021,emp:"1,000+",fund:"~$30B",fn:30000,val:"$380B",founders:"Dario & Daniela Amodei",focus:"AI safety · Constitutional AI · Claude",ethos:"Safety-first",hq:"Cheapside (LDN)",kp:"Pip White (EMEA N), Guillaume Princen (EMEA)",ms:"LDN '23 · Claude 3.5 · 100+ UK roles · fastest region",iv:"Dario: Lex, Dwarkesh, All-In",jobs:"https://www.anthropic.com/careers"},
  {id:"openai",name:"OpenAI",s:"OpenAI",cat:"frontier",yr:2015,emp:"92-300 LDN",fund:"$17B+",fn:17000,val:"$157B+",founders:"Sam Altman et al.",focus:"GPT · ChatGPT · DALL-E · Sora · o1",ethos:"AGI for all",hq:"King's Cross",kp:"Altman (CEO)",ms:"LDN '23 · UK MoU '25 · Humphrey AI",iv:"Altman: Lex, Rogan",jobs:"https://openai.com/careers/"},
  {id:"meta-ai",name:"Meta AI / FAIR",s:"Meta AI",cat:"frontier",yr:2013,emp:"~3,000",fund:"Meta sub.",fn:0,val:"Meta sub.",founders:"Yann LeCun",focus:"Llama · CV · open-source",ethos:"Open AI research",hq:"LDN research",kp:"Fergus (FAIR, ex-DM)",ms:"Llama 3 · MSL '25 · LeCun→AMI Labs",iv:"LeCun: Lex, TED",jobs:"https://www.metacareers.com/"},
  {id:"ms-research",name:"Microsoft Research",s:"MS Research",cat:"frontier",yr:1997,emp:"6,000 UK",fund:"MS sub.",fn:0,val:"MS sub.",founders:"Needham '97",focus:"ML · AI science · security",ethos:"Empower",hq:"Cambridge+Paddington",kp:"Suleyman (MS AI CEO), Hoffmann (LDN Hub)",ms:"$30B UK · Paddington Hub · UK supercomputer",iv:"Suleyman: Lex, FT",jobs:"https://www.microsoft.com/en-us/research/careers/"},
  {id:"mistral",name:"Mistral AI",s:"Mistral",cat:"frontier",yr:2023,emp:"280+",fund:"€486M+",fn:550,val:"€5.8B",founders:"Mensch (ex-DM), Lample, Lacroix (ex-Meta)",focus:"Open LLMs · enterprise",ethos:"EU sovereignty",hq:"Paris (LDN sat.)",kp:"Mensch (CEO)",ms:"Mistral 7B · Mixtral · Le Chat",iv:"Mensch: Sifted, TC",jobs:"https://jobs.lever.co/mistral/"},
  {id:"cohere",name:"Cohere",s:"Cohere",cat:"frontier",yr:2019,emp:"500 (50 LDN)",fund:"~$1B",fn:1000,val:"$5.5B+",founders:"Gomez (Attention, Oxford), Zhang, Frosst",focus:"Enterprise NLP · North",ethos:"Enterprise, cloud-agnostic",hq:"Toronto (LDN hub)",kp:"Gomez (CEO), Blunsom (Sci, ex-Oxford), Pineau (CAO, ex-Meta)",ms:"Pineau hire · doubling LDN",iv:"Gomez: No Priors",jobs:"https://jobs.ashbyhq.com/cohere"},
  {id:"wayve",name:"Wayve",s:"Wayve",cat:"autonomous",yr:2017,emp:"350+",fund:"~$2.5B",fn:2500,val:"$8.6B",founders:"Alex Kendall (Cambridge/OBE)",focus:"End-to-end AV · no lidar",ethos:"AI-first driving",hq:"London",kp:"Kendall (CEO), Shotton (Sci, ex-MS), Dagan (Pres, ex-Mobileye)",ms:"$1.2B D '26 · Uber L4 LDN · Nissan '27 · 500+ cities",iv:"Kendall: Lex",jobs:"https://wayve.ai/careers/"},
  {id:"synthesia",name:"Synthesia",s:"Synthesia",cat:"generative",yr:2017,emp:"400+",fund:"~$530M",fn:530,val:"$4B",founders:"Riparbelli, Tjerrild, Niessner (TUM), Agapito (UCL)",focus:"AI video · avatars · 140+ langs",ethos:"Ethics-first",hq:"London",kp:"Riparbelli (CEO)",ms:"$200M E '26 · $100M ARR · 80% F100 · Adobe",iv:"Riparbelli: 20VC",jobs:"https://www.synthesia.io/careers"},
  {id:"isomorphic",name:"Isomorphic Labs",s:"Isomorphic",cat:"biotech",yr:2021,emp:"200+",fund:"$600M",fn:600,val:"Alphabet sub.",founders:"Demis Hassabis",focus:"AI drug discovery",ethos:"Solve all disease",hq:"King's Cross",kp:"Hassabis (CEO), Jaderberg (CTO), Doudna (SAB)",ms:"$600M A '25 · Lilly/Novartis $3B · IsoDDE '26",iv:"Hassabis: Nature, CNBC",jobs:"https://www.isomorphiclabs.com/careers"},
  {id:"elevenlabs",name:"ElevenLabs",s:"ElevenLabs",cat:"generative",yr:2022,emp:"330",fund:"$781M",fn:781,val:"$11B",founders:"Staniszewski (Imperial), Dąbkowski (ex-DM)",focus:"AI voice · TTS · 70+ langs",ethos:"Break language barriers",hq:"Soho + Warsaw",kp:"Staniszewski (CEO), Dąbkowski (CTO)",ms:"$500M D '26 · $330M ARR · 41% F500 · IPO",iv:"Staniszewski: 20VC, Bloomberg",jobs:"https://elevenlabs.io/careers"},
  {id:"stability",name:"Stability AI",s:"Stability",cat:"generative",yr:2019,emp:"~190",fund:"~$300M",fn:300,val:"$1B",founders:"Mostaque (departed '24)",focus:"Open image/video/audio gen",ethos:"Open generative AI",hq:"Notting Hill",kp:"Akkaraju (CEO), Parker (Chair), Cameron (Board)",ms:"Stable Diffusion '22 · rescue '24 · EA/WMG",iv:null,jobs:"https://stability.ai/careers"},
  {id:"helsing",name:"Helsing",s:"Helsing",cat:"defence",yr:2021,emp:"275-500",fund:"€1.37B",fn:1500,val:"€12B",founders:"Reil, Scherf",focus:"Military AI · drones · EW",ethos:"Democratic defence only",hq:"Munich (LDN)",kp:"Gould (UK MD)",ms:"€600M D · AI fighter pilot · £350M UK · FCAS",iv:"Reil: Sifted, FT",jobs:"https://helsing.ai/careers"},
  {id:"darktrace",name:"Darktrace",s:"Darktrace",cat:"cybersecurity",yr:2013,emp:"2,400+",fund:"$230M",fn:230,val:"$5.3B (TB)",founders:"Gustafsson (Baroness), Stockdale, Eagan",focus:"Self-learning cyber AI",ethos:"Immune system",hq:"Cambridge+LDN",kp:"Gustafsson (UK Min.)",ms:"IPO '21 · TB $5.3B '24",iv:"Gustafsson: BBC",jobs:"https://darktrace.com/careers"},
  {id:"graphcore",name:"Graphcore",s:"Graphcore",cat:"hardware",yr:2016,emp:"~500",fund:"$710M",fn:710,val:"$2.77B→SB",founders:"Toon, Knowles, Hauser (ARM)",focus:"IPUs",ethos:"AI silicon",hq:"Bristol+LDN",kp:"Toon (CEO)",ms:"SB acq. '24 · $1B India · Hassabis angel",iv:"Toon: Bloomberg",jobs:"https://www.graphcore.ai/careers"},
  {id:"faculty",name:"Faculty AI",s:"Faculty",cat:"enterprise",yr:2014,emp:"400",fund:"~£40M",fn:50,val:"£600M+ (Accenture)",founders:"Dr Warner, Dr Ma",focus:"Decision intel · govt AI",ethos:"AI for institutions",hq:"Welbeck St",kp:"Warner (→Accenture CTO)",ms:"Accenture ~$1B+ '26 · OpenAI red-team",iv:null,jobs:"https://faculty.ai/careers/"},
  {id:"benevolentai",name:"BenevolentAI",s:"BenevolentAI",cat:"biotech",yr:2013,emp:"~69",fund:"$700M+",fn:700,val:"€1.5B peak",founders:"Kenneth Mulvany",focus:"AI knowledge graph drugs",ethos:"Cure disease",hq:"Fitzrovia",kp:"Mulvany (Chair)",ms:"COVID baricitinib · SPAC '21 · delisted '25",iv:null,jobs:"https://www.benevolent.com/careers"},
  {id:"polyai",name:"PolyAI",s:"PolyAI",cat:"enterprise",yr:2017,emp:"200+",fund:"$206M",fn:206,val:"$500M+",founders:"Mrkšić (ex-Apple), Wen (ex-Google), Su (ex-FB)",focus:"Voice AI agents · 45 langs",ethos:"Human-quality voice",hq:"Holborn",kp:"Mrkšić (CEO)",ms:"$86M D '25 · FedEx/Marriott/Caesars",iv:null,jobs:"https://poly.ai/careers/"},
  {id:"cleo",name:"Cleo AI",s:"Cleo",cat:"fintech",yr:2016,emp:"300-500",fund:"~$175M",fn:175,val:"$500M+",founders:"Barney Hussey-Yeo",focus:"AI money assistant",ethos:"Money + sass",hq:"London+NYC",kp:"Hussey-Yeo (CEO)",ms:"$300M+ ARR · profitable · 6M users",iv:null,jobs:"https://web.meetcleo.com/careers"},
  {id:"tractable",name:"Tractable",s:"Tractable",cat:"enterprise",yr:2014,emp:"117-224",fund:"$185M",fn:185,val:"$1B",founders:"Dalyac, Ranca, Cohen",focus:"CV insurance damage",ethos:"Accelerate recovery",hq:"London",kp:"Dalyac (CEO)",ms:"1st CV unicorn · $7B+ repairs/yr",iv:null,jobs:"https://tractable.ai/careers/"},
  {id:"signal-ai",name:"Signal AI",s:"Signal AI",cat:"enterprise",yr:2013,emp:"220+",fund:"$268M",fn:268,val:"Undisclosed",founders:"Benigson, Martinez, Hall",focus:"External intel · 226 markets",ethos:"Decision augmentation",hq:"London",kp:"Benigson (CEO)",ms:"$165M Battery '25 · 40% F500",iv:null,jobs:"https://www.signal-ai.com/careers"},
  {id:"abound",name:"Abound",s:"Abound",cat:"fintech",yr:2020,emp:"100-130",fund:"£1.6B+",fn:150,val:"Undisclosed",founders:"Chappell (McKinsey/PhD), He (EY/PhD)",focus:"AI lending Open Banking",ethos:"Fair credit",hq:"London",kp:"Chappell (CEO)",ms:"Profitable '24 · 70% lower defaults",iv:null,jobs:"https://www.getabound.com/careers"},
  {id:"exscientia",name:"Exscientia",s:"Exscientia",cat:"biotech",yr:2012,emp:"~250",fund:"$674M",fn:674,val:"$2.9B",founders:"Prof Hopkins CBE",focus:"1st AI drug in trials",ethos:"Precision medicine",hq:"Oxford",kp:"Hopkins (CEO)",ms:"12mo drug vs 4.5yr · Nasdaq '21 · Recursion acq. '24",iv:null,jobs:null},
  {id:"onfido",name:"Onfido→Entrust",s:"Onfido",cat:"enterprise",yr:2012,emp:"600+",fund:"$242M",fn:242,val:"$1.5B",founders:"Kassai, Jubbawy, Amin (Oxford)",focus:"AI identity · 195 countries",ethos:"Identity for all",hq:"LDN→Entrust",kp:"Kassai→London AI Hub",ms:"Entrust $650M '24",iv:null,jobs:null},
  // EMERGING
  {id:"ineffable",name:"Ineffable Intelligence",s:"Ineffable",cat:"frontier-emerging",yr:2025,emp:"Early",fund:"Seeking $1B",fn:0,val:"~$4B",founders:"David Silver (DM, AlphaGo, UCL)",focus:"RL superintelligence",ethos:"Beyond LLMs",hq:"London",kp:"Silver",ms:"Founded Nov '25 · Sequoia/Nvidia interest",iv:null,jobs:null},
  {id:"tessl",name:"Tessl",s:"Tessl",cat:"devtools",yr:2024,emp:"Early",fund:"$125M",fn:125,val:"$750M",founders:"Podjarny (Snyk $7.4B)",focus:"AI-native dev",ethos:"Spec-driven",hq:"London",kp:"Podjarny (CEO)",ms:"$125M pre-product",iv:null,jobs:"https://www.tessl.io/careers"},
  {id:"physicsx",name:"PhysicsX",s:"PhysicsX",cat:"enterprise",yr:2023,emp:"150+",fund:"~$175M",fn:175,val:"~$1B",founders:"Tuluie (F1), Corbo (Bentley)",focus:"Large Physics Models",ethos:"AI engineering",hq:"London",kp:"Tuluie (CEO)",ms:"$135M B '25 Atomico · Siemens",iv:null,jobs:"https://physicsx.com/careers"},
  {id:"conjecture",name:"Conjecture",s:"Conjecture",cat:"safety",yr:2021,emp:"~13",fund:"~$25M",fn:25,val:"Undisclosed",founders:"Leahy (EleutherAI), Black, Alfour",focus:"Cognitive Emulation",ethos:"Safe before powerful",hq:"London",kp:"Leahy (CEO)",ms:"Karpathy/Collisons angels · Lords",iv:"Leahy: 80K Hours",jobs:"https://www.conjecture.dev/careers"},
  {id:"holistic-ai",name:"Holistic AI",s:"Holistic AI",cat:"governance",yr:2020,emp:"43-79",fund:"Raising $200M",fn:15,val:"Undisclosed",founders:"Koshiyama (Goldman/UCL), Kazim (UCL)",focus:"AI governance · EU AI Act",ethos:"Responsible AI",hq:"Soho Sq",kp:"Koshiyama (CEO)",ms:"Mozilla Ventures · 500+ clients",iv:null,jobs:"https://www.holisticai.com/careers"},
  {id:"encord",name:"Encord",s:"Encord",cat:"devtools",yr:2020,emp:"50+",fund:"~€50M+",fn:55,val:"Undisclosed",founders:"Landau, Hansen",focus:"AI data annotation",ethos:"Data-centric",hq:"London",kp:"Landau (CEO)",ms:"€50M C '26 · 300+ clients",iv:null,jobs:"https://encord.com/careers/"},
  {id:"convergence",name:"Convergence→Salesforce",s:"Convergence",cat:"enterprise",yr:2024,emp:"Acq.",fund:"$12M",fn:12,val:"Acq.",founders:"Purtorab, Toulis (ex-Shopify/Cohere/DM)",focus:"AI agents + memory",ethos:"AI that remembers",hq:"LDN→SF",kp:null,ms:"SF acq. 9mo from founding",iv:null,jobs:null},
  {id:"latent-labs",name:"Latent Labs",s:"Latent Labs",cat:"biotech",yr:2025,emp:"Early",fund:"$50M",fn:50,val:"Undisclosed",founders:"Kohl (AlphaFold2, DM)",focus:"AI protein design",ethos:"Design biology",hq:"London",kp:"Kohl (CEO)",ms:"1st model Jul '25",iv:null,jobs:null},
  {id:"fyxer",name:"Fyxer AI",s:"Fyxer",cat:"enterprise",yr:2024,emp:"Growing",fund:"€25.5M",fn:28,val:"Undisclosed",founders:"Hollingsworth brothers",focus:"AI exec assistant",ethos:"AI inbox",hq:"London",kp:null,ms:"€1M→€17M ARR 7mo · Benioff",iv:null,jobs:null},
  {id:"mimica",name:"Mimica",s:"Mimica",cat:"enterprise",yr:2019,emp:"Growing",fund:"$26.2M",fn:26,val:"Undisclosed",founders:"Planche",focus:"Process intelligence",ethos:"Observe→automate",hq:"London",kp:"Planche (CEO)",ms:"$26.2M B · Khosla · EF",iv:null,jobs:"https://www.mimica.ai/careers"},
  {id:"phoebe",name:"Phoebe AI",s:"Phoebe",cat:"devtools",yr:2024,emp:"Early",fund:"$17M",fn:17,val:"Undisclosed",founders:"Henderson, Summerfield (ex-Stripe EU)",focus:"Software failure detection",ethos:"AI reliability",hq:"London",kp:null,ms:"$17M from GV",iv:null,jobs:null},
  {id:"metaview",name:"Metaview",s:"Metaview",cat:"enterprise",yr:2018,emp:"Growing",fund:"$50M",fn:50,val:"Undisclosed",founders:"Magos",focus:"AI hiring",ethos:"Better hiring",hq:"London",kp:"Magos (CEO)",ms:"$35M B GV · Plural/Seedcamp",iv:null,jobs:"https://www.metaview.ai/careers"},
  {id:"unitary",name:"Unitary AI",s:"Unitary",cat:"safety",yr:2019,emp:"Small",fund:"Undisclosed",fn:5,val:"Undisclosed",founders:"Bateman",focus:"Content moderation",ethos:"Safer internet",hq:"London",kp:null,ms:"Most disruptive '24 · Detoxify OSS",iv:null,jobs:null},
  {id:"paid-ai",name:"Paid AI",s:"Paid AI",cat:"devtools",yr:2024,emp:"Early",fund:"$21.6M",fn:22,val:"Undisclosed",founders:null,focus:"Billing for AI agents",ethos:"AI payment rails",hq:"London",kp:null,ms:"$21.6M Lightspeed",iv:null,jobs:null},
  {id:"maze-ai",name:"Maze Security",s:"Maze",cat:"cybersecurity",yr:2024,emp:"Early",fund:"$31M",fn:31,val:"Undisclosed",founders:null,focus:"AI cloud security",ethos:"Auto cloud defence",hq:"London",kp:null,ms:"$25M A '25",iv:null,jobs:null},
  {id:"oxbotica",name:"Oxbotica",s:"Oxbotica",cat:"autonomous",yr:2014,emp:"200+",fund:"~$225M",fn:225,val:"$1B+",founders:"Newman, Posner (Oxford)",focus:"Universal AV software",ethos:"Autonomy everywhere",hq:"Oxford+LDN",kp:"Newman (CEO)",ms:"$140M B (Google) · bp/Ocado",iv:null,jobs:"https://www.oxbotica.com/careers/"},
  {id:"mind-foundry",name:"Mind Foundry",s:"Mind Foundry",cat:"enterprise",yr:2016,emp:"50-100",fund:"~$30M",fn:30,val:"Undisclosed",founders:"Roberts, Osborne (Oxford)",focus:"Human-centric AI decisions",ethos:"Trustable AI",hq:"Oxford+LDN",kp:null,ms:"MoD contracts · Oxford ML spinout",iv:null,jobs:"https://www.mindfoundry.ai/careers"},
  {id:"healx",name:"Healx",s:"Healx",cat:"biotech",yr:2014,emp:"50-100",fund:"~$68M",fn:68,val:"Undisclosed",founders:"Dr Guilliams (Cambridge)",focus:"AI rare disease drugs",ethos:"Rare disease patients",hq:"Cambridge+LDN",kp:"Guilliams (CEO)",ms:"$56M B Atomico · 12+ programmes",iv:null,jobs:"https://healx.io/careers/"},
  {id:"nscale",name:"Nscale",s:"Nscale",cat:"hardware",yr:2023,emp:"Growing",fund:"$155M",fn:155,val:"Undisclosed",founders:null,focus:"Sovereign AI cloud · GPUs",ethos:"EU compute independence",hq:"London",kp:null,ms:"$155M raised",iv:null,jobs:null},
  {id:"robin-ai",name:"Robin AI",s:"Robin AI",cat:"enterprise",yr:2019,emp:"100+",fund:"~$52M",fn:52,val:"Undisclosed",founders:"Robinson",focus:"AI contract review",ethos:"AI legal",hq:"London",kp:"Robinson (CEO)",ms:"$26M B · Plural · 600+ clients",iv:null,jobs:"https://www.robinai.com/careers"},
  {id:"v7",name:"V7 Labs",s:"V7",cat:"devtools",yr:2018,emp:"80+",fund:"~$33M",fn:33,val:"Undisclosed",founders:"Rizzoli, Edwardsson",focus:"AI data platform",ethos:"Better data→better AI",hq:"London",kp:"Rizzoli (CEO)",ms:"Samsung/Genentech clients · Air Street",iv:null,jobs:"https://www.v7labs.com/careers"},
  {id:"diffblue",name:"Diffblue",s:"Diffblue",cat:"devtools",yr:2016,emp:"50-100",fund:"~$40M",fn:40,val:"Undisclosed",founders:"Prof Kroening (Oxford CS)",focus:"AI code testing",ethos:"AI writes tests",hq:"Oxford+LDN",kp:null,ms:"Goldman backed · Oxford CS spinout",iv:null,jobs:"https://www.diffblue.com/careers/"},
  {id:"builderai",name:"Builder.ai",s:"Builder.ai",cat:"enterprise",yr:2016,emp:"700+",fund:"~$450M",fn:450,val:"$1B+",founders:"Sachin Dev Duggal",focus:"AI no-code software building",ethos:"Software for everyone",hq:"London",kp:"Duggal (CEO)",ms:"$250M '24 MS+QIA · governance issues",iv:null,jobs:null},
  {id:"basecamp-res",name:"Basecamp Research",s:"Basecamp",cat:"biotech",yr:2020,emp:"50+",fund:"~$80M",fn:80,val:"Undisclosed",founders:"Glen Mayall",focus:"Biodiversity DNA→protein AI",ethos:"Nature-first biotech",hq:"London",kp:"Mayall (CEO)",ms:"$60M B Nvidia · 4B+ proteins",iv:null,jobs:null},
  {id:"papercup",name:"Papercup",s:"Papercup",cat:"generative",yr:2017,emp:"50+",fund:"~$20M",fn:20,val:"Undisclosed",founders:"Sherwood, Gao, Sherwood",focus:"AI video dubbing",ethos:"Every voice, every lang",hq:"London",kp:null,ms:"Sky News/Bloomberg · LocalGlobe A",iv:null,jobs:null},
  // INVESTORS
  {id:"balderton",name:"Balderton Capital",s:"Balderton",cat:"investor",yr:2000,focus:"$3B+ AUM. Wayve, Cleo, Convergence",hq:"London",kp:"Chandratillake",fn:0,jobs:null},
  {id:"atomico",name:"Atomico",s:"Atomico",cat:"investor",yr:2006,focus:"Zennström/Skype. Graphcore, Synthesia, PhysicsX, Healx",hq:"London",kp:"Khaliq (AI)",fn:0,jobs:null},
  {id:"localglobe",name:"LocalGlobe",s:"LocalGlobe",cat:"investor",yr:2015,focus:"Seed. Synthesia, Cleo, Faculty, Nscale",hq:"London",kp:"Klein family",fn:0,jobs:null},
  {id:"air-street",name:"Air Street Capital",s:"Air Street",cat:"investor",yr:2019,focus:"AI fund. State of AI Report. Wayve/Synthesia/11Labs/V7",hq:"London",kp:"Nathan Benaich",fn:0,jobs:null},
  {id:"sequoia-eu",name:"Sequoia Capital",s:"Sequoia",cat:"investor",yr:1972,focus:"ElevenLabs $500M D. Ineffable talks",hq:"LDN/SF",kp:"Luciana Lixandru",fn:0,jobs:null},
  {id:"accel",name:"Accel",s:"Accel",cat:"investor",yr:1983,focus:"Synthesia, Helsing",hq:"London",kp:"Lixandru, Botteri",fn:0,jobs:null},
  {id:"softbank",name:"SoftBank Vision Fund",s:"SoftBank",cat:"investor",yr:2017,focus:"Wayve $1.05B, Tractable, Graphcore acq., Exscientia",hq:"London",kp:"Son",fn:0,jobs:null},
  {id:"nvidia-inv",name:"Nvidia (Strategic)",s:"Nvidia",cat:"investor",yr:1993,focus:"£2B UK. Wayve/Synthesia/11Labs/PolyAI/Latent/Basecamp",hq:"US",kp:"Jensen Huang",fn:0,jobs:null},
  {id:"gv",name:"GV",s:"GV",cat:"investor",yr:2009,focus:"Synthesia E, Isomorphic, Phoebe, Metaview",hq:"London",kp:"Hulme",fn:0,jobs:null},
  {id:"khosla",name:"Khosla Ventures",s:"Khosla",cat:"investor",yr:2004,focus:"PolyAI, Mimica, ElevenLabs",hq:"US",kp:"Vinod Khosla",fn:0,jobs:null},
  {id:"index",name:"Index Ventures",s:"Index",cat:"investor",yr:1996,focus:"Tessl A",hq:"LDN/SF",kp:"Rimer",fn:0,jobs:null},
  {id:"lightspeed",name:"Lightspeed",s:"Lightspeed",cat:"investor",yr:2000,focus:"Helsing, Paid AI",hq:"London",kp:null,fn:0,jobs:null},
  {id:"plural",name:"Plural",s:"Plural",cat:"investor",yr:2022,focus:"€400M II. Helsing/Unitary/Metaview/Robin AI",hq:"London",kp:"Hinrikus (Wise), Hogarth (AISI)",fn:0,jobs:null},
  {id:"mmc",name:"MMC Ventures",s:"MMC",cat:"investor",yr:2000,focus:"UK's largest AI investor (75 cos)",hq:"London",kp:"Kelnar",fn:0,jobs:null},
  // ACADEMIC
  {id:"ucl",name:"UCL",s:"UCL",cat:"academic",yr:1826,focus:"Gatsby Unit · DM birthplace · 46 spinouts £3.4B",hq:"King's Cross",fn:0,jobs:null},
  {id:"cambridge",name:"Cambridge",s:"Cambridge",cat:"academic",yr:1209,focus:"ML Group · #1 GenAI founders EU (7.9%)",hq:"Cambridge",fn:0,jobs:null},
  {id:"oxford",name:"Oxford",s:"Oxford",cat:"academic",yr:1096,focus:"OATML · NLP · Onfido/Eigen/Exscientia/Oxbotica spinouts",hq:"Oxford",fn:0,jobs:null},
  {id:"imperial",name:"Imperial",s:"Imperial",cat:"academic",yr:1907,focus:"Robotics · CV · 7% EU GenAI founders",hq:"S. Kensington",fn:0,jobs:null},
  {id:"turing",name:"Turing Institute",s:"Turing",cat:"academic",yr:2015,focus:"National AI institute · 13+ unis",hq:"King's Cross",fn:0,jobs:null},
  // ACCELERATORS
  {id:"ef",name:"Entrepreneur First",s:"EF",cat:"accelerator",yr:2011,focus:"$10B+ portfolio. Tractable/Cleo/PolyAI/Mimica",hq:"London",fn:0,jobs:null},
  {id:"seedcamp",name:"Seedcamp",s:"Seedcamp",cat:"accelerator",yr:2007,focus:"550+ cos · 10+ unicorns",hq:"London",fn:0,jobs:null},
];

const edges=[
  {s:"deepmind",t:"ineffable",ty:"alumni",l:"David Silver"},
  {s:"deepmind",t:"isomorphic",ty:"spinoff",l:"Hassabis dual CEO"},
  {s:"deepmind",t:"mistral",ty:"alumni",l:"Mensch"},
  {s:"deepmind",t:"elevenlabs",ty:"alumni",l:"Dąbkowski"},
  {s:"deepmind",t:"ms-research",ty:"alumni",l:"Suleyman→MS AI"},
  {s:"deepmind",t:"meta-ai",ty:"alumni",l:"Fergus→FAIR"},
  {s:"deepmind",t:"latent-labs",ty:"alumni",l:"Kohl"},
  {s:"deepmind",t:"convergence",ty:"alumni",l:"DM team"},
  {s:"ucl",t:"deepmind",ty:"academic",l:"Gatsby"},
  {s:"ucl",t:"synthesia",ty:"academic",l:"Agapito"},
  {s:"ucl",t:"holistic-ai",ty:"academic",l:"Founders"},
  {s:"cambridge",t:"wayve",ty:"academic",l:"Kendall PhD"},
  {s:"cambridge",t:"polyai",ty:"academic",l:"All 3 founders"},
  {s:"cambridge",t:"darktrace",ty:"academic"},
  {s:"cambridge",t:"tractable",ty:"academic",l:"Ranca"},
  {s:"cambridge",t:"healx",ty:"academic",l:"Guilliams"},
  {s:"oxford",t:"cohere",ty:"academic",l:"Gomez"},
  {s:"oxford",t:"onfido",ty:"academic",l:"3 students"},
  {s:"oxford",t:"exscientia",ty:"academic"},
  {s:"oxford",t:"oxbotica",ty:"academic",l:"Newman/Posner"},
  {s:"oxford",t:"mind-foundry",ty:"academic",l:"Roberts/Osborne"},
  {s:"oxford",t:"diffblue",ty:"academic",l:"Kroening"},
  {s:"imperial",t:"elevenlabs",ty:"academic",l:"Staniszewski"},
  {s:"imperial",t:"tractable",ty:"academic",l:"Dalyac"},
  {s:"softbank",t:"wayve",ty:"investment",l:"$1.05B C"},
  {s:"softbank",t:"tractable",ty:"investment"},
  {s:"softbank",t:"graphcore",ty:"investment",l:"Acquired"},
  {s:"softbank",t:"exscientia",ty:"investment"},
  {s:"sequoia-eu",t:"elevenlabs",ty:"investment",l:"$500M D"},
  {s:"sequoia-eu",t:"ineffable",ty:"investment",l:"In talks"},
  {s:"nvidia-inv",t:"wayve",ty:"investment"},
  {s:"nvidia-inv",t:"synthesia",ty:"investment"},
  {s:"nvidia-inv",t:"elevenlabs",ty:"investment"},
  {s:"nvidia-inv",t:"polyai",ty:"investment"},
  {s:"nvidia-inv",t:"latent-labs",ty:"investment"},
  {s:"nvidia-inv",t:"basecamp-res",ty:"investment"},
  {s:"gv",t:"synthesia",ty:"investment",l:"$200M E"},
  {s:"gv",t:"isomorphic",ty:"investment"},
  {s:"gv",t:"phoebe",ty:"investment"},
  {s:"gv",t:"metaview",ty:"investment"},
  {s:"balderton",t:"wayve",ty:"investment"},
  {s:"balderton",t:"cleo",ty:"investment"},
  {s:"balderton",t:"convergence",ty:"investment"},
  {s:"atomico",t:"graphcore",ty:"investment"},
  {s:"atomico",t:"synthesia",ty:"investment"},
  {s:"atomico",t:"physicsx",ty:"investment",l:"$135M B"},
  {s:"atomico",t:"healx",ty:"investment",l:"$56M B"},
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
  {s:"index",t:"tessl",ty:"investment"},
  {s:"lightspeed",t:"helsing",ty:"investment"},
  {s:"lightspeed",t:"paid-ai",ty:"investment"},
  {s:"khosla",t:"polyai",ty:"investment"},
  {s:"khosla",t:"mimica",ty:"investment"},
  {s:"khosla",t:"elevenlabs",ty:"investment"},
  {s:"plural",t:"helsing",ty:"investment"},
  {s:"plural",t:"unitary",ty:"investment"},
  {s:"plural",t:"metaview",ty:"investment"},
  {s:"plural",t:"robin-ai",ty:"investment"},
  {s:"ef",t:"tractable",ty:"accelerator"},
  {s:"ef",t:"cleo",ty:"accelerator"},
  {s:"ef",t:"polyai",ty:"accelerator"},
  {s:"ef",t:"mimica",ty:"accelerator"},
  {s:"seedcamp",t:"metaview",ty:"accelerator"},
  {s:"faculty",t:"openai",ty:"partnership",l:"Red teaming"},
  {s:"turing",t:"ucl",ty:"academic"},
  {s:"turing",t:"cambridge",ty:"academic"},
  {s:"turing",t:"oxford",ty:"academic"},
  {s:"meta-ai",t:"cohere",ty:"alumni",l:"Pineau"},
  {s:"cohere",t:"convergence",ty:"alumni"},
  {s:"graphcore",t:"deepmind",ty:"partnership",l:"Hassabis angel"},
  {s:"oxbotica",t:"wayve",ty:"partnership"},
];

// ── HELPERS ─────────────────────────────────────────────────────────────
function nr(c){if(c.cat==="frontier")return 26;if(c.cat==="investor")return 10;if(c.cat==="academic")return 13;if(c.cat==="accelerator")return 9;if(c.cat==="frontier-emerging")return 18;const f=c.fn||0;if(f>=1000)return 22;if(f>=500)return 18;if(f>=200)return 15;if(f>=50)return 12;if(f>=10)return 10;return 8;}

// ── NETWORK SCORE ───────────────────────────────────────────────────────
function calcScore(ud){
  const entries=Object.entries(ud);
  if(!entries.length) return {score:0,level:"Explorer",pct:0,breakdown:{}};
  let pts=0;
  const breakdown={connections:entries.length,categories:new Set(),statuses:{}};
  entries.forEach(([id,d])=>{
    const co=companies.find(c=>c.id===id);
    pts+=US[d.status]?.pts||1;
    if(d.contact) pts+=5; // bonus for named contact
    if(d.notes) pts+=2;
    if(co) breakdown.categories.add(co.cat);
    breakdown.statuses[d.status]=(breakdown.statuses[d.status]||0)+1;
  });
  // Category diversity bonus
  pts+=breakdown.categories.size*3;
  // Frontier coverage bonus
  const frontierIds=["deepmind","anthropic","openai","meta-ai","ms-research","mistral","cohere"];
  const frontierCoverage=frontierIds.filter(id=>ud[id]).length;
  pts+=frontierCoverage*5;
  breakdown.catCount=breakdown.categories.size;
  breakdown.frontierCoverage=frontierCoverage;

  const levels=[
    {min:0,name:"Explorer",emoji:"🔭"},
    {min:15,name:"Insider",emoji:"🔑"},
    {min:40,name:"Connector",emoji:"🕸️"},
    {min:80,name:"Influencer",emoji:"⭐"},
    {min:150,name:"Ecosystem Leader",emoji:"👑"},
    {min:300,name:"London AI Titan",emoji:"🏆"},
  ];
  const lv=levels.filter(l=>pts>=l.min).pop();
  const nextLv=levels.find(l=>l.min>pts);
  const pct=nextLv?Math.round((pts-lv.min)/(nextLv.min-lv.min)*100):100;
  return {score:pts,level:lv.name,emoji:lv.emoji,pct,nextLevel:nextLv?.name,nextMin:nextLv?.min,breakdown};
}

// ── STORAGE ─────────────────────────────────────────────────────────────
function loadUD(){try{const r=localStorage.getItem("lai-net-v4");return r?JSON.parse(r):{};}catch{return {};}}
function saveUD(d){try{localStorage.setItem("lai-net-v4",JSON.stringify(d));}catch{}}
function loadProfile(){try{const r=localStorage.getItem("lai-profile-v1");return r?JSON.parse(r):{name:"",handle:""};}catch{return {name:"",handle:""};}}
function saveProfile(d){try{localStorage.setItem("lai-profile-v1",JSON.stringify(d));}catch{}}
async function loadLeaderboard(){try{const r=await window.storage?.get("lai-leaderboard-v1",true);return r?JSON.parse(r.value):[];}catch{return [];}}
function saveLeaderboard(lb){try{localStorage.setItem("lai-leaderboard-v1",JSON.stringify(lb));}catch{}}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function App(){
  const svgRef=useRef(null);
  const [sel,setSel]=useState(null);
  const [search,setSearch]=useState("");
  const [cats,setCats]=useState(new Set(Object.keys(CC)));
  const [hov,setHov]=useState(null);
  const [yr,setYr]=useState([1990,2026]);
  const [dim,setDim]=useState({w:1200,h:800});
  const [tab,setTab]=useState("info");
  const [layout,setLayout]=useState("force");
  const [ud,setUd]=useState({});
  const [showMyNet,setShowMyNet]=useState(false);
  const [editConn,setEditConn]=useState(null);
  const [cf,setCf]=useState({status:"target",contact:"",notes:""});
  const [panel,setPanel]=useState("graph"); // graph | updates | people | score
  const [profile,setProfile]=useState({name:"",handle:""});
  const [lb,setLb]=useState([]);

  useEffect(()=>{setUd(loadUD());setProfile(loadProfile());setLb(loadLeaderboard());},[]);
  useEffect(()=>{const u=()=>setDim({w:window.innerWidth,h:window.innerHeight});u();window.addEventListener("resize",u);return()=>window.removeEventListener("resize",u);},[]);

  const filt=useMemo(()=>companies.filter(c=>{
    if(!cats.has(c.cat))return false;
    if(search){const q=search.toLowerCase();if(!c.name.toLowerCase().includes(q)&&!(c.focus||"").toLowerCase().includes(q)&&!(c.founders||"").toLowerCase().includes(q)&&!(c.s||"").toLowerCase().includes(q))return false;}
    if(c.yr&&(c.yr<yr[0]||c.yr>yr[1]))return false;
    if(showMyNet&&!ud[c.id])return false;
    return true;
  }),[cats,search,yr,showMyNet,ud]);

  const fEdges=useMemo(()=>{const ids=new Set(filt.map(c=>c.id));return edges.filter(e=>ids.has(e.s)&&ids.has(e.t));},[filt]);
  const hovConn=useMemo(()=>{if(!hov)return null;const c=new Set([hov]);edges.forEach(e=>{if(e.s===hov)c.add(e.t);if(e.t===hov)c.add(e.s);});return c;},[hov]);
  const score=useMemo(()=>calcScore(ud),[ud]);
  const earnedBadges=useMemo(()=>BADGES.filter(b=>b.check(ud,companies)),[ud]);

  const tc=c=>setCats(p=>{const n=new Set(p);n.has(c)?n.delete(c):n.add(c);return n;});

  const saveConn=(id,data)=>{
    const next={...ud};if(data)next[id]=data;else delete next[id];
    setUd(next);saveUD(next);setEditConn(null);
    // Update leaderboard
    if(profile.name){
      const sc=calcScore(next);
      const nlb=[...lb.filter(e=>e.name!==profile.name),{name:profile.name,score:sc.score,level:sc.level,count:Object.keys(next).length,updated:Date.now()}].sort((a,b)=>b.score-a.score).slice(0,50);
      setLb(nlb);saveLeaderboard(nlb);
    }
  };

  const updateProfile=(p)=>{setProfile(p);saveProfile(p);};

  // D3
  useEffect(()=>{
    if(!svgRef.current||panel!=="graph")return;
    const svg=d3.select(svgRef.current);svg.selectAll("*").remove();
    const{w,h}=dim;const nodes=filt.map(c=>({...c,r:nr(c)}));
    const nodeMap=new Map(nodes.map(n=>[n.id,n]));
    const links=fEdges.filter(e=>nodeMap.has(e.s)&&nodeMap.has(e.t)).map(e=>({...e,source:e.s,target:e.t}));
    const g=svg.append("g");
    const zoom=d3.zoom().scaleExtent([0.08,6]).on("zoom",e=>g.attr("transform",e.transform));
    svg.call(zoom).call(zoom.transform,d3.zoomIdentity.translate(w/2,h/2).scale(0.5).translate(-w/2,-h/2));
    const defs=svg.append("defs");
    const gl=defs.append("filter").attr("id","gl").attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%");
    gl.append("feGaussianBlur").attr("stdDeviation","3.5").attr("result","b");
    const mg=gl.append("feMerge");mg.append("feMergeNode").attr("in","b");mg.append("feMergeNode").attr("in","SourceGraphic");

    const catCenters={};
    if(layout==="cluster"){const cl=[...new Set(filt.map(c=>c.cat))];const cols=Math.ceil(Math.sqrt(cl.length));cl.forEach((cat,i)=>{catCenters[cat]={x:w*0.15+i%cols*(w*0.7/(cols-1||1)),y:h*0.15+Math.floor(i/cols)*(h*0.7/(Math.ceil(cl.length/cols)-1||1))};});}

    const sim=d3.forceSimulation(nodes)
      .force("link",d3.forceLink(links).id(d=>d.id).distance(d=>d.ty==="alumni"?85:d.ty==="investment"?130:105).strength(layout==="force"?0.2:0.04))
      .force("charge",d3.forceManyBody().strength(d=>-d.r*(layout==="force"?18:10)))
      .force("center",layout==="force"?d3.forceCenter(w/2,h/2).strength(0.04):null)
      .force("collision",d3.forceCollide().radius(d=>d.r+4))
      .force("x",d3.forceX(d=>layout==="cluster"&&catCenters[d.cat]?catCenters[d.cat].x:w/2).strength(layout==="cluster"?0.3:0.015))
      .force("y",d3.forceY(d=>layout==="cluster"&&catCenters[d.cat]?catCenters[d.cat].y:h/2).strength(layout==="cluster"?0.3:0.015));

    if(layout==="cluster")Object.entries(catCenters).forEach(([cat,pos])=>{g.append("text").text(CC[cat]?.l||cat).attr("x",pos.x).attr("y",pos.y-50).attr("text-anchor","middle").attr("fill",CC[cat]?.c||"#666").attr("font-size","10px").attr("font-family","'Outfit',sans-serif").attr("font-weight","600").attr("opacity",0.4);});

    const link=g.append("g").selectAll("line").data(links).enter().append("line").attr("stroke",d=>ECfg[d.ty]?.c||"#333").attr("stroke-width",d=>d.ty==="alumni"?1.3:0.7).attr("stroke-opacity",0.16).attr("stroke-dasharray",d=>ECfg[d.ty]?.d||null);
    const node=g.append("g").selectAll("g").data(nodes).enter().append("g").attr("cursor","pointer")
      .call(d3.drag().on("start",(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;}).on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y;}).on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}))
      .on("click",(e,d)=>{e.stopPropagation();setSel(p=>p?.id===d.id?null:companies.find(c=>c.id===d.id));setTab("info");setPanel("graph");})
      .on("mouseenter",(e,d)=>setHov(d.id)).on("mouseleave",()=>setHov(null));

    node.append("circle").attr("r",d=>d.r+2).attr("fill","none").attr("stroke",d=>CC[d.cat]?.c||"#666").attr("stroke-width",0.7).attr("stroke-opacity",0.1).attr("filter","url(#gl)");
    node.append("circle").attr("r",d=>d.r).attr("fill",d=>(CC[d.cat]?.c||"#666")+"18").attr("stroke",d=>CC[d.cat]?.c||"#666").attr("stroke-width",1.2);
    node.filter(d=>ud[d.id]).append("circle").attr("r",d=>d.r+4).attr("fill","none").attr("stroke",d=>US[ud[d.id]?.status]?.c||"#30D158").attr("stroke-width",1.8).attr("stroke-dasharray","3,2").attr("stroke-opacity",0.75);
    node.append("text").text(d=>CC[d.cat]?.i||"").attr("text-anchor","middle").attr("dominant-baseline","central").attr("font-size",d=>Math.max(d.r*0.55,7)+"px").attr("pointer-events","none");
    node.append("text").text(d=>{const n=d.s||d.name;return n.length>14?n.slice(0,12)+"…":n;}).attr("text-anchor","middle").attr("dy",d=>d.r+11).attr("fill","#7888A0").attr("font-size",d=>d.r>14?"9px":"7px").attr("font-family","'JetBrains Mono',monospace").attr("pointer-events","none");
    svg.on("click",()=>setSel(null));
    sim.on("tick",()=>{link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);node.attr("transform",d=>`translate(${d.x},${d.y})`);});
    return()=>sim.stop();
  },[filt,fEdges,dim,layout,ud,panel]);

  useEffect(()=>{
    if(!svgRef.current||panel!=="graph")return;const svg=d3.select(svgRef.current);
    if(!hov){svg.selectAll("g>g>g").attr("opacity",1);svg.selectAll("line").attr("stroke-opacity",0.16);return;}
    svg.selectAll("g>g>g").each(function(d){d3.select(this).attr("opacity",hovConn?.has(d?.id)?1:0.07);});
    svg.selectAll("line").each(function(d){const si=typeof d?.source==="object"?d.source.id:d?.source;const ti=typeof d?.target==="object"?d.target.id:d?.target;const c=si===hov||ti===hov;d3.select(this).attr("stroke-opacity",c?0.6:0.02).attr("stroke-width",c?2.2:0.7);});
  },[hov,hovConn,panel]);

  const ce=sel?edges.filter(e=>e.s===sel.id||e.t===sel.id):[];
  const selUD=sel?ud[sel.id]:null;
  const relatedPeople=sel?Object.entries(PEOPLE).filter(([n,p])=>p.co.includes(sel.id)):[];
  const mn=Object.keys(ud).length;

  return(
    <div style={{width:"100vw",height:"100vh",background:"#060A14",overflow:"hidden",fontFamily:"'JetBrains Mono','SF Mono',monospace",position:"relative",color:"#E2E8F0"}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:4px}input[type=range]{-webkit-appearance:none;background:transparent}input[type=range]::-webkit-slider-track{height:2px;background:#1E293B;border-radius:2px}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:8px;border-radius:50%;background:#FF2D55;margin-top:-3px;cursor:pointer}`}</style>

      {/* HEADER */}
      <div style={{position:"absolute",top:0,left:0,right:0,padding:"10px 14px",background:"linear-gradient(180deg,rgba(6,10,20,0.97),rgba(6,10,20,0))",zIndex:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flexShrink:0}}>
          <h1 style={{margin:0,fontSize:18,fontFamily:"'Outfit',sans-serif",fontWeight:800,background:"linear-gradient(135deg,#FF2D55,#BF5AF2,#00D4FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>London AI Ecosystem</h1>
          <p style={{margin:0,fontSize:8.5,color:"#475569"}}>{filt.length} entities · {fEdges.length} edges · {mn>0?`${mn} tracked · `:""}v4</p>
        </div>
        <div style={{flex:1}}/>
        {/* Nav tabs */}
        <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:"1px solid #1E293B"}}>
          {[["graph","🌌 Map"],["updates","📡 Updates"],["people","👤 People"],["score","🏆 Score"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setPanel(k);if(k!=="graph")setSel(null);}} style={{padding:"4px 9px",border:"none",background:panel===k?"#1E293B":"transparent",color:panel===k?"#E2E8F0":"#475569",fontSize:8.5,fontFamily:"inherit",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {panel==="graph"&&<>
          <div style={{display:"flex",gap:0,borderRadius:5,overflow:"hidden",border:"1px solid #1E293B"}}>
            {[["force","✦"],["cluster","⊞"]].map(([k,l])=>(
              <button key={k} onClick={()=>setLayout(k)} style={{padding:"4px 8px",border:"none",background:layout===k?"#1E293B":"transparent",color:layout===k?"#E2E8F0":"#475569",fontSize:9,cursor:"pointer"}} title={k==="force"?"Constellation":"Cluster"}>{l}</button>
            ))}
          </div>
          <button onClick={()=>setShowMyNet(!showMyNet)} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${showMyNet?"#30D158":"#1E293B"}`,background:showMyNet?"#30D15818":"transparent",color:showMyNet?"#30D158":"#475569",fontSize:8.5,cursor:"pointer",fontFamily:"inherit"}}>🤝</button>
        </>}
        <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #1E293B",background:"#0F172A",color:"#E2E8F0",fontSize:10,width:150,outline:"none",fontFamily:"inherit"}}/>
        {/* Score badge */}
        {score.score>0&&<div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:"#1E293B",cursor:"pointer"}} onClick={()=>setPanel("score")}>
          <span style={{fontSize:10}}>{score.emoji}</span>
          <span style={{fontSize:9,color:"#FFD700",fontWeight:600}}>{score.score}</span>
        </div>}
      </div>

      {/* LEFT SIDEBAR (graph mode only) */}
      {panel==="graph"&&<div style={{position:"absolute",top:55,left:6,zIndex:10,background:"rgba(15,23,42,0.9)",borderRadius:10,padding:"7px 7px 10px",backdropFilter:"blur(14px)",border:"1px solid #1E293B",maxHeight:"calc(100vh - 75px)",overflowY:"auto",width:155}}>
        <div style={{display:"flex",gap:2,marginBottom:5}}>
          {[["All",()=>setCats(new Set(Object.keys(CC)))],["None",()=>setCats(new Set())],["Cos",()=>setCats(new Set(Object.keys(CC).filter(k=>!["investor","academic","accelerator"].includes(k))))]].map(([l,fn])=>(
            <button key={l} onClick={fn} style={{flex:1,padding:"2px",borderRadius:4,border:"1px solid #1E293B",background:"transparent",color:"#64748B",fontSize:7.5,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
        {Object.entries(CC).map(([k,cfg])=>(
          <div key={k} onClick={()=>tc(k)} style={{display:"flex",alignItems:"center",gap:5,padding:"2px 3px",borderRadius:3,cursor:"pointer",opacity:cats.has(k)?1:0.22}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:cfg.c,flexShrink:0}}/>
            <span style={{fontSize:8.5,color:"#CBD5E1",flex:1}}>{cfg.l}</span>
            <span style={{fontSize:7,color:"#475569"}}>{companies.filter(c=>c.cat===k).length}</span>
          </div>
        ))}
        <div style={{marginTop:6,paddingTop:5,borderTop:"1px solid #1E293B"}}>
          <div style={{fontSize:7.5,color:"#475569",fontWeight:600,marginBottom:3}}>FOUNDED {yr[0]}–{yr[1]}</div>
          <input type="range" min={1990} max={2026} value={yr[0]} onChange={e=>setYr([+e.target.value,yr[1]])} style={{width:"100%"}}/>
          <input type="range" min={1990} max={2026} value={yr[1]} onChange={e=>setYr([yr[0],+e.target.value])} style={{width:"100%"}}/>
        </div>
        <div style={{marginTop:6,paddingTop:5,borderTop:"1px solid #1E293B"}}>
          <div style={{fontSize:7.5,color:"#475569",fontWeight:600,marginBottom:3}}>EDGES</div>
          {Object.entries(ECfg).map(([t,cfg])=>(<div key={t} style={{display:"flex",alignItems:"center",gap:4,marginBottom:1}}><div style={{width:10,height:1.5,background:cfg.c}}/><span style={{fontSize:7.5,color:"#64748B"}}>{cfg.l}</span></div>))}
        </div>
      </div>}

      {/* MAIN CANVAS / PANELS */}
      {panel==="graph"&&<svg ref={svgRef} width={dim.w} height={dim.h} style={{display:"block"}}/>}

      {panel==="updates"&&<div style={{position:"absolute",top:55,left:0,right:0,bottom:0,overflowY:"auto",padding:"0 20px 20px"}}>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:"#F8FAFC",margin:"10px 0"}}>Ecosystem Updates</h2>
        <p style={{fontSize:9.5,color:"#475569",marginBottom:16}}>Latest movements, funding rounds, acquisitions, and key hires across London AI.</p>
        {UPDATES.map((u,i)=>{
          const co=companies.find(c=>c.id===u.company);
          const typeColors={funding:"#30D158",acquisition:"#BF5AF2",founding:"#FF6B9D",people:"#00D4FF",milestone:"#FFD60A",partnership:"#64D2FF"};
          return(<div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #111827"}}>
            <div style={{flexShrink:0,width:75}}>
              <div style={{fontSize:9,color:"#475569"}}>{u.date}</div>
              <div style={{fontSize:8,color:typeColors[u.type]||"#666",textTransform:"uppercase",fontWeight:600,marginTop:2}}>{u.type}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:"#E2E8F0",lineHeight:1.4}}>{u.text}</div>
              {co&&<span onClick={()=>{setSel(co);setPanel("graph");setTab("info");}} style={{fontSize:9,color:CC[co.cat]?.c||"#666",cursor:"pointer",marginTop:3,display:"inline-block"}}>{CC[co.cat]?.i} {co.name} →</span>}
            </div>
          </div>);
        })}
      </div>}

      {panel==="people"&&<div style={{position:"absolute",top:55,left:0,right:0,bottom:0,overflowY:"auto",padding:"0 20px 20px"}}>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:"#F8FAFC",margin:"10px 0"}}>Key People</h2>
        <p style={{fontSize:9.5,color:"#475569",marginBottom:16}}>Founders, CEOs, and key leaders with social links.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
          {Object.entries(PEOPLE).map(([name,p])=>(
            <div key={name} style={{background:"#0F172A",borderRadius:8,padding:"10px 12px",border:"1px solid #1E293B"}}>
              <div style={{fontSize:12,color:"#F8FAFC",fontWeight:600}}>{name}</div>
              <div style={{fontSize:9.5,color:"#64748B",marginTop:2}}>{p.role}</div>
              <div style={{display:"flex",gap:6,marginTop:6}}>
                {p.tw&&<a href={p.tw} target="_blank" rel="noopener" style={{fontSize:9,color:"#1DA1F2",textDecoration:"none"}}>𝕏 Twitter</a>}
                {p.li&&<a href={p.li} target="_blank" rel="noopener" style={{fontSize:9,color:"#0A66C2",textDecoration:"none"}}>in LinkedIn</a>}
              </div>
              <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                {p.co.map(cid=>{const co=companies.find(c=>c.id===cid);return co?<span key={cid} onClick={()=>{setSel(co);setPanel("graph");setTab("info");}} style={{fontSize:8,color:CC[co.cat]?.c,cursor:"pointer",padding:"1px 5px",borderRadius:3,background:(CC[co.cat]?.c||"#666")+"18"}}>{co.s||co.name}</span>:null;})}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {panel==="score"&&<div style={{position:"absolute",top:55,left:0,right:0,bottom:0,overflowY:"auto",padding:"0 20px 20px"}}>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:"#F8FAFC",margin:"10px 0"}}>Network Score & Badges</h2>
        {/* Profile */}
        <div style={{background:"#0F172A",borderRadius:10,padding:"14px",border:"1px solid #1E293B",marginBottom:12}}>
          <div style={{fontSize:9,color:"#475569",fontWeight:600,marginBottom:6}}>YOUR PROFILE</div>
          <div style={{display:"flex",gap:8}}>
            <input type="text" placeholder="Your name" value={profile.name} onChange={e=>updateProfile({...profile,name:e.target.value})} style={{flex:1,padding:"5px 8px",borderRadius:5,border:"1px solid #1E293B",background:"#111827",color:"#E2E8F0",fontSize:10,fontFamily:"inherit",outline:"none"}}/>
            <input type="text" placeholder="@twitter (optional)" value={profile.handle} onChange={e=>updateProfile({...profile,handle:e.target.value})} style={{flex:1,padding:"5px 8px",borderRadius:5,border:"1px solid #1E293B",background:"#111827",color:"#E2E8F0",fontSize:10,fontFamily:"inherit",outline:"none"}}/>
          </div>
        </div>
        {/* Score card */}
        <div style={{background:"linear-gradient(135deg,#1E293B,#0F172A)",borderRadius:12,padding:"20px",border:"1px solid #334155",marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:40}}>{score.emoji||"🔭"}</div>
          <div style={{fontSize:28,fontWeight:800,fontFamily:"'Outfit',sans-serif",color:"#FFD700",marginTop:4}}>{score.score}</div>
          <div style={{fontSize:13,color:"#E2E8F0",fontWeight:600}}>{score.level||"Explorer"}</div>
          {score.nextLevel&&<>
            <div style={{width:"100%",height:4,background:"#1E293B",borderRadius:2,marginTop:10}}>
              <div style={{width:score.pct+"%",height:4,background:"linear-gradient(90deg,#FF2D55,#FFD700)",borderRadius:2,transition:"width 0.3s"}}/>
            </div>
            <div style={{fontSize:8.5,color:"#475569",marginTop:4}}>{score.pct}% to {score.nextLevel} ({score.nextMin} pts)</div>
          </>}
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:12}}>
            <div><div style={{fontSize:16,fontWeight:700,color:"#E2E8F0"}}>{mn}</div><div style={{fontSize:8,color:"#475569"}}>Tracked</div></div>
            <div><div style={{fontSize:16,fontWeight:700,color:"#E2E8F0"}}>{score.breakdown.catCount||0}</div><div style={{fontSize:8,color:"#475569"}}>Categories</div></div>
            <div><div style={{fontSize:16,fontWeight:700,color:"#E2E8F0"}}>{score.breakdown.frontierCoverage||0}/7</div><div style={{fontSize:8,color:"#475569"}}>Frontier</div></div>
            <div><div style={{fontSize:16,fontWeight:700,color:"#E2E8F0"}}>{earnedBadges.length}/{BADGES.length}</div><div style={{fontSize:8,color:"#475569"}}>Badges</div></div>
          </div>
        </div>
        {/* Badges */}
        <div style={{fontSize:11,color:"#94A3B8",fontWeight:600,marginBottom:8}}>BADGES</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6,marginBottom:16}}>
          {BADGES.map(b=>{
            const earned=earnedBadges.find(e=>e.id===b.id);
            return(<div key={b.id} style={{background:earned?"#1E293B":"#0B1120",borderRadius:8,padding:"10px",border:`1px solid ${earned?"#334155":"#111827"}`,opacity:earned?1:0.4,textAlign:"center"}}>
              <div style={{fontSize:22}}>{b.icon}</div>
              <div style={{fontSize:10,color:"#E2E8F0",fontWeight:600,marginTop:3}}>{b.name}</div>
              <div style={{fontSize:8,color:"#475569",marginTop:2}}>{b.desc}</div>
              {earned&&<div style={{fontSize:7.5,color:"#30D158",marginTop:3}}>✓ Earned</div>}
            </div>);
          })}
        </div>
        {/* Leaderboard */}
        {lb.length>0&&<>
          <div style={{fontSize:11,color:"#94A3B8",fontWeight:600,marginBottom:8}}>LEADERBOARD</div>
          <div style={{background:"#0F172A",borderRadius:8,border:"1px solid #1E293B",overflow:"hidden"}}>
            {lb.slice(0,10).map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:"1px solid #111827"}}>
                <span style={{fontSize:12,fontWeight:700,color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#475569",width:20,textAlign:"center"}}>{i+1}</span>
                <span style={{flex:1,fontSize:11,color:"#E2E8F0"}}>{e.name}</span>
                <span style={{fontSize:10,color:"#FFD700",fontWeight:600}}>{e.score} pts</span>
                <span style={{fontSize:8,color:"#475569"}}>{e.count} cos</span>
              </div>
            ))}
          </div>
        </>}
      </div>}

      {/* DETAIL PANEL (graph mode) */}
      {sel&&panel==="graph"&&<div style={{position:"absolute",top:55,right:6,width:320,maxHeight:"calc(100vh - 75px)",overflowY:"auto",background:"rgba(15,23,42,0.95)",borderRadius:12,backdropFilter:"blur(16px)",border:"1px solid #1E293B",zIndex:20}}>
        <div style={{padding:"12px 14px 8px",borderBottom:"1px solid #1E293B"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div>
              <span style={{fontSize:8,color:CC[sel.cat]?.c,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{CC[sel.cat]?.i} {CC[sel.cat]?.l}</span>
              <h2 style={{margin:"2px 0 0",fontSize:15,fontFamily:"'Outfit',sans-serif",fontWeight:700,color:"#F8FAFC"}}>{sel.name}</h2>
              {sel.hq&&<p style={{margin:"1px 0 0",fontSize:9,color:"#64748B"}}>📍 {sel.hq}{sel.yr?` · ${sel.yr}`:""}</p>}
            </div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"#475569",fontSize:15,cursor:"pointer"}}>✕</button>
          </div>
          {selUD&&<div style={{marginTop:6,padding:"4px 7px",borderRadius:5,background:US[selUD.status]?.c+"18",border:`1px solid ${US[selUD.status]?.c}30`,display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:9}}>{US[selUD.status]?.i}</span>
            <span style={{fontSize:9,color:US[selUD.status]?.c,fontWeight:600}}>{US[selUD.status]?.l}</span>
            {selUD.contact&&<span style={{fontSize:8,color:"#94A3B8"}}>· {selUD.contact}</span>}
          </div>}
          <div style={{display:"flex",gap:0,marginTop:8}}>
            {["info","people","links","🤝"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"4px 0",border:"none",borderBottom:tab===t?`2px solid ${CC[sel.cat]?.c}`:"2px solid transparent",background:"none",color:tab===t?"#F8FAFC":"#475569",fontSize:8.5,fontFamily:"inherit",cursor:"pointer",textTransform:"uppercase",fontWeight:600}}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{padding:"10px 14px 14px"}}>
          {tab==="info"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
              {sel.fund&&<M l="Funding" v={sel.fund}/>}{sel.val&&<M l="Valuation" v={sel.val}/>}{sel.emp&&<M l="Team" v={sel.emp}/>}{sel.yr&&<M l="Founded" v={sel.yr}/>}
            </div>
            {sel.focus&&<S t="Focus" v={sel.focus}/>}
            {sel.ethos&&<S t="Ethos" v={sel.ethos}/>}
            {sel.ms&&<S t="Milestones" v={sel.ms}/>}
            {sel.jobs&&<a href={sel.jobs} target="_blank" rel="noopener" style={{display:"inline-block",padding:"6px 12px",borderRadius:6,background:"#1E293B",color:"#E2E8F0",fontSize:9.5,textDecoration:"none",fontFamily:"inherit",border:"1px solid #334155",marginTop:6}}>🔗 Careers →</a>}
          </>}
          {tab==="people"&&<>
            {sel.founders&&<S t="Founders" v={sel.founders}/>}
            {sel.kp&&<S t="Key People" v={sel.kp}/>}
            {relatedPeople.length>0&&<div style={{marginTop:8}}>
              <div style={{fontSize:8,color:"#64748B",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Social Links</div>
              {relatedPeople.map(([name,p])=>(
                <div key={name} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>
                  <span style={{fontSize:10,color:"#CBD5E1",flex:1}}>{name}</span>
                  {p.tw&&<a href={p.tw} target="_blank" rel="noopener" style={{fontSize:8,color:"#1DA1F2",textDecoration:"none"}}>𝕏</a>}
                  {p.li&&<a href={p.li} target="_blank" rel="noopener" style={{fontSize:8,color:"#0A66C2",textDecoration:"none"}}>in</a>}
                </div>
              ))}
            </div>}
            {sel.iv&&<S t="Interviews" v={sel.iv}/>}
          </>}
          {tab==="links"&&<>
            {ce.length===0?<p style={{fontSize:9,color:"#475569"}}>No connections.</p>:
              ce.map((e,i)=>{const oid=e.s===sel.id?e.t:e.s;const o=companies.find(c=>c.id===oid);if(!o)return null;
                return(<div key={i} onClick={()=>{setSel(o);setTab("info");}} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 6px",borderRadius:4,cursor:"pointer",marginBottom:2,background:"rgba(30,41,59,0.3)"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:ECfg[e.ty]?.c||"#444"}}/>
                  <span style={{fontSize:10,color:"#CBD5E1",flex:1}}>{o.name}</span>
                  {e.l&&<span style={{fontSize:7.5,color:"#475569"}}>{e.l}</span>}
                  <span style={{fontSize:7,color:"#374151",textTransform:"uppercase"}}>{e.ty}</span>
                </div>);
              })}
          </>}
          {tab==="🤝"&&<>
            <p style={{fontSize:9,color:"#64748B",marginBottom:8}}>Your connection to {sel.s||sel.name}.</p>
            {editConn===sel.id?<>
              <div style={{marginBottom:6}}>
                <div style={{fontSize:8,color:"#64748B",marginBottom:3}}>STATUS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {Object.entries(US).map(([k,cfg])=>(
                    <button key={k} onClick={()=>setCf(p=>({...p,status:k}))} style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${cf.status===k?cfg.c:"#1E293B"}`,background:cf.status===k?cfg.c+"20":"transparent",color:cf.status===k?cfg.c:"#64748B",fontSize:8,cursor:"pointer",fontFamily:"inherit"}}>{cfg.i} {cfg.l}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={cf.contact} onChange={e=>setCf(p=>({...p,contact:e.target.value}))} placeholder="Contact name (optional)" style={{width:"100%",padding:"4px 7px",borderRadius:4,border:"1px solid #1E293B",background:"#0F172A",color:"#E2E8F0",fontSize:9.5,fontFamily:"inherit",outline:"none",marginBottom:5,boxSizing:"border-box"}}/>
              <textarea value={cf.notes} onChange={e=>setCf(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)" rows={2} style={{width:"100%",padding:"4px 7px",borderRadius:4,border:"1px solid #1E293B",background:"#0F172A",color:"#E2E8F0",fontSize:9.5,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:6,boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>saveConn(sel.id,cf)} style={{flex:1,padding:"5px",borderRadius:5,border:"none",background:"#30D158",color:"#000",fontSize:9,fontWeight:600,cursor:"pointer"}}>Save</button>
                <button onClick={()=>setEditConn(null)} style={{padding:"5px 10px",borderRadius:5,border:"1px solid #1E293B",background:"transparent",color:"#64748B",fontSize:9,cursor:"pointer"}}>Cancel</button>
                {selUD&&<button onClick={()=>saveConn(sel.id,null)} style={{padding:"5px 10px",borderRadius:5,border:"1px solid #FF453A33",background:"transparent",color:"#FF453A",fontSize:9,cursor:"pointer"}}>Remove</button>}
              </div>
            </>:<>
              {selUD?<div>
                <div style={{padding:"8px",borderRadius:6,background:"#0F172A",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:12}}>{US[selUD.status]?.i}</span><span style={{fontSize:11,color:US[selUD.status]?.c,fontWeight:600}}>{US[selUD.status]?.l}</span></div>
                  {selUD.contact&&<div style={{fontSize:10,color:"#CBD5E1",marginTop:3}}>Contact: {selUD.contact}</div>}
                  {selUD.notes&&<div style={{fontSize:9.5,color:"#94A3B8",marginTop:3}}>{selUD.notes}</div>}
                </div>
                <button onClick={()=>{setCf(selUD);setEditConn(sel.id);}} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #1E293B",background:"transparent",color:"#94A3B8",fontSize:9,cursor:"pointer"}}>Edit</button>
              </div>:<>
                <button onClick={()=>{setCf({status:"target",contact:"",notes:""});setEditConn(sel.id);}} style={{padding:"5px 12px",borderRadius:5,border:"1px solid #30D15850",background:"#30D15810",color:"#30D158",fontSize:9.5,cursor:"pointer"}}>+ Add Connection</button>
              </>}
            </>}
          </>}
        </div>
      </div>}

      {/* Bottom hint */}
      {panel==="graph"&&!sel&&<div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",background:"rgba(15,23,42,0.8)",borderRadius:8,padding:"5px 14px",border:"1px solid #1E293B",zIndex:10}}>
        <p style={{margin:0,fontSize:9,color:"#475569"}}>Click → details · Hover → highlight · 🤝 track your network · 🏆 earn badges</p>
      </div>}
      {panel==="graph"&&<div style={{position:"absolute",bottom:10,right:10,display:"flex",gap:5,zIndex:10}}>
        <SB l="Cos" v={filt.filter(c=>!["investor","academic","accelerator"].includes(c.cat)).length} c="#FF2D55"/>
        {mn>0&&<SB l="Net" v={mn} c="#30D158"/>}
      </div>}
    </div>
  );
}

function M({l,v}){return(<div style={{background:"#0F172A",borderRadius:5,padding:"5px 7px"}}><div style={{fontSize:7,color:"#475569",textTransform:"uppercase",letterSpacing:0.3}}>{l}</div><div style={{fontSize:10.5,color:"#E2E8F0",fontWeight:500}}>{String(v)}</div></div>);}
function S({t,v}){return(<div style={{marginBottom:8}}><div style={{fontSize:8,color:"#64748B",textTransform:"uppercase",letterSpacing:0.3,marginBottom:1.5,fontWeight:600}}>{t}</div><div style={{fontSize:10,color:"#CBD5E1",lineHeight:1.45}}>{v}</div></div>);}
function SB({l,v,c}){return(<div style={{background:"rgba(15,23,42,0.85)",borderRadius:6,padding:"3px 8px",border:"1px solid #1E293B",textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,color:c,fontFamily:"'Outfit',sans-serif"}}>{v}</div><div style={{fontSize:7,color:"#475569",textTransform:"uppercase"}}>{l}</div></div>);}
