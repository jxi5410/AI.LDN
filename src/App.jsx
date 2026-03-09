import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { supabase } from "./supabase";
import { CC, ECfg, US, BADGES, PEOPLE, UPDATES, companies, edges } from "./data";

/* ═══════════════════════════════════════════════════════════════════════
   LONDON AI ECOSYSTEM — V5
   Auth · Stars · Feedback · Search · Podcasts · Gamification · D3 graph
   ═══════════════════════════════════════════════════════════════════════ */

// ── SCORE CALC ──────────────────────────────────────────────────────────
function calcScore(ud) {
  const entries = Object.entries(ud);
  if (!entries.length) return { score: 0, level: "Explorer", emoji: "🔭", pct: 0, breakdown: { connections: 0, catCount: 0, frontierCoverage: 0 } };
  let pts = 0;
  const cats = new Set();
  entries.forEach(([id, d]) => {
    const co = companies.find(c => c.id === id);
    pts += US[d.status]?.pts || 1;
    if (d.contact_name || d.contact) pts += 5;
    if (d.notes) pts += 2;
    if (co) cats.add(co.cat);
  });
  pts += cats.size * 3;
  const fIds = ["deepmind", "anthropic", "openai", "meta-ai", "ms-research", "mistral", "cohere"];
  const fc = fIds.filter(id => ud[id]).length;
  pts += fc * 5;
  const levels = [
    { min: 0, name: "Explorer", emoji: "🔭" }, { min: 15, name: "Insider", emoji: "🔑" },
    { min: 40, name: "Connector", emoji: "🕸️" }, { min: 80, name: "Influencer", emoji: "⭐" },
    { min: 150, name: "Ecosystem Leader", emoji: "👑" }, { min: 300, name: "London AI Titan", emoji: "🏆" },
  ];
  const lv = levels.filter(l => pts >= l.min).pop();
  const nxt = levels.find(l => l.min > pts);
  return { score: pts, level: lv.name, emoji: lv.emoji, pct: nxt ? Math.round((pts - lv.min) / (nxt.min - lv.min) * 100) : 100, nextLevel: nxt?.name, nextMin: nxt?.min, breakdown: { connections: entries.length, catCount: cats.size, frontierCoverage: fc } };
}

function nr(c) {
  if (c.cat === "frontier") return 26; if (c.cat === "investor") return 10; if (c.cat === "academic") return 13;
  if (c.cat === "accelerator") return 9; if (c.cat === "frontier-emerging") return 18;
  const f = c.fn || 0;
  if (f >= 1000) return 22; if (f >= 500) return 18; if (f >= 200) return 15; if (f >= 50) return 12; if (f >= 10) return 10; return 8;
}

// SVG icons
const XIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="#E2E8F0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const LIIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
const StarIcon = ({ filled }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"} stroke="#FFD700" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;

// ── UPDATE TYPE CONFIG ──────────────────────────────────────────────────
const UPDATE_TYPES = {
  all: { label: "All", c: "#94A3B8" },
  funding: { label: "Funding", c: "#30D158" },
  acquisition: { label: "Acquisitions", c: "#BF5AF2" },
  people: { label: "People Moves", c: "#00D4FF" },
  founding: { label: "New Companies", c: "#FF6B9D" },
  milestone: { label: "Milestones", c: "#FFD60A" },
  partnership: { label: "Partnerships", c: "#64D2FF" },
  interview: { label: "Interviews", c: "#FF9F0A" },
};

/* ═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  // Auth
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'signup'
  const [authForm, setAuthForm] = useState({ email: "", password: "", username: "", twitter: "", linkedin: "", company: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  // Core UI
  const svgRef = useRef(null);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [cats, setCats] = useState(new Set(Object.keys(CC)));
  const [hov, setHov] = useState(null);
  const [dim, setDim] = useState({ w: 1200, h: 800 });
  const [tab, setTab] = useState("info");
  const [layout, setLayout] = useState("force");
  const [panel, setPanel] = useState("graph");
  const [highlightPerson, setHighlightPerson] = useState(null);
  const [showMyNet, setShowMyNet] = useState(false);
  const [updateFilter, setUpdateFilter] = useState("all");

  // User data (from Supabase or localStorage fallback)
  const [ud, setUd] = useState({}); // connections
  const [stars, setStars] = useState(new Set()); // starred entity ids
  const [editConn, setEditConn] = useState(null);
  const [cf, setCf] = useState({ status: "target", contact_name: "", notes: "" });

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbForm, setFbForm] = useState({ category: "feature", message: "" });
  const [fbSubmitted, setFbSubmitted] = useState(false);
  const [myFeedback, setMyFeedback] = useState([]);

  // ── AUTH ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load localStorage backup immediately (fast)
    try {
      const backup = localStorage.getItem("lai-connections-backup");
      if (backup) setUd(JSON.parse(backup));
    } catch {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userObj) => {
    const userId = userObj.id;
    // Profile — try DB first, fallback to user metadata
    const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (p) {
      setProfile(p);
    } else {
      // Profile may not exist yet (email not confirmed, or trigger didn't fire)
      // Use auth metadata as fallback
      setProfile({
        id: userId,
        username: userObj.user_metadata?.username || userObj.email?.split("@")[0] || "User",
        email: userObj.email,
      });
    }
    // Connections
    const { data: conns } = await supabase.from("user_connections").select("*").eq("user_id", userId);
    if (conns && conns.length > 0) {
      const map = {};
      conns.forEach(c => { map[c.company_id] = { status: c.status, contact_name: c.contact_name, notes: c.notes, id: c.id }; });
      setUd(map);
    }
    // Stars
    const { data: st } = await supabase.from("stars").select("*").eq("user_id", userId);
    if (st) setStars(new Set(st.map(s => `${s.entity_type}:${s.entity_id}`)));
    // Feedback
    const { data: fb } = await supabase.from("feedback").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (fb) setMyFeedback(fb);
  };

  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleAuth = async (mode) => {
    setAuthLoading(true); setAuthError(""); setSignupSuccess(false);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email, password: authForm.password,
          options: {
            data: { username: authForm.username },
            emailRedirectTo: "https://londonai.network",
          }
        });
        if (error) throw error;
        // Update profile with extra fields
        if (data.user) {
          await supabase.from("profiles").update({
            username: authForm.username,
            twitter_handle: authForm.twitter || null,
            linkedin_url: authForm.linkedin || null,
            company: authForm.company || null,
          }).eq("id", data.user.id);
        }
        setSignupSuccess(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
        if (error) throw error;
        setAuthMode(null);
      }
    } catch (e) { setAuthError(e.message); }
    setAuthLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setUd({}); setStars(new Set()); setMyFeedback([]);
  };

  // ── CONNECTIONS CRUD ────────────────────────────────────────────────
  const saveConn = async (companyId, data) => {
    const next = { ...ud };
    if (data) {
      if (user) {
        try {
          if (next[companyId]?.id) {
            const { error } = await supabase.from("user_connections").update({ status: data.status, contact_name: data.contact_name, notes: data.notes, updated_at: new Date().toISOString() }).eq("id", next[companyId].id);
            if (error) throw error;
            next[companyId] = { ...next[companyId], ...data };
          } else {
            const { data: row, error } = await supabase.from("user_connections").insert({ user_id: user.id, company_id: companyId, status: data.status, contact_name: data.contact_name, notes: data.notes }).select().single();
            if (error) throw error;
            if (row) next[companyId] = { ...data, id: row.id };
          }
        } catch (e) {
          console.error("Supabase save failed, using local:", e.message);
          // Fallback to local state — connection still shows in UI
          next[companyId] = data;
        }
      } else {
        next[companyId] = data;
      }
    } else {
      if (user && next[companyId]?.id) {
        try {
          const { error } = await supabase.from("user_connections").delete().eq("id", next[companyId].id);
          if (error) throw error;
        } catch (e) { console.error("Delete failed:", e.message); }
      }
      delete next[companyId];
    }
    setUd(next);
    // Always persist to localStorage as backup
    try { localStorage.setItem("lai-connections-backup", JSON.stringify(next)); } catch {}
    setEditConn(null);
  };

  // ── STARS ───────────────────────────────────────────────────────────
  const toggleStar = async (entityType, entityId) => {
    const key = `${entityType}:${entityId}`;
    const next = new Set(stars);
    if (next.has(key)) {
      next.delete(key);
      if (user) await supabase.from("stars").delete().match({ user_id: user.id, entity_type: entityType, entity_id: entityId });
    } else {
      next.add(key);
      if (user) await supabase.from("stars").insert({ user_id: user.id, entity_type: entityType, entity_id: entityId });
    }
    setStars(next);
  };

  // ── FEEDBACK ────────────────────────────────────────────────────────
  const submitFeedback = async () => {
    const row = { category: fbForm.category, message: fbForm.message, user_id: user?.id || null, user_email: user ? profile?.email : null, user_name: user ? profile?.username : null };
    await supabase.from("feedback").insert(row);
    setFbSubmitted(true);
    if (user) {
      const { data: fb } = await supabase.from("feedback").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (fb) setMyFeedback(fb);
    }
    setTimeout(() => { setFbSubmitted(false); setShowFeedback(false); setFbForm({ category: "feature", message: "" }); }, 2000);
  };

  // ── SEARCH ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const q = search.toLowerCase();
    const companyMatches = companies.filter(c =>
      c.name.toLowerCase().includes(q) || (c.s || "").toLowerCase().includes(q) ||
      (c.focus || "").toLowerCase().includes(q) || (c.founders || "").toLowerCase().includes(q)
    ).slice(0, 8);
    const peopleMatches = Object.entries(PEOPLE).filter(([name, p]) =>
      name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
    ).slice(0, 5);
    // Search user's connections (contact names, notes)
    const connMatches = Object.entries(ud).filter(([id, d]) =>
      (d.contact_name || "").toLowerCase().includes(q) || (d.notes || "").toLowerCase().includes(q)
    ).map(([id, d]) => ({ ...d, company: companies.find(c => c.id === id) })).filter(m => m.company).slice(0, 5);
    setSearchResults({ companies: companyMatches, people: peopleMatches, connections: connMatches });
  }, [search, ud]);

  // ── MISC ────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    u(); window.addEventListener("resize", u); return () => window.removeEventListener("resize", u);
  }, []);

  const filt = useMemo(() => companies.filter(c => {
    if (!cats.has(c.cat)) return false;
    if (showMyNet && !ud[c.id]) return false;
    return true;
  }), [cats, showMyNet, ud]);

  const fEdges = useMemo(() => {
    const ids = new Set(filt.map(c => c.id));
    return edges.filter(e => ids.has(e.s) && ids.has(e.t));
  }, [filt]);

  const hovConn = useMemo(() => {
    if (!hov) return null;
    const c = new Set([hov]);
    edges.forEach(e => { if (e.s === hov) c.add(e.t); if (e.t === hov) c.add(e.s); });
    return c;
  }, [hov]);

  const score = useMemo(() => calcScore(ud), [ud]);
  const earnedBadges = useMemo(() => BADGES.filter(b => b.check(ud, companies)), [ud]);
  const tc = c => setCats(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const ce = sel ? edges.filter(e => e.s === sel.id || e.t === sel.id) : [];
  const selUD = sel ? ud[sel.id] : null;
  const relatedPeople = sel ? Object.entries(PEOPLE).filter(([n, p]) => p.co.includes(sel.id)) : [];
  const mn = Object.keys(ud).length;

  const filteredUpdates = useMemo(() => {
    let u = [...UPDATES];
    if (updateFilter !== "all") u = u.filter(x => x.type === updateFilter);
    return u.sort((a, b) => b.date.localeCompare(a.date));
  }, [updateFilter]);

  // ── D3 GRAPH ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || panel !== "graph") return;
    const svg = d3.select(svgRef.current); svg.selectAll("*").remove();
    const { w, h } = dim;
    const nodes = filt.map(c => ({ ...c, r: nr(c) }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = fEdges.filter(e => nodeMap.has(e.s) && nodeMap.has(e.t)).map(e => ({ ...e, source: e.s, target: e.t }));
    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.08, 6]).on("zoom", e => g.attr("transform", e.transform));
    svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.5).translate(-w / 2, -h / 2));
    const defs = svg.append("defs");
    const gl = defs.append("filter").attr("id", "gl").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    gl.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "b");
    const mg = gl.append("feMerge"); mg.append("feMergeNode").attr("in", "b"); mg.append("feMergeNode").attr("in", "SourceGraphic");

    const catCenters = {};
    if (layout === "cluster") {
      const cl = [...new Set(filt.map(c => c.cat))];
      const cols = Math.ceil(Math.sqrt(cl.length));
      cl.forEach((cat, i) => {
        catCenters[cat] = { x: w * 0.15 + i % cols * (w * 0.7 / (cols - 1 || 1)), y: h * 0.15 + Math.floor(i / cols) * (h * 0.7 / (Math.ceil(cl.length / cols) - 1 || 1)) };
      });
    }

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.ty === "alumni" ? 85 : d.ty === "investment" ? 130 : 105).strength(layout === "force" ? 0.2 : 0.04))
      .force("charge", d3.forceManyBody().strength(d => -d.r * (layout === "force" ? 18 : 10)))
      .force("center", layout === "force" ? d3.forceCenter(w / 2, h / 2).strength(0.04) : null)
      .force("collision", d3.forceCollide().radius(d => d.r + 4))
      .force("x", d3.forceX(d => layout === "cluster" && catCenters[d.cat] ? catCenters[d.cat].x : w / 2).strength(layout === "cluster" ? 0.3 : 0.015))
      .force("y", d3.forceY(d => layout === "cluster" && catCenters[d.cat] ? catCenters[d.cat].y : h / 2).strength(layout === "cluster" ? 0.3 : 0.015));

    if (layout === "cluster") Object.entries(catCenters).forEach(([cat, pos]) => {
      g.append("text").text(CC[cat]?.l || cat).attr("x", pos.x).attr("y", pos.y - 50)
        .attr("text-anchor", "middle").attr("fill", CC[cat]?.c || "#666").attr("font-size", "10px")
        .attr("font-family", "'Outfit',sans-serif").attr("font-weight", "600").attr("opacity", 0.4);
    });

    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", d => ECfg[d.ty]?.c || "#333").attr("stroke-width", d => d.ty === "alumni" ? 1.3 : 0.7)
      .attr("stroke-opacity", 0.16).attr("stroke-dasharray", d => ECfg[d.ty]?.d || null);

    const node = g.append("g").selectAll("g").data(nodes).enter().append("g").attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on("click", (e, d) => { e.stopPropagation(); setSel(p => p?.id === d.id ? null : companies.find(c => c.id === d.id)); setTab("info"); setPanel("graph"); })
      .on("mouseenter", (e, d) => setHov(d.id)).on("mouseleave", () => setHov(null));

    node.append("circle").attr("r", d => d.r + 2).attr("fill", "none")
      .attr("stroke", d => CC[d.cat]?.c || "#666").attr("stroke-width", 0.7).attr("stroke-opacity", 0.1).attr("filter", "url(#gl)");
    node.append("circle").attr("r", d => d.r)
      .attr("fill", d => (CC[d.cat]?.c || "#666") + "18").attr("stroke", d => CC[d.cat]?.c || "#666").attr("stroke-width", 1.2);
    node.filter(d => ud[d.id]).append("circle").attr("r", d => d.r + 4).attr("fill", "none")
      .attr("stroke", d => US[ud[d.id]?.status]?.c || "#30D158").attr("stroke-width", 1.8).attr("stroke-dasharray", "3,2").attr("stroke-opacity", 0.75);
    // Star indicator
    node.filter(d => stars.has(`company:${d.id}`)).append("text").text("⭐").attr("x", d => d.r - 2).attr("y", d => -d.r + 4).attr("font-size", "8px").attr("pointer-events", "none");
    node.append("text").text(d => CC[d.cat]?.i || "").attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => Math.max(d.r * 0.7, 9) + "px").attr("pointer-events", "none");
    node.append("text").text(d => { const n = d.s || d.name; return n.length > 16 ? n.slice(0, 14) + "…" : n; })
      .attr("text-anchor", "middle").attr("dy", d => d.r + 13).attr("fill", "#9a9590")
      .attr("font-size", d => d.r > 14 ? "12px" : "10px").attr("font-family", "'JetBrains Mono',monospace").attr("pointer-events", "none");

    svg.on("click", () => setSel(null));
    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    return () => sim.stop();
  }, [filt, fEdges, dim, layout, ud, panel, stars]);

  // Hover highlight
  useEffect(() => {
    if (!svgRef.current || panel !== "graph") return;
    const svg = d3.select(svgRef.current);
    if (!hov) { svg.selectAll("g>g>g").attr("opacity", 1); svg.selectAll("line").attr("stroke-opacity", 0.16); return; }
    svg.selectAll("g>g>g").each(function (d) { d3.select(this).attr("opacity", hovConn?.has(d?.id) ? 1 : 0.07); });
    svg.selectAll("line").each(function (d) {
      const si = typeof d?.source === "object" ? d.source.id : d?.source;
      const ti = typeof d?.target === "object" ? d.target.id : d?.target;
      const c = si === hov || ti === hov;
      d3.select(this).attr("stroke-opacity", c ? 0.6 : 0.02).attr("stroke-width", c ? 2.2 : 0.7);
    });
  }, [hov, hovConn, panel]);

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#141413", overflow: "hidden", fontFamily: "'Libre Baskerville',Georgia,serif", position: "relative", color: "#ede9e0" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#3a3835;border-radius:4px}input[type=range]{-webkit-appearance:none;background:transparent}input[type=range]::-webkit-slider-track{height:2px;background:#2a2826;border-radius:2px}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:8px;border-radius:50%;background:#FF2D55;margin-top:-3px;cursor:pointer}`}</style>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "10px 14px", background: "linear-gradient(180deg,rgba(20,20,19,0.97),rgba(20,20,19,0))", zIndex: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0, cursor: "pointer" }} onClick={() => { setPanel("graph"); setSel(null); }}>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: "'Outfit'',sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#C15F3C,#d97757,#e8a87c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>London AI Ecosystem</h1>
          <p style={{ margin: 0, fontSize: 10, color: "#5a564e" }}>
            {companies.filter(c => !["investor", "academic", "accelerator"].includes(c.cat)).length} companies · {edges.length} connections{mn > 0 ? ` · ${mn} tracked` : ""}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {/* Nav */}
        <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #2a2826" }}>
          {[["graph", "🌌 Map"], ["updates", "📡 Updates"], ["people", "👤 People"], ["score", "🏆 Score"]].map(([k, l]) => (
            <button key={k} onClick={() => { setPanel(k); if (k !== "graph") setSel(null); }} style={{ padding: "4px 9px", border: "none", background: panel === k ? "#2a2826" : "transparent", color: panel === k ? "#E2E8F0" : "#475569", fontSize: 10, fontFamily: "inherit", cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        {panel === "graph" && <>
          <div style={{ display: "flex", gap: 0, borderRadius: 5, overflow: "hidden", border: "1px solid #2a2826" }}>
            {[["force", "✦"], ["cluster", "⊞"]].map(([k, l]) => (
              <button key={k} onClick={() => setLayout(k)} style={{ padding: "4px 8px", border: "none", background: layout === k ? "#2a2826" : "transparent", color: layout === k ? "#E2E8F0" : "#475569", fontSize: 9, cursor: "pointer" }} title={k === "force" ? "Constellation" : "Cluster"}>{l}</button>
            ))}
          </div>
          <button onClick={() => setShowMyNet(!showMyNet)} style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${showMyNet ? "#30D158" : "#2a2826"}`, background: showMyNet ? "#30D15818" : "transparent", color: showMyNet ? "#30D158" : "#475569", fontSize: 8.5, cursor: "pointer", fontFamily: "inherit" }}>🤝</button>
        </>}
        {/* Search */}
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="Search companies, people, contacts…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #2a2826", background: "#1e1d1a", color: "#ede9e0", fontSize: 12, width: 240, outline: "none", fontFamily: "inherit" }} />
          {searchResults && search && <div style={{ position: "absolute", top: "100%", right: 0, width: 320, maxHeight: 400, overflowY: "auto", background: "#1e1d1a", borderRadius: 8, border: "1px solid #2a2826", marginTop: 4, zIndex: 30 }}>
            {searchResults.companies.length > 0 && <div style={{ padding: "6px 10px", borderBottom: "1px solid #1a1917" }}>
              <div style={{ fontSize: 8, color: "#5a564e", fontWeight: 600, marginBottom: 4 }}>COMPANIES</div>
              {searchResults.companies.map(c => (
                <div key={c.id} onClick={() => { setSel(c); setPanel("graph"); setTab("info"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 10 }}>{CC[c.cat]?.i}</span>
                  <span style={{ fontSize: 12, color: "#ede9e0" }}>{c.name}</span>
                  {ud[c.id] && <span style={{ fontSize: 7, color: US[ud[c.id].status]?.c }}>{US[ud[c.id].status]?.i}</span>}
                </div>
              ))}
            </div>}
            {searchResults.people.length > 0 && <div style={{ padding: "6px 10px", borderBottom: "1px solid #1a1917" }}>
              <div style={{ fontSize: 8, color: "#5a564e", fontWeight: 600, marginBottom: 4 }}>PEOPLE</div>
              {searchResults.people.map(([name, p]) => (
                <div key={name} onClick={() => { setPanel("people"); setSearch(""); setHighlightPerson(name); setTimeout(() => { const el = document.getElementById(`person-${name.replace(/\s+/g, "-")}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); setTimeout(() => setHighlightPerson(null), 3000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 10.5, color: "#ede9e0" }}>{name}</span>
                  <span style={{ fontSize: 8, color: "#7a756c" }}>{p.role}</span>
                </div>
              ))}
            </div>}
            {searchResults.connections.length > 0 && <div style={{ padding: "6px 10px" }}>
              <div style={{ fontSize: 8, color: "#30D158", fontWeight: 600, marginBottom: 4 }}>YOUR CONNECTIONS</div>
              {searchResults.connections.map((m, i) => (
                <div key={i} onClick={() => { setSel(m.company); setPanel("graph"); setTab("🤝"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 9 }}>{US[m.status]?.i}</span>
                  <span style={{ fontSize: 10.5, color: "#ede9e0" }}>{m.company.name}</span>
                  {m.contact_name && <span style={{ fontSize: 8, color: "#a09b90" }}>· {m.contact_name}</span>}
                </div>
              ))}
            </div>}
            {searchResults.companies.length === 0 && searchResults.people.length === 0 && searchResults.connections.length === 0 &&
              <div style={{ padding: 12, fontSize: 10, color: "#5a564e", textAlign: "center" }}>No results</div>}
          </div>}
        </div>
        {/* Feedback button */}
        <button onClick={() => setShowFeedback(true)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #2a2826", background: "transparent", color: "#5a564e", fontSize: 8.5, cursor: "pointer", fontFamily: "inherit" }}>💬</button>
        {/* Auth */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#a09b90" }}>{profile?.username || user.email}</span>
            {score.score > 0 && <span style={{ fontSize: 8, color: "#FFD700", cursor: "pointer" }} onClick={() => setPanel("score")}>{score.emoji} {score.score}</span>}
            <button onClick={signOut} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2a2826", background: "transparent", color: "#7a756c", fontSize: 8, cursor: "pointer" }}>Sign out</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setAuthMode("login")} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #2a2826", background: "transparent", color: "#a09b90", fontSize: 8.5, cursor: "pointer", fontFamily: "inherit" }}>Log in</button>
            <button onClick={() => setAuthMode("signup")} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 8.5, cursor: "pointer", fontFamily: "inherit" }}>Sign up</button>
          </div>
        )}
      </div>

      {/* ── AUTH MODAL ────────────────────────────────────────────── */}
      {authMode && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setAuthMode(null); setSignupSuccess(false); }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#1e1d1a", borderRadius: 14, padding: 24, border: "1px solid #2a2826", width: 360, maxWidth: "90vw" }}>
          {signupSuccess ? <>
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Inter',sans-serif", color: "#f5f0e8" }}>Check your email</h2>
              <p style={{ fontSize: 10.5, color: "#a09b90", lineHeight: 1.5, marginBottom: 12 }}>We've sent a confirmation link to <strong style={{ color: "#ede9e0" }}>{authForm.email}</strong>. Click the link in the email to activate your account.</p>
              <p style={{ fontSize: 9, color: "#5a564e" }}>Didn't receive it? Check your spam folder, or try again in a few minutes.</p>
              <button onClick={() => { setAuthMode(null); setSignupSuccess(false); }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 7, border: "1px solid #2a2826", background: "transparent", color: "#a09b90", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
          </> : <>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "'Inter',sans-serif", color: "#f5f0e8" }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h2>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#7a756c" }}>{authMode === "signup" ? "Join the London AI Ecosystem network" : "Sign in to track your connections"}</p>
          {authError && <div style={{ padding: "6px 10px", borderRadius: 6, background: "#FF453A18", border: "1px solid #FF453A33", color: "#FF453A", fontSize: 9.5, marginBottom: 10 }}>{authError}</div>}
          {authMode === "signup" && <input type="text" placeholder="Username *" value={authForm.username} onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} style={inputStyle} />}
          <input type="email" placeholder="Email *" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          <input type="password" placeholder="Password *" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} style={inputStyle} />
          {authMode === "signup" && <>
            <input type="text" placeholder="X / Twitter handle (optional)" value={authForm.twitter} onChange={e => setAuthForm(p => ({ ...p, twitter: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="LinkedIn URL (optional)" value={authForm.linkedin} onChange={e => setAuthForm(p => ({ ...p, linkedin: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="Company (optional)" value={authForm.company} onChange={e => setAuthForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
          </>}
          <button onClick={() => handleAuth(authMode)} disabled={authLoading} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "none", background: "#C15F3C", color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4, opacity: authLoading ? 0.6 : 1 }}>
            {authLoading ? "..." : authMode === "signup" ? "Create Account" : "Sign In"}
          </button>
          <p style={{ margin: "10px 0 0", fontSize: 9, color: "#7a756c", textAlign: "center" }}>
            {authMode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <span onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthError(""); setSignupSuccess(false); }} style={{ color: "#00D4FF", cursor: "pointer" }}>{authMode === "signup" ? "Log in" : "Sign up"}</span>
          </p>
          </>}
        </div>
      </div>}

      {/* ── FEEDBACK MODAL ────────────────────────────────────────── */}
      {showFeedback && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowFeedback(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#1e1d1a", borderRadius: 14, padding: 24, border: "1px solid #2a2826", width: 400, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "'Inter',sans-serif", color: "#f5f0e8" }}>💬 Feedback</h2>
          <p style={{ margin: "0 0 14px", fontSize: 9.5, color: "#7a756c" }}>Help us improve London AI Ecosystem</p>
          {fbSubmitted ? <div style={{ padding: 20, textAlign: "center" }}><span style={{ fontSize: 28 }}>✅</span><p style={{ color: "#30D158", marginTop: 8 }}>Thank you! Feedback submitted.</p></div> : <>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["feature", "bug", "data", "general"].map(c => (
                <button key={c} onClick={() => setFbForm(p => ({ ...p, category: c }))} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${fbForm.category === c ? "#30D158" : "#2a2826"}`, background: fbForm.category === c ? "#30D15818" : "transparent", color: fbForm.category === c ? "#30D158" : "#64748B", fontSize: 9, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>{c}</button>
              ))}
            </div>
            <textarea value={fbForm.message} onChange={e => setFbForm(p => ({ ...p, message: e.target.value }))} placeholder="What would you like to see improved?" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <button onClick={submitFeedback} disabled={!fbForm.message.trim()} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "none", background: "#C15F3C", color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: fbForm.message.trim() ? 1 : 0.4 }}>Submit Feedback</button>
          </>}
          {/* My feedback history */}
          {myFeedback.length > 0 && <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #2a2826" }}>
            <div style={{ fontSize: 9, color: "#7a756c", fontWeight: 600, marginBottom: 6 }}>YOUR FEEDBACK HISTORY</div>
            {myFeedback.map(fb => (
              <div key={fb.id} style={{ padding: "6px 0", borderBottom: "1px solid #1a1917" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: fb.status === "resolved" ? "#30D15818" : fb.status === "in_progress" ? "#FFD60A18" : "#2a2826", color: fb.status === "resolved" ? "#30D158" : fb.status === "in_progress" ? "#FFD60A" : "#64748B", textTransform: "uppercase" }}>{fb.status}</span>
                  <span style={{ fontSize: 8, color: "#5a564e" }}>{fb.category}</span>
                  <span style={{ fontSize: 7.5, color: "#3d3a34" }}>{new Date(fb.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 10, color: "#d4cfc4", marginTop: 2 }}>{fb.message}</div>
                {fb.admin_response && <div style={{ fontSize: 9.5, color: "#30D158", marginTop: 3, padding: "3px 6px", background: "#30D15810", borderRadius: 4 }}>↳ {fb.admin_response}</div>}
              </div>
            ))}
          </div>}
        </div>
      </div>}

      {/* ── LEFT SIDEBAR (graph) ──────────────────────────────────── */}
      {panel === "graph" && <div style={{ position: "absolute", top: 55, left: 6, zIndex: 10, background: "rgba(30,29,26,0.95)", borderRadius: 10, padding: "7px 7px 10px", backdropFilter: "blur(14px)", border: "1px solid #2a2826", maxHeight: "calc(100vh - 75px)", overflowY: "auto", width: 155 }}>
        <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
          {[["All", () => setCats(new Set(Object.keys(CC)))], ["None", () => setCats(new Set())], ["Cos", () => setCats(new Set(Object.keys(CC).filter(k => !["investor", "academic", "accelerator"].includes(k))))]].map(([l, fn]) => (
            <button key={l} onClick={fn} style={{ flex: 1, padding: "2px", borderRadius: 4, border: "1px solid #2a2826", background: "transparent", color: "#7a756c", fontSize: 7.5, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>
        {Object.entries(CC).map(([k, cfg]) => (
          <div key={k} onClick={() => tc(k)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 3px", borderRadius: 3, cursor: "pointer", opacity: cats.has(k) ? 1 : 0.22 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.c, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#d4cfc4", flex: 1 }}>{cfg.l}</span>
            <span style={{ fontSize: 7, color: "#5a564e" }}>{companies.filter(c => c.cat === k).length}</span>
          </div>
        ))}
      </div>}

      {/* ── GRAPH SVG ────────────────────────────────────────────── */}
      {panel === "graph" && <svg ref={svgRef} width={dim.w} height={dim.h} style={{ display: "block" }} />}

      {/* ── UPDATES PANEL ────────────────────────────────────────── */}
      {panel === "updates" && <div style={{ position: "absolute", top: 55, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: "0 20px 20px" }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 700, color: "#f5f0e8", margin: "10px 0 4px" }}>Ecosystem Updates</h2>
        <p style={{ fontSize: 11, color: "#5a564e", marginBottom: 10 }}>Funding, acquisitions, people moves, milestones, interviews</p>
        {/* Category tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          {Object.entries(UPDATE_TYPES).map(([k, cfg]) => (
            <button key={k} onClick={() => setUpdateFilter(k)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${updateFilter === k ? cfg.c : "#2a2826"}`, background: updateFilter === k ? cfg.c + "18" : "transparent", color: updateFilter === k ? cfg.c : "#64748B", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>{cfg.label}</button>
          ))}
        </div>
        {filteredUpdates.map((u, i) => {
          const co = companies.find(c => c.id === u.company);
          return (<div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #1a1917" }}>
            <div style={{ flexShrink: 0, width: 75 }}>
              <div style={{ fontSize: 9, color: "#5a564e" }}>{u.date}</div>
              <div style={{ fontSize: 8, color: UPDATE_TYPES[u.type]?.c || "#666", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>{u.type}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#ede9e0", lineHeight: 1.5 }}>{u.text}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                {co && <span onClick={() => { setSel(co); setPanel("graph"); setTab("info"); }} style={{ fontSize: 9, color: CC[co.cat]?.c || "#666", cursor: "pointer" }}>{CC[co.cat]?.i} {co.name} →</span>}
                {u.link && <a href={u.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 8.5, color: "#7a756c", textDecoration: "none" }}>📰 Source →</a>}
              </div>
            </div>
          </div>);
        })}
      </div>}

      {/* ── PEOPLE PANEL ─────────────────────────────────────────── */}
      {panel === "people" && <div style={{ position: "absolute", top: 55, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: "0 20px 20px" }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 700, color: "#f5f0e8", margin: "10px 0 4px" }}>Key People</h2>
        <p style={{ fontSize: 11, color: "#5a564e", marginBottom: 14 }}>Founders, CEOs, and leaders with interviews & social links</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 8 }}>
          {Object.entries(PEOPLE).map(([name, p]) => {
            const isStarred = stars.has(`person:${name}`);
            return (
              <div key={name} id={`person-${name.replace(/\s+/g, "-")}`} style={{ background: highlightPerson === name ? "#2d2218" : "#1e1d1a", borderRadius: 8, padding: "12px", border: `1px solid ${highlightPerson === name ? "#C15F3C" : "#2a2826"}`, transition: "all 0.5s ease", boxShadow: highlightPerson === name ? "0 0 0 3px rgba(193,95,60,0.2)" : "none" }}>
                <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "#f5f0e8", fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#7a756c", marginTop: 1 }}>{p.role}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span onClick={() => toggleStar("person", name)} style={{ cursor: "pointer" }}><StarIcon filled={isStarred} /></span>
                    {p.tw && <a href={p.tw} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 4, background: "#2a2a28", border: "1px solid #333" }} title="X"><XIcon size={12} /></a>}
                    {p.li && <a href={p.li} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 4, background: "#0A66C2" }} title="LinkedIn"><LIIcon size={12} /></a>}
                  </div>
                </div>
                {/* Companies */}
                <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                  {p.co.map(cid => { const co = companies.find(c => c.id === cid); return co ? <span key={cid} onClick={() => { setSel(co); setPanel("graph"); setTab("info"); }} style={{ fontSize: 8, color: CC[co.cat]?.c, cursor: "pointer", padding: "1px 5px", borderRadius: 3, background: (CC[co.cat]?.c || "#666") + "18" }}>{co.s || co.name}</span> : null; })}
                </div>
                {/* Podcasts — top 3 + more */}
                {p.pods && p.pods.length > 0 && <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #2a2826" }}>
                  <div style={{ fontSize: 9, color: "#5a564e", fontWeight: 600, marginBottom: 3 }}>INTERVIEWS & PODCASTS</div>
                  <PodcastList pods={p.pods} />
                </div>}
              </div>
            );
          })}
        </div>
      </div>}

      {/* ── SCORE PANEL ──────────────────────────────────────────── */}
      {panel === "score" && <div style={{ position: "absolute", top: 55, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: "0 20px 20px" }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 700, color: "#f5f0e8", margin: "10px 0 4px" }}>Network Score & Badges</h2>
        {!user && <div style={{ padding: "12px", borderRadius: 8, background: "#FF9F0A18", border: "1px solid #FF9F0A33", marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#FF9F0A" }}>⚠️ Sign up to save your score, appear on the leaderboard, and track connections across devices.</span>
          <button onClick={() => setAuthMode("signup")} style={{ marginLeft: 8, padding: "3px 8px", borderRadius: 4, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 9, cursor: "pointer" }}>Sign up</button>
        </div>}
        {/* Score card */}
        <div style={{ background: "linear-gradient(135deg,#2a2826,#ffffff)", borderRadius: 12, padding: "20px", border: "1px solid #3a3835", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>{score.emoji || "🔭"}</div>
          <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "'Inter',sans-serif", color: "#FFD700", marginTop: 4 }}>{score.score}</div>
          <div style={{ fontSize: 16, color: "#ede9e0", fontWeight: 600 }}>{score.level || "Explorer"}</div>
          {score.nextLevel && <>
            <div style={{ width: "100%", height: 4, background: "#2a2826", borderRadius: 2, marginTop: 10 }}>
              <div style={{ width: score.pct + "%", height: 4, background: "linear-gradient(90deg,#FF2D55,#FFD700)", borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 8.5, color: "#5a564e", marginTop: 4 }}>{score.pct}% to {score.nextLevel} ({score.nextMin} pts)</div>
          </>}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#ede9e0" }}>{mn}</div><div style={{ fontSize: 8, color: "#5a564e" }}>Tracked</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#ede9e0" }}>{score.breakdown.catCount || 0}</div><div style={{ fontSize: 8, color: "#5a564e" }}>Categories</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#ede9e0" }}>{score.breakdown.frontierCoverage || 0}/7</div><div style={{ fontSize: 8, color: "#5a564e" }}>Frontier</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#ede9e0" }}>{earnedBadges.length}/{BADGES.length}</div><div style={{ fontSize: 8, color: "#5a564e" }}>Badges</div></div>
          </div>
        </div>
        {/* Badges */}
        <div style={{ fontSize: 11, color: "#a09b90", fontWeight: 600, marginBottom: 8 }}>BADGES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6, marginBottom: 16 }}>
          {BADGES.map(b => {
            const earned = earnedBadges.find(e => e.id === b.id);
            return (<div key={b.id} style={{ background: earned ? "#2a2826" : "#141311", borderRadius: 8, padding: "10px", border: `1px solid ${earned ? "#3a3835" : "#1a1917"}`, opacity: earned ? 1 : 0.4, textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 10, color: "#ede9e0", fontWeight: 600, marginTop: 3 }}>{b.name}</div>
              <div style={{ fontSize: 8, color: "#5a564e", marginTop: 2 }}>{b.desc}</div>
              {earned && <div style={{ fontSize: 7.5, color: "#30D158", marginTop: 3 }}>✓ Earned</div>}
            </div>);
          })}
        </div>
      </div>}

      {/* ── DETAIL PANEL (graph) ──────────────────────────────────── */}
      {sel && panel === "graph" && <div style={{ position: "absolute", top: 55, right: 6, width: 320, maxHeight: "calc(100vh - 75px)", overflowY: "auto", background: "rgba(30,29,26,0.97)", borderRadius: 12, backdropFilter: "blur(16px)", border: "1px solid #2a2826", zIndex: 20 }}>
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #2a2826" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 8, color: CC[sel.cat]?.c, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{CC[sel.cat]?.i} {CC[sel.cat]?.l}</span>
              <h2 style={{ margin: "2px 0 0", fontSize: 18, fontFamily: "'Inter',sans-serif", fontWeight: 700, color: "#f5f0e8" }}>{sel.name}</h2>
              {sel.hq && <p style={{ margin: "1px 0 0", fontSize: 9, color: "#7a756c" }}>📍 {sel.hq}</p>}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "start" }}>
              <span onClick={() => toggleStar("company", sel.id)} style={{ cursor: "pointer" }}><StarIcon filled={stars.has(`company:${sel.id}`)} /></span>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#5a564e", fontSize: 15, cursor: "pointer" }}>✕</button>
            </div>
          </div>
          {selUD && <div style={{ marginTop: 6, padding: "4px 7px", borderRadius: 5, background: US[selUD.status]?.c + "18", border: `1px solid ${US[selUD.status]?.c}30`, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9 }}>{US[selUD.status]?.i}</span>
            <span style={{ fontSize: 9, color: US[selUD.status]?.c, fontWeight: 600 }}>{US[selUD.status]?.l}</span>
            {(selUD.contact_name || selUD.contact) && <span style={{ fontSize: 8, color: "#a09b90" }}>· {selUD.contact_name || selUD.contact}</span>}
          </div>}
          <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
            {["info", "people", "links", "🤝"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "4px 0", border: "none", borderBottom: tab === t ? `2px solid ${CC[sel.cat]?.c}` : "2px solid transparent", background: "none", color: tab === t ? "#F8FAFC" : "#475569", fontSize: 8.5, fontFamily: "inherit", cursor: "pointer", textTransform: "uppercase", fontWeight: 600 }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "10px 14px 14px" }}>
          {tab === "info" && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
              {sel.fund && <M l="Funding" v={sel.fund} />}{sel.val && <M l="Valuation" v={sel.val} />}{sel.emp && <M l="Team" v={sel.emp} />}{sel.yr && <M l="Founded" v={sel.yr} />}
            </div>
            {sel.focus && <S t="Focus" v={sel.focus} />}
            {sel.ethos && <S t="Ethos" v={sel.ethos} />}
            {sel.ms && <S t="Milestones" v={sel.ms} />}
            {sel.jobs && <a href={sel.jobs} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "#2a2826", color: "#ede9e0", fontSize: 9.5, textDecoration: "none", fontFamily: "inherit", border: "1px solid #3a3835", marginTop: 6 }}>🔗 Careers →</a>}
          </>}
          {tab === "people" && <>
            {sel.founders && <S t="Founders" v={sel.founders} />}
            {sel.kp && <S t="Key People" v={sel.kp} />}
            {relatedPeople.length > 0 && <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 8, color: "#7a756c", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Social Links</div>
              {relatedPeople.map(([name, p]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ fontSize: 10, color: "#d4cfc4", flex: 1 }}>{name}</span>
                  {p.tw && <a href={p.tw} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#2a2a28", border: "1px solid #333" }}><XIcon size={11} /></a>}
                  {p.li && <a href={p.li} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#0A66C2" }}><LIIcon size={11} /></a>}
                </div>
              ))}
              {/* Podcasts for this company's people */}
              {relatedPeople.some(([, p]) => p.pods?.length > 0) && <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 8, color: "#7a756c", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Interviews & Podcasts</div>
                {relatedPeople.map(([name, p]) => p.pods?.length > 0 ? (
                  <div key={name} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: "#a09b90", marginBottom: 2 }}>{name}</div>
                    <PodcastList pods={p.pods} compact />
                  </div>
                ) : null)}
              </div>}
            </div>}
          </>}
          {tab === "links" && <>
            {ce.length === 0 ? <p style={{ fontSize: 9, color: "#5a564e" }}>No connections.</p> :
              ce.map((e, i) => { const oid = e.s === sel.id ? e.t : e.s; const o = companies.find(c => c.id === oid); if (!o) return null; return (<div key={i} onClick={() => { setSel(o); setTab("info"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: "rgba(255,255,255,0.04)" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: ECfg[e.ty]?.c || "#444" }} /><span style={{ fontSize: 10, color: "#d4cfc4", flex: 1 }}>{o.name}</span>{e.l && <span style={{ fontSize: 7.5, color: "#5a564e" }}>{e.l}</span>}<span style={{ fontSize: 7, color: "#3d3a34", textTransform: "uppercase" }}>{e.ty}</span></div>); })}
          </>}
          {tab === "🤝" && <>
            <p style={{ fontSize: 9, color: "#7a756c", marginBottom: 8 }}>Your connection to {sel.s || sel.name}.</p>
            {!user && <div style={{ padding: "6px 8px", borderRadius: 5, background: "#FF9F0A18", border: "1px solid #FF9F0A33", marginBottom: 8, fontSize: 9, color: "#FF9F0A" }}>Sign up to save connections across devices. <span onClick={() => setAuthMode("signup")} style={{ textDecoration: "underline", cursor: "pointer" }}>Sign up</span></div>}
            {editConn === sel.id ? <>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: "#7a756c", marginBottom: 3 }}>STATUS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {Object.entries(US).map(([k, cfg]) => (
                    <button key={k} onClick={() => setCf(p => ({ ...p, status: k }))} style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${cf.status === k ? cfg.c : "#2a2826"}`, background: cf.status === k ? cfg.c + "20" : "transparent", color: cf.status === k ? cfg.c : "#64748B", fontSize: 8, cursor: "pointer", fontFamily: "inherit" }}>{cfg.i} {cfg.l}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={cf.contact_name || ""} onChange={e => setCf(p => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" style={{ ...inputStyle, marginBottom: 5 }} />
              <textarea value={cf.notes || ""} onChange={e => setCf(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => saveConn(sel.id, cf)} style={{ flex: 1, padding: "5px", borderRadius: 5, border: "none", background: "#C15F3C", color: "#000", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditConn(null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid #2a2826", background: "transparent", color: "#7a756c", fontSize: 9, cursor: "pointer" }}>Cancel</button>
                {selUD && <button onClick={() => saveConn(sel.id, null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid #FF453A33", background: "transparent", color: "#FF453A", fontSize: 9, cursor: "pointer" }}>Remove</button>}
              </div>
            </> : <>
              {selUD ? <div>
                <div style={{ padding: "8px", borderRadius: 6, background: "#1e1d1a", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 12 }}>{US[selUD.status]?.i}</span><span style={{ fontSize: 11, color: US[selUD.status]?.c, fontWeight: 600 }}>{US[selUD.status]?.l}</span></div>
                  {(selUD.contact_name || selUD.contact) && <div style={{ fontSize: 10, color: "#d4cfc4", marginTop: 3 }}>Contact: {selUD.contact_name || selUD.contact}</div>}
                  {selUD.notes && <div style={{ fontSize: 9.5, color: "#a09b90", marginTop: 3 }}>{selUD.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setCf({ status: selUD.status, contact_name: selUD.contact_name || selUD.contact || "", notes: selUD.notes || "" }); setEditConn(sel.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #2a2826", background: "transparent", color: "#a09b90", fontSize: 9, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => { setCf({ status: "target", contact_name: "", notes: "" }); setEditConn(sel.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #30D15850", background: "#30D15810", color: "#30D158", fontSize: 9, cursor: "pointer" }}>+ Add another</button>
                </div>
              </div> : <button onClick={() => { setCf({ status: "target", contact_name: "", notes: "" }); setEditConn(sel.id); }} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid #30D15850", background: "#30D15810", color: "#30D158", fontSize: 9.5, cursor: "pointer" }}>+ Add Connection</button>}
            </>}
          </>}
        </div>
      </div>}

      {/* ── BOTTOM HINTS ─────────────────────────────────────────── */}
      {panel === "graph" && !sel && <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(30,29,26,0.9)", borderRadius: 10, padding: "8px 16px", border: "1px solid #2a2826", zIndex: 10, backdropFilter: "blur(8px)", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#a09b90" }}>Lines show how companies are connected by way of people moves or investments</p>
        <p style={{ margin: "3px 0 0", fontSize: 10, color: "#5a564e" }}>Click → details · Hover → highlight network</p>
      </div>}
      {panel === "graph" && <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 5, zIndex: 10 }}>
        <SB l="Companies" v={filt.filter(c => !["investor", "academic", "accelerator"].includes(c.cat)).length} c="#C15F3C" />
        <SB l="Investors" v={filt.filter(c => c.cat === "investor").length} c="#FFD700" />
        {mn > 0 && <SB l="Tracked" v={mn} c="#30D158" />}
      </div>}
    </div>
  );
}

// ── SUBCOMPONENTS ───────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #2a2826", background: "#1a1917", color: "#ede9e0", fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none", marginBottom: 8, boxSizing: "border-box" };

function M({ l, v }) { return (<div style={{ background: "#1e1d1a", borderRadius: 5, padding: "5px 7px" }}><div style={{ fontSize: 7, color: "#5a564e", textTransform: "uppercase", letterSpacing: 0.3 }}>{l}</div><div style={{ fontSize: 12, color: "#ede9e0", fontWeight: 500 }}>{String(v)}</div></div>); }
function S({ t, v }) { return (<div style={{ marginBottom: 8 }}><div style={{ fontSize: 8, color: "#7a756c", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 11.5, color: "#d4cfc4", lineHeight: 1.5 }}>{v}</div></div>); }
function SB({ l, v, c }) { return (<div style={{ background: "rgba(30,29,26,0.9)", borderRadius: 6, padding: "3px 8px", border: "1px solid #2a2826", textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: "'Inter',sans-serif" }}>{v}</div><div style={{ fontSize: 7, color: "#5a564e", textTransform: "uppercase" }}>{l}</div></div>); }

function PodcastList({ pods, compact }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? pods : pods.slice(0, 3);
  return (<div>
    {visible.map((pod, i) => (
      <a key={i} href={pod.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: compact ? 9 : 9.5, color: "#a09b90", textDecoration: "none", padding: "2px 0", lineHeight: 1.4 }}>
        <span style={{ color: "#7a756c" }}>🎙️</span> <span style={{ color: "#d4cfc4" }}>{pod.label}</span>
      </a>
    ))}
    {pods.length > 3 && !showAll && <span onClick={() => setShowAll(true)} style={{ fontSize: 8.5, color: "#00D4FF", cursor: "pointer", display: "inline-block", marginTop: 2 }}>+ {pods.length - 3} more</span>}
    {showAll && pods.length > 3 && <span onClick={() => setShowAll(false)} style={{ fontSize: 8.5, color: "#5a564e", cursor: "pointer", display: "inline-block", marginTop: 2 }}>show less</span>}
  </div>);
}
