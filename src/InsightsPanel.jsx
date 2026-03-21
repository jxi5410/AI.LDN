import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { UPDATES, companies } from "./data";

// Fallback colors if no theme passed
const DEFAULTS = { accent: "#C15F3C", accent2: "#d97757", card: "#ffffff", border: "#e8e5dc", mutedLight: "#8a8a85", text: "#2d2d2a", muted: "#a0a09b" };

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

export default function InsightsPanel({ isMobile, theme }) {
  const t = theme || DEFAULTS;
  const ACCENT = t.accent || DEFAULTS.accent;
  const BG = t.card || DEFAULTS.card;
  const BORDER = t.border || DEFAULTS.border;
  const TEXT = t.mutedLight || DEFAULTS.mutedLight;
  const TEXT_LIGHT = t.text || DEFAULTS.text;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
        <div style={{ color: TEXT_LIGHT, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || ACCENT, fontSize: 11 }}>
            {p.name}: {typeof p.value === "number" && p.name.includes("$") ? `$${p.value.toLocaleString()}M` : p.value}
          </div>
        ))}
      </div>
    );
  };

  const capitalData = useMemo(buildCapitalData, []);
  const cumulativeData = useMemo(buildCumulativeData, []);
  const stats = useMemo(buildStats, []);

  return (
    <div style={{ padding: isMobile ? "0 12px 20px" : "0 20px 20px" }}>

      {/* ── CHARTS (compact 2-column) ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: "12px" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: TEXT_LIGHT, fontWeight: 600, margin: "0 0 8px" }}>Capital Raised ($M)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={capitalData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
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
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: TEXT }} />
              <YAxis tick={{ fontSize: 9, fill: TEXT }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Cumulative" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="new" name="New" stroke="#6a9bcc" fill="#6a9bcc" fillOpacity={0.1} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p style={{ fontSize: 9, color: t.muted || DEFAULTS.muted, textAlign: "center", marginTop: 8 }}>
        Data sourced from tracked companies and public funding announcements in the London AI ecosystem
      </p>
    </div>
  );
}

function StatCard({ label, value, icon, theme }) {
  const t = theme || DEFAULTS;
  return (
    <div style={{ background: t.card || DEFAULTS.card, borderRadius: 8, border: `1px solid ${t.border || DEFAULTS.border}`, padding: "12px", textAlign: "center" }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: t.text || DEFAULTS.text, fontFamily: "'Inter',sans-serif", marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 9, color: t.mutedLight || DEFAULTS.mutedLight, marginTop: 2 }}>{label}</div>
    </div>
  );
}
