import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { UPDATES, companies } from "./data";

const ACCENT = "#C15F3C";
const ACCENT2 = "#d97757";
const BG = "#ffffff";
const BORDER = "#e8e5dc";
const TEXT = "#8a8a85";
const TEXT_LIGHT = "#2d2d2a";

// Aggregate capital raised per year from UPDATES funding entries
function buildCapitalData() {
  const byYear = {};
  UPDATES.filter(u => u.type === "funding").forEach(u => {
    const yr = parseInt(u.date.slice(0, 4));
    if (yr < 2016 || yr > 2026) return;
    // Extract amount from text
    let amt = 0;
    const mB = u.text.match(/\$(\d+(?:\.\d+)?)B/i);
    const mM = u.text.match(/(?:\$|£|€)(\d+(?:\.\d+)?)(?:\s*)?[Mm]/);
    if (mB) amt = parseFloat(mB[1]) * 1000;
    else if (mM) amt = parseFloat(mM[1]);
    if (!byYear[yr]) byYear[yr] = { year: yr, amount: 0, count: 0 };
    byYear[yr].amount += amt;
    byYear[yr].count += 1;
  });
  return Array.from({ length: 11 }, (_, i) => {
    const yr = 2016 + i;
    return byYear[yr] || { year: yr, amount: 0, count: 0 };
  });
}

// Companies founded per year
function buildFoundedData() {
  const byYear = {};
  companies.forEach(c => {
    if (!c.yr || c.yr < 2012 || c.yr > 2025) return;
    if (["investor", "academic", "accelerator"].includes(c.cat)) return;
    if (!byYear[c.yr]) byYear[c.yr] = { year: c.yr, count: 0 };
    byYear[c.yr].count += 1;
  });
  return Array.from({ length: 14 }, (_, i) => {
    const yr = 2012 + i;
    return byYear[yr] || { year: yr, count: 0 };
  });
}

// Cumulative companies over time
function buildCumulativeData() {
  const founded = buildFoundedData();
  let cum = 0;
  return founded.map(d => {
    cum += d.count;
    return { year: d.year, total: cum, new: d.count };
  });
}

// Key stats
function buildStats() {
  const cos = companies.filter(c => !["investor", "academic", "accelerator"].includes(c.cat));
  const totalFunding = cos.reduce((sum, c) => sum + (c.fn || 0), 0);
  const unicorns = cos.filter(c => c.fn >= 500).length;
  const dmAlumni = ["ineffable", "isomorphic", "mistral", "elevenlabs", "latent-labs", "convergence", "finster", "ms-research"].length;
  return { totalCos: cos.length, totalFunding, unicorns, dmAlumni };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#ffffff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: TEXT_LIGHT, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || ACCENT, fontSize: 11 }}>
          {p.name}: {typeof p.value === "number" && p.name.includes("$") ? `$${p.value.toLocaleString()}M` : p.value}
        </div>
      ))}
    </div>
  );
};

export default function InsightsPanel({ isMobile }) {
  const capitalData = useMemo(buildCapitalData, []);
  const cumulativeData = useMemo(buildCumulativeData, []);
  const stats = useMemo(buildStats, []);

  return (
    <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", background: "#ffffff" }}>
      <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: isMobile ? 24 : 30, fontWeight: 700, color: "#1a1a18", margin: "16px 0 6px" }}>London AI Insights</h2>
      <p style={{ fontSize: isMobile ? 13 : 14, color: "#8a8a85", marginBottom: 16 }}>Data-driven view of London's AI ecosystem momentum</p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        <StatCard label="Companies Mapped" value={stats.totalCos} icon="🏢" />
        <StatCard label="Total Funding" value={`$${Math.round(stats.totalFunding / 1000)}B+`} icon="💰" />
        <StatCard label="Unicorns ($1B+)" value={stats.unicorns} icon="🦄" />
        <StatCard label="UK AI Workers" value="86,000" icon="👥" />
      </div>

      {/* ── UK AI REGULATION ────────────────────────────────────── */}
      <div style={{ background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: isMobile ? "12px 10px" : "16px 18px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, color: TEXT_LIGHT, fontWeight: 700, margin: "0 0 4px" }}>🏛️ UK AI Regulation</h3>
        <p style={{ fontSize: 13, color: TEXT, margin: "0 0 14px" }}>The UK is charting a distinct path — pro-innovation, sector-specific, and deliberately avoiding the EU's prescriptive model</p>

        {/* Summary */}
        <div style={{ fontSize: 14, color: "#4a4a45", lineHeight: 1.7, marginBottom: 14 }}>
          <p style={{ margin: "0 0 10px" }}>The UK government has opted against comprehensive AI legislation, instead relying on <strong style={{ color: "#1a1a18" }}>existing regulators</strong> (FCA, ICO, CMA, Ofcom) to apply five cross-sector principles: safety, transparency, fairness, accountability, and contestability. A dedicated <strong style={{ color: "#1a1a18" }}>UK AI Bill</strong> is expected no earlier than H2 2026, covering the most powerful general-purpose AI models and the contentious AI-and-copyright question.</p>
          <p style={{ margin: "0 0 10px" }}>Meanwhile, the government is betting heavily on <strong style={{ color: "#1a1a18" }}>AI Growth Zones</strong>, <strong style={{ color: "#1a1a18" }}>AI Growth Labs</strong> (regulatory sandboxes), and the <strong style={{ color: "#1a1a18" }}>£500M Sovereign AI fund</strong> (launching April 2026, chaired by Balderton's James Wise) to attract investment — £40B+ in private commitments in 2025 alone. The approach is explicitly pro-growth: regulate later, attract capital now.</p>
          <p style={{ margin: 0 }}>The tension is real. The creative industries are pushing for mandatory licensing of copyrighted works used in AI training. AI developers want broad text-and-data-mining exceptions. The government's copyright impact assessment is due by <strong style={{ color: "#1a1a18" }}>18 March 2026</strong> — a pivotal moment that will shape the UK's AI regulatory identity.</p>
        </div>

        {/* Timeline — latest first */}
        <div style={{ fontSize: 11, color: "#a0a09b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Regulatory Timeline</div>
        <div style={{ borderLeft: `2px solid ${ACCENT}44`, paddingLeft: 12, marginBottom: 14 }}>
          {[
            { date: "H2 2026", text: "UK AI Bill expected — scope likely to cover frontier AI models, copyright, and possibly a new AI regulatory body", highlight: true, src: "https://www.taylorwessing.com/en/interface/2025/predictions-2026/uk-tech-and-digital-regulatory-policy-in-2026" },
            { date: "Apr 2026", text: "UK Sovereign AI Unit launches £500M fund (DSIT-backed, chaired by James Wise of Balderton)", highlight: true, src: "https://sovereignai.gov.uk/" },
            { date: "Mar 2026", text: "Government due to publish AI copyright impact assessment and policy response — pivotal decision point", highlight: true, src: "https://www.osborneclarke.com/insights/regulatory-outlook-february-2026-artificial-intelligence" },
            { date: "Feb 2026", text: "Deepfake intimate images criminalised under DUA Act. Automated decision-making rules relaxed under new UK GDPR amendments", src: "https://www.osborneclarke.com/insights/regulatory-outlook-february-2026-artificial-intelligence" },
            { date: "Dec 2025", text: "Government publishes copyright consultation progress report. Majority of respondents favour mandatory licensing", src: "https://www.osborneclarke.com/insights/regulatory-outlook-january-2026-artificial-intelligence" },
            { date: "Nov 2025", text: "£24B+ private AI investment committed in a single month (Microsoft, Google, Nvidia, OpenAI Stargate UK)", src: "https://www.gov.uk/government/news/ai-to-power-national-renewal-as-government-announces-billions-of-additional-investment-and-new-plans-to-boost-uk-businesses-jobs-and-innovation" },
            { date: "Nov 2025", text: "Getty Images v Stability AI dismissed in UK High Court on territorial grounds", src: "https://www.kslaw.com/news-and-insights/eu-uk-ai-round-up-december-2025" },
            { date: "Oct 2025", text: "MI5 warns of 'potential future risks from autonomous AI systems'. AISI confirms control-undermining capabilities improving", src: "https://lordslibrary.parliament.uk/potential-future-risks-from-autonomous-ai-systems/" },
            { date: "Oct 2025", text: "Government proposes AI Growth Labs — regulatory sandboxes to test AI with temporarily relaxed rules", src: "https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-united-kingdom" },
            { date: "Jun 2025", text: "Demis Hassabis calls for 'smart regulation' at SXSW London", src: "https://www.cityam.com/ai-regulation-needs-to-be-smarter-in-the-uk-urges-deepmind-boss/" },
            { date: "Jun 2025", text: "Government confirms UK AI Bill delayed until H2 2026. Data Use and Access Act 2025 passes", src: "https://www.moorebarlow.com/blog/ai-regulation-in-the-uk-september-2025-update/" },
            { date: "Mar 2025", text: "AI (Regulation) Bill reintroduced in House of Lords — proposes 'AI Authority'", src: "https://www.metricstream.com/blog/ai-regulation-trends-ai-policies-us-uk-eu.html" },
            { date: "Jan 2025", text: "Labour launches AI Opportunities Action Plan — Growth Zones, National Data Library", src: "https://www.gov.uk/government/publications/ai-opportunities-action-plan" },
            { date: "Nov 2023", text: "UK hosts Bletchley Park AI Safety Summit. Ian Hogarth chairs AI Safety Institute", src: "https://www.gov.uk/government/publications/international-ai-safety-report-2025" },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 8, display: "flex", gap: 8 }}>
              <div style={{ flexShrink: 0, fontSize: 11, color: item.highlight ? ACCENT : "#8a8a85", fontWeight: 600, minWidth: isMobile ? 65 : 95 }}>{item.date}</div>
              <div style={{ flex: 1, fontSize: 13, color: item.highlight ? "#1a1a18" : "#4a4a45", lineHeight: 1.5 }}>
                {item.text}{item.src && <>{" "}<a href={item.src} target="_blank" rel="noopener" style={{ fontSize: 10, color: "#6a9bcc", textDecoration: "none" }}>📄 Source</a></>}
              </div>
            </div>
          ))}
        </div>

        {/* Key Voices */}
        <div style={{ fontSize: 10, color: "#a0a09b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Key Voices</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { name: "Demis Hassabis", role: "CEO, Google DeepMind", view: "Pro 'smart regulation' — warns against Silicon Valley's 'move fast and break things' ethos for AI. Advocates safety-first with public trust." },
            { name: "Ian Hogarth", role: "Chair, AI Safety Institute", view: "Coined 'compute governance'. Leads UK's frontier AI evaluation. Advocates for international coordination on AI safety." },
            { name: "Dario Amodei", role: "CEO, Anthropic", view: "Supports targeted regulation of frontier models. Anthropic voluntarily submits to AISI evaluations. 'Constitutional AI' as self-regulation model." },
            { name: "Connor Leahy", role: "CEO, Conjecture", view: "Strongest safety hawk in London ecosystem. Warns of existential risk from AGI. Advocates for compute caps and international treaties." },
            { name: "Liz Kendall", role: "UK Tech Secretary", view: "Leading government's 'genuine reset' on AI copyright. Balancing creative industry protections with AI innovation incentives." },
            { name: "Mustafa Suleyman", role: "CEO, Microsoft AI", view: "DeepMind co-founder turned Microsoft AI chief. Advocates for 'containment' approach to advanced AI systems." },
          ].map((v, i) => (
            <div key={i} style={{ background: "#f8f6f188", borderRadius: 6, padding: "8px 10px", border: "1px solid #e8e5dc" }}>
              <div style={{ fontSize: 11, color: "#1a1a18", fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11, color: "#8a8a85", marginBottom: 3 }}>{v.role}</div>
              <div style={{ fontSize: 12, color: "#6b6b66", lineHeight: 1.5 }}>{v.view}</div>
            </div>
          ))}
        </div>

        {/* Reading List */}
        <div style={{ fontSize: 10, color: "#a0a09b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Essential Reading</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { label: "UK Sovereign AI Unit — £500M fund launching Apr 2026", url: "https://sovereignai.gov.uk/" },
            { label: "UK AI Opportunities Action Plan (Jan 2025)", url: "https://www.gov.uk/government/publications/ai-opportunities-action-plan" },
            { label: "AI Safety Institute — Frontier AI Trends Report (Dec 2025)", url: "https://www.gov.uk/government/publications/frontier-ai-trends-report" },
            { label: "International AI Safety Report (2025) — commissioned by 30 nations", url: "https://www.gov.uk/government/publications/international-ai-safety-report-2025" },
            { label: "Hansard: AI Safety debate (Dec 2025) — cross-party views", url: "https://hansard.parliament.uk/commons/2025-12-10/debates/9F01B4B9-12CB-42E2-84E2-A65F7D30BFAF/AISafety" },
            { label: "White & Case — UK AI regulatory tracker (updated)", url: "https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-united-kingdom" },
            { label: "Osborne Clarke — UK AI Regulatory Outlook Feb 2026", url: "https://www.osborneclarke.com/insights/regulatory-outlook-february-2026-artificial-intelligence" },
            { label: "Slaughter and May — AI Update for 2026", url: "https://www.slaughterandmay.com/horizon-scanning/2026/digital/ai-update-for-2026/" },
            { label: "Demis Hassabis calls for 'smart regulation' at SXSW London (Jun 2025)", url: "https://www.cityam.com/ai-regulation-needs-to-be-smarter-in-the-uk-urges-deepmind-boss/" },
            { label: "Getty v Stability AI — UK High Court ruling (Nov 2025)", url: "https://www.kslaw.com/news-and-insights/eu-uk-ai-round-up-december-2025" },
            { label: "Taylor Wessing — UK tech & digital regulation predictions 2026", url: "https://www.taylorwessing.com/en/interface/2025/predictions-2026/uk-tech-and-digital-regulatory-policy-in-2026" },
          ].map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener" style={{ fontSize: 13, color: "#6a9bcc", textDecoration: "none", lineHeight: 1.5, display: "block" }}>
              📄 {r.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── CHARTS (compact 2-column) ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: "12px" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: TEXT_LIGHT, fontWeight: 600, margin: "0 0 8px" }}>Capital Raised ($M)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={capitalData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: TEXT }} />
              <YAxis tick={{ fontSize: 9, fill: TEXT }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}B` : `${v}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="$ Raised" fill={ACCENT} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: "12px" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: TEXT_LIGHT, fontWeight: 600, margin: "0 0 8px" }}>Ecosystem Growth</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cumulativeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: TEXT }} />
              <YAxis tick={{ fontSize: 9, fill: TEXT }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Cumulative" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="new" name="New" stroke="#6a9bcc" fill="#6a9bcc" fillOpacity={0.1} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p style={{ fontSize: 9, color: "#a0a09b", textAlign: "center", marginTop: 8 }}>
        Data sourced from tracked companies and public funding announcements in the London AI ecosystem
      </p>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{ background: BG, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "12px", textAlign: "center" }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a18", fontFamily: "'Inter',sans-serif", marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 9, color: TEXT, marginTop: 2 }}>{label}</div>
    </div>
  );
}
