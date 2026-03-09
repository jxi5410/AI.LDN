import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { supabase } from "./supabase";
import { CC, ECfg, US, BADGES, PEOPLE, UPDATES, companies, edges } from "./data";
import InsightsPanel from "./InsightsPanel";
import LondonMap from "./LondonMap";

/* ═══════════════════════════════════════════════════════════════════════
   LONDON AI ECOSYSTEM — AI.LDN
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

function nr(c, view) {
  if (view === "investors") {
    if (c.cat === "investor") return 32; // investors are the stars
    // Non-investors are smaller satellites
    const f = c.fn || 0;
    if (f >= 1000) return 14; if (f >= 500) return 12; if (f >= 200) return 10; if (f >= 50) return 8; return 6;
  }
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

const ADMIN_UID = "6d8a370c-854a-4672-856f-f68050ca907a";

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
  const isMobile = dim.w < 768;
  const [tab, setTab] = useState("info");
  const layout = "force";
  const [panel, setPanel] = useState("graph");
  const [highlightPerson, setHighlightPerson] = useState(null);
  const [openCats, setOpenCats] = useState(new Set());
  const [allPeopleOpen, setAllPeopleOpen] = useState(false);
  const [showMyNet, setShowMyNet] = useState(false);
  const [updateFilter, setUpdateFilter] = useState("all");
  const [mapView, setMapView] = useState("companies"); // "companies" | "investors"

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

  // Events (from Supabase API)
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsFetched, setEventsFetched] = useState(false);

  // Bits (curated content)
  const [bits, setBits] = useState([]);
  const [bitsLoading, setBitsLoading] = useState(false);
  const [bitsFetched, setBitsFetched] = useState(false);
  const [bitsFilter, setBitsFilter] = useState("all");

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
        // Update profile with extra fields + create member directory entry
        if (data.user) {
          await supabase.from("profiles").update({
            username: authForm.username,
            twitter_handle: authForm.twitter || null,
            linkedin_url: authForm.linkedin || null,
            company: authForm.company || null,
          }).eq("id", data.user.id);
          // Create member profile for the community directory
          await supabase.from("members").upsert({
            user_id: data.user.id,
            display_name: authForm.username || authForm.email.split("@")[0],
            company: authForm.company || null,
            twitter: authForm.twitter ? `https://x.com/${authForm.twitter.replace("@","")}` : null,
            linkedin: authForm.linkedin || null,
            visible: true,
          }, { onConflict: "user_id" });
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

  // Fetch events from Supabase API
  useEffect(() => {
    if (panel !== "events" || eventsFetched) return;
    setEventsLoading(true);
    fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api?resource=events")
      .then(r => r.json())
      .then(d => { setEvents(d.data || []); setEventsFetched(true); setEventsLoading(false); })
      .catch(() => { setEventsFetched(true); setEventsLoading(false); });
  }, [panel, eventsFetched]);

  // Fetch bits (admin sees pending + approved; public sees approved only)
  useEffect(() => {
    if (panel !== "bits" || bitsFetched) return;
    setBitsLoading(true);
    const isAdmin = user?.id === ADMIN_UID;
    const url = isAdmin
      ? "https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=pending"
      : "https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits";
    // Admin: fetch both pending and approved
    if (isAdmin) {
      Promise.all([
        fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=pending").then(r => r.json()),
        fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits").then(r => r.json()),
      ]).then(([pending, approved]) => {
        const pendingBits = (pending.data || []).map(b => ({ ...b, _pending: true }));
        const approvedBits = (approved.data || []).map(b => ({ ...b, _pending: false }));
        setBits([...pendingBits, ...approvedBits]);
        setBitsFetched(true); setBitsLoading(false);
      }).catch(() => { setBitsFetched(true); setBitsLoading(false); });
    } else {
      fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits")
        .then(r => r.json())
        .then(d => { setBits((d.data || []).map(b => ({ ...b, _pending: false }))); setBitsFetched(true); setBitsLoading(false); })
        .catch(() => { setBitsFetched(true); setBitsLoading(false); });
    }
  }, [panel, bitsFetched, user]);

  const filt = useMemo(() => {
    if (mapView === "investors") {
      // Show all investors + companies connected via investment edges
      const investorIds = new Set(companies.filter(c => c.cat === "investor").map(c => c.id));
      const connectedIds = new Set();
      edges.forEach(e => {
        if (e.ty === "investment") {
          if (investorIds.has(e.s)) connectedIds.add(e.t);
          if (investorIds.has(e.t)) connectedIds.add(e.s);
        }
      });
      return companies.filter(c => {
        if (!cats.has(c.cat)) return false;
        if (showMyNet && !ud[c.id]) return false;
        return investorIds.has(c.id) || connectedIds.has(c.id);
      });
    }
    return companies.filter(c => {
      if (!cats.has(c.cat)) return false;
      if (showMyNet && !ud[c.id]) return false;
      return true;
    });
  }, [cats, showMyNet, ud, mapView]);

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

  const selConn = useMemo(() => {
    if (!sel) return null;
    const c = new Set([sel.id]);
    edges.forEach(e => { if (e.s === sel.id) c.add(e.t); if (e.t === sel.id) c.add(e.s); });
    return c;
  }, [sel]);

  const score = useMemo(() => calcScore(ud), [ud]);
  const earnedBadges = useMemo(() => BADGES.filter(b => b.check(ud, companies)), [ud]);
  const tc = c => setCats(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const ce = sel ? edges.filter(e => e.s === sel.id || e.t === sel.id) : [];
  const selUD = sel ? ud[sel.id] : null;
  const relatedPeople = sel ? Object.entries(PEOPLE).filter(([n, p]) => p.co.includes(sel.id)) : [];
  const mn = Object.keys(ud).length;

  const filteredUpdates = useMemo(() => {
    let u = UPDATES;
    if (updateFilter !== "all") u = u.filter(x => x.type === updateFilter);
    return u.sort((a, b) => b.date.localeCompare(a.date));
  }, [updateFilter]);

  // ── D3 GRAPH ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || panel !== "graph") return;
    const svg = d3.select(svgRef.current); svg.selectAll("*").remove();
    const { w, h } = dim;
    const nodes = filt.map(c => ({ ...c, r: nr(c, mapView) }));
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

    const isInvView = mapView === "investors";
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => isInvView && d.ty === "investment" ? 160 : (d.ty === "alumni" ? 85 : d.ty === "investment" ? 130 : 105)).strength(0.2))
      .force("charge", d3.forceManyBody().strength(d => isInvView && d.cat === "investor" ? -d.r * 30 : -d.r * 18))
      .force("center", d3.forceCenter(w / 2, h / 2).strength(0.04))
      .force("collision", d3.forceCollide().radius(d => d.r + (isInvView && d.cat === "investor" ? 12 : 4)))
      .force("x", d3.forceX(w / 2).strength(0.015))
      .force("y", d3.forceY(h / 2).strength(0.015));

    if (layout === "cluster") Object.entries(catCenters).forEach(([cat, pos]) => {
      g.append("text").text(CC[cat]?.l || cat).attr("x", pos.x).attr("y", pos.y - 50)
        .attr("text-anchor", "middle").attr("fill", CC[cat]?.c || "#666").attr("font-size", "10px")
        .attr("font-family", "'Outfit',sans-serif").attr("font-weight", "600").attr("opacity", 0.4);
    });

    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", d => ECfg[d.ty]?.c || "#333").attr("stroke-width", d => d.ty === "alumni" ? 1.3 : 0.7)
      .attr("stroke-opacity", 0.16).attr("stroke-dasharray", d => ECfg[d.ty]?.d || null);

    const node = g.append("g").selectAll("g").data(nodes).enter().append("g").attr("class", "node-g").attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on("click", (e, d) => { e.stopPropagation(); setSel(p => p?.id === d.id ? null : companies.find(c => c.id === d.id)); setTab("info"); setPanel("graph"); })
      .on("mouseenter", (e, d) => setHov(d.id)).on("mouseleave", () => setHov(null));

    node.append("circle").attr("r", d => d.r + 2).attr("fill", "none")
      .attr("stroke", d => CC[d.cat]?.c || "#666").attr("stroke-width", d => isInvView && d.cat === "investor" ? 2 : 0.7).attr("stroke-opacity", d => isInvView && d.cat === "investor" ? 0.4 : 0.1).attr("filter", "url(#gl)");
    node.append("circle").attr("r", d => d.r)
      .attr("fill", d => isInvView && d.cat === "investor" ? (CC[d.cat]?.c || "#666") + "60" : (CC[d.cat]?.c || "#666") + "18")
      .attr("stroke", d => CC[d.cat]?.c || "#666")
      .attr("stroke-width", d => isInvView && d.cat === "investor" ? 2.5 : 1.2);
    node.filter(d => ud[d.id]).append("circle").attr("r", d => d.r + 4).attr("fill", "none")
      .attr("stroke", d => US[ud[d.id]?.status]?.c || "#30D158").attr("stroke-width", 1.8).attr("stroke-dasharray", "3,2").attr("stroke-opacity", 0.75);
    // Star indicator
    node.filter(d => stars.has(`company:${d.id}`)).append("text").text("⭐").attr("x", d => d.r - 2).attr("y", d => -d.r + 4).attr("font-size", "8px").attr("pointer-events", "none");
    node.append("text").text(d => CC[d.cat]?.i || "").attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => Math.max(d.r * 0.7, 9) + "px").attr("pointer-events", "none");
    node.append("text").text(d => { const n = d.s || d.name; return n.length > 16 ? n.slice(0, 14) + "…" : n; })
      .attr("text-anchor", "middle").attr("dy", d => d.r + 13)
      .attr("fill", d => isInvView && d.cat === "investor" ? "#1a1a18" : "#6b6b66")
      .attr("font-size", d => isInvView && d.cat === "investor" ? "14px" : (d.r > 14 ? "12px" : "10px"))
      .attr("font-weight", d => isInvView && d.cat === "investor" ? "700" : "400")
      .attr("font-family", "'JetBrains Mono',monospace").attr("pointer-events", "none");

    svg.on("click", () => setSel(null));
    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    return () => sim.stop();
  }, [filt, fEdges, dim, layout, ud, panel, stars, mapView]);

  // Hover + selection highlight
  useEffect(() => {
    if (!svgRef.current || panel !== "graph") return;
    const svg = d3.select(svgRef.current);
    let activeId = null;
    let connSet = null;
    if (hov) {
      activeId = hov;
      connSet = hovConn;
    } else if (sel) {
      activeId = sel.id;
      connSet = selConn;
    }
    if (!activeId || !connSet) {
      svg.selectAll(".node-g").attr("opacity", 1);
      svg.selectAll("line").attr("stroke-opacity", 0.16).attr("stroke-width", 0.7);
      return;
    }
    svg.selectAll(".node-g").each(function (d) {
      d3.select(this).attr("opacity", connSet.has(d?.id) ? 1 : 0.07);
    });
    svg.selectAll("line").each(function (d) {
      const si = typeof d?.source === "object" ? d.source.id : d?.source;
      const ti = typeof d?.target === "object" ? d.target.id : d?.target;
      const c = si === activeId || ti === activeId;
      d3.select(this).attr("stroke-opacity", c ? 0.6 : 0.02).attr("stroke-width", c ? 2.2 : 0.7);
    });
  }, [hov, hovConn, sel, selConn, panel]);

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100vh", background: "#faf9f5", overflow: "hidden", fontFamily: "'Libre Baskerville',Georgia,serif", position: "relative", color: "#2d2d2a" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c5c3ba;border-radius:4px}input[type=range]{-webkit-appearance:none;background:transparent}input[type=range]::-webkit-slider-track{height:2px;background:#e8e5dc;border-radius:2px}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:8px;border-radius:50%;background:#FF2D55;margin-top:-3px;cursor:pointer}`}</style>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: isMobile ? "6px 8px" : "10px 14px", background: "#faf9f5", borderBottom: "1px solid #e8e5dc", zIndex: 1000, display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0, cursor: "pointer" }} onClick={() => { setPanel("graph"); setSel(null); }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 30, fontFamily: "'Inter',sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#C15F3C,#d97757,#e8a87c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LDN/ai</h1>
          {!isMobile && <p style={{ margin: 0, fontSize: 13, color: "#a0a09b" }}>
            {companies.filter(c => !["investor", "academic", "accelerator"].includes(c.cat)).length} companies · {edges.length} connections{mn > 0 ? ` · ${mn} tracked` : ""}
          </p>}
        </div>
        <div style={{ flex: 1 }} />
        {/* Nav */}
        <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #e8e5dc" }}>
          {[["graph", "🌌 Map"], ["insights", "📊 Insights"], ["updates", "📰 News"], ["people", "👤 People"], ["events", "📅 Events"], ...(user?.id === ADMIN_UID ? [["bits", "⚡ Bits"]] : [])].map(([k, l]) => (
            <button key={k} onClick={() => { setPanel(k); if (k !== "graph") setSel(null); }} style={{ padding: "6px 12px", border: "none", height: 36, lineHeight: "24px", background: panel === k ? "#e8e5dc" : "transparent", color: panel === k ? "#1a1a18" : "#8a8a85", fontSize: isMobile ? 11 : 14, fontFamily: "inherit", cursor: "pointer", fontWeight: panel === k ? 600 : 400 }}>{l}</button>
          ))}
        </div>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="Search companies, people, contacts…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, height: 36, boxSizing: "border-box", border: "1px solid #e8e5dc", background: "#ffffff", color: "#2d2d2a", fontSize: isMobile ? 13 : 16, width: isMobile ? 150 : 260, outline: "none", fontFamily: "inherit" }} />
          {searchResults && search && <div style={{ position: isMobile ? "fixed" : "absolute", top: isMobile ? 56 : "100%", left: isMobile ? 8 : "auto", right: isMobile ? 8 : 0, width: isMobile ? "auto" : 320, maxHeight: isMobile ? "60vh" : 400, overflowY: "auto", background: "#ffffff", borderRadius: 8, border: "1px solid #e8e5dc", marginTop: isMobile ? 0 : 4, zIndex: 1100, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
            {searchResults.companies.length > 0 && <div style={{ padding: "6px 10px", borderBottom: "1px solid #f5f3ee" }}>
              <div style={{ fontSize: 8, color: "#a0a09b", fontWeight: 600, marginBottom: 4 }}>COMPANIES</div>
              {searchResults.companies.map(c => (
                <div key={c.id} onClick={() => { setSel(c); setPanel("graph"); setTab("info"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 10 }}>{CC[c.cat]?.i}</span>
                  <span style={{ fontSize: 12, color: "#2d2d2a" }}>{c.name}</span>
                  {ud[c.id] && <span style={{ fontSize: 7, color: US[ud[c.id].status]?.c }}>{US[ud[c.id].status]?.i}</span>}
                </div>
              ))}
            </div>}
            {searchResults.people.length > 0 && <div style={{ padding: "6px 10px", borderBottom: "1px solid #f5f3ee" }}>
              <div style={{ fontSize: 8, color: "#a0a09b", fontWeight: 600, marginBottom: 4 }}>PEOPLE</div>
              {searchResults.people.map(([name, p]) => (
                <div key={name} onClick={() => { setPanel("people"); setSearch(""); setHighlightPerson(name); setTimeout(() => { const el = document.getElementById(`person-${name.replace(/\s+/g, "-")}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); setTimeout(() => setHighlightPerson(null), 3000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 10.5, color: "#2d2d2a" }}>{name}</span>
                  <span style={{ fontSize: 8, color: "#8a8a85" }}>{p.role}</span>
                </div>
              ))}
            </div>}
            {searchResults.connections.length > 0 && <div style={{ padding: "6px 10px" }}>
              <div style={{ fontSize: 8, color: "#30D158", fontWeight: 600, marginBottom: 4 }}>YOUR CONNECTIONS</div>
              {searchResults.connections.map((m, i) => (
                <div key={i} onClick={() => { setSel(m.company); setPanel("graph"); setTab("🤝"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 9 }}>{US[m.status]?.i}</span>
                  <span style={{ fontSize: 10.5, color: "#2d2d2a" }}>{m.company.name}</span>
                  {m.contact_name && <span style={{ fontSize: 8, color: "#6b6b66" }}>· {m.contact_name}</span>}
                </div>
              ))}
            </div>}
            {searchResults.companies.length === 0 && searchResults.people.length === 0 && searchResults.connections.length === 0 &&
              <div style={{ padding: 12, fontSize: 13, color: "#a0a09b", textAlign: "center" }}>No results</div>}
          </div>}
        </div>
        
        <button onClick={() => setShowFeedback(true)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e5dc", background: "transparent", color: "#a0a09b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", height: 36 }}>💬</button>
        {/* Trophy — always visible */}
        <button onClick={() => setPanel("score")} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e5dc", background: panel === "score" ? "#FFD70018" : "transparent", color: "#FFD700", fontSize: 14, height: 36, cursor: "pointer", fontFamily: "inherit" }}>🏆{score.score > 0 ? ` ${score.score}` : ""}</button>
        {/* My Network toggle — next to trophy */}
        {panel === "graph" && !isMobile &&
          <button onClick={() => setShowMyNet(!showMyNet)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${showMyNet ? "#30D158" : "#e8e5dc"}`, background: showMyNet ? "#30D15818" : "transparent", color: showMyNet ? "#30D158" : "#a0a09b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", height: 36 }}>🤝</button>
        }
        {/* Auth */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e5dc", background: "transparent", fontSize: 12, color: "#6b6b66", fontFamily: "inherit", height: 36, boxSizing: "border-box", display: "flex", alignItems: "center" }}>👤 {profile?.username || user.email}</div>
            <button onClick={signOut} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e5dc", background: "transparent", color: "#8a8a85", fontSize: 12, cursor: "pointer", fontFamily: "inherit", height: 36 }}>Sign out</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setAuthMode("login")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e8e5dc", background: "transparent", color: "#6b6b66", fontSize: 12, cursor: "pointer", fontFamily: "inherit", height: 36 }}>Log in</button>
            <button onClick={() => setAuthMode("signup")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 12, cursor: "pointer", fontFamily: "inherit", height: 36 }}>Sign up</button>
          </div>
        )}
      </div>

      {/* ── AUTH MODAL ────────────────────────────────────────────── */}
      {authMode && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setAuthMode(null); setSignupSuccess(false); }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: 14, padding: 24, border: "1px solid #e8e5dc", width: 360, maxWidth: "90vw" }}>
          {signupSuccess ? <>
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Inter',sans-serif", color: "#1a1a18" }}>Check your email</h2>
              <p style={{ fontSize: 10.5, color: "#6b6b66", lineHeight: 1.5, marginBottom: 12 }}>We've sent a confirmation link to <strong style={{ color: "#2d2d2a" }}>{authForm.email}</strong>. Click the link in the email to activate your account.</p>
              <p style={{ fontSize: 12, color: "#a0a09b" }}>Didn't receive it? Check your spam folder, or try again in a few minutes.</p>
              <button onClick={() => { setAuthMode(null); setSignupSuccess(false); }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 7, border: "1px solid #e8e5dc", background: "transparent", color: "#6b6b66", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
          </> : <>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "'Inter',sans-serif", color: "#1a1a18" }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#8a8a85" }}>{authMode === "signup" ? "Join the LDN/ai network" : "Sign in to track your connections"}</p>
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
          <p style={{ margin: "10px 0 0", fontSize: 9, color: "#8a8a85", textAlign: "center" }}>
            {authMode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <span onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthError(""); setSignupSuccess(false); }} style={{ color: "#00D4FF", cursor: "pointer" }}>{authMode === "signup" ? "Log in" : "Sign up"}</span>
          </p>
          </>}
        </div>
      </div>}

      {/* ── FEEDBACK MODAL ────────────────────────────────────────── */}
      {showFeedback && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowFeedback(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: 14, padding: 24, border: "1px solid #e8e5dc", width: 400, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "'Inter',sans-serif", color: "#1a1a18" }}>💬 Feedback</h2>
          <p style={{ margin: "0 0 14px", fontSize: 9.5, color: "#8a8a85" }}>Help us improve LDN/ai</p>
          {fbSubmitted ? <div style={{ padding: 20, textAlign: "center" }}><span style={{ fontSize: 28 }}>✅</span><p style={{ color: "#30D158", marginTop: 8 }}>Thank you! Feedback submitted.</p></div> : <>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["feature", "bug", "data", "general"].map(c => (
                <button key={c} onClick={() => setFbForm(p => ({ ...p, category: c }))} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${fbForm.category === c ? "#30D158" : "#e8e5dc"}`, background: fbForm.category === c ? "#30D15818" : "transparent", color: fbForm.category === c ? "#30D158" : "#64748B", fontSize: 9, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>{c}</button>
              ))}
            </div>
            <textarea value={fbForm.message} onChange={e => setFbForm(p => ({ ...p, message: e.target.value }))} placeholder="What would you like to see improved?" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <button onClick={submitFeedback} disabled={!fbForm.message.trim()} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "none", background: "#C15F3C", color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: fbForm.message.trim() ? 1 : 0.4 }}>Submit Feedback</button>
          </>}
          {/* My feedback history */}
          {myFeedback.length > 0 && <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e8e5dc" }}>
            <div style={{ fontSize: 9, color: "#8a8a85", fontWeight: 600, marginBottom: 6 }}>YOUR FEEDBACK HISTORY</div>
            {myFeedback.map(fb => (
              <div key={fb.id} style={{ padding: "6px 0", borderBottom: "1px solid #f5f3ee" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: fb.status === "resolved" ? "#30D15818" : fb.status === "in_progress" ? "#FFD60A18" : "#e8e5dc", color: fb.status === "resolved" ? "#30D158" : fb.status === "in_progress" ? "#FFD60A" : "#64748B", textTransform: "uppercase" }}>{fb.status}</span>
                  <span style={{ fontSize: 8, color: "#a0a09b" }}>{fb.category}</span>
                  <span style={{ fontSize: 7.5, color: "#c5c3ba" }}>{new Date(fb.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 10, color: "#4a4a45", marginTop: 2 }}>{fb.message}</div>
                {fb.admin_response && <div style={{ fontSize: 9.5, color: "#30D158", marginTop: 3, padding: "3px 6px", background: "#30D15810", borderRadius: 4 }}>↳ {fb.admin_response}</div>}
              </div>
            ))}
          </div>}
        </div>
      </div>}

      {/* ── LEFT SIDEBAR (graph) ──────────────────────────────────── */}
      {panel === "graph" && !isMobile && <div style={{ position: "absolute", top: 80, left: 6, zIndex: 20000, background: "rgba(255,255,255,0.97)", borderRadius: 10, padding: "7px 7px 10px", backdropFilter: "blur(14px)", border: "1px solid #e8e5dc", maxHeight: "calc(100vh - 85px)", overflowY: "auto", width: 180 }}>
        {/* View toggle */}
        <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
          {[["companies", "Companies"], ["investors", "Investors"]].map(([k, l]) => (
            <button key={k} onClick={() => setMapView(k)} style={{ flex: 1, padding: "3px", borderRadius: 4, border: `1px solid ${mapView === k ? "#C15F3C" : "#e8e5dc"}`, background: mapView === k ? "#C15F3C18" : "transparent", color: mapView === k ? "#C15F3C" : "#8a8a85", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: mapView === k ? 600 : 400 }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
          {[["All", () => setCats(new Set(Object.keys(CC)))], ["None", () => setCats(new Set())], ["Cos", () => setCats(new Set(Object.keys(CC).filter(k => !["investor", "academic", "accelerator"].includes(k))))]].map(([l, fn]) => (
            <button key={l} onClick={fn} style={{ flex: 1, padding: "2px", borderRadius: 4, border: "1px solid #e8e5dc", background: "transparent", color: "#8a8a85", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>
        {Object.entries(CC).map(([k, cfg]) => (
          <div key={k} onClick={() => tc(k)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 4px", borderRadius: 4, cursor: "pointer", opacity: cats.has(k) ? 1 : 0.3 }}>
            <span style={{ fontSize: 15, width: 16, textAlign: "center", color: cats.has(k) ? "#30D158" : "#ccc" }}>{cats.has(k) ? "✓" : ""}</span>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.c, flexShrink: 0 }} />
            <span style={{ fontSize: 15, color: "#4a4a45", flex: 1 }}>{cfg.l}</span>
            <span style={{ fontSize: 15, color: "#a0a09b" }}>{companies.filter(c => c.cat === k).length}</span>
          </div>
        ))}
      </div>}

      {/* ── LONDON MAP ────────────────────────────────────────────── */}
      {panel === "graph" && <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, zIndex: 5 }}><LondonMap companies={filt} edges={fEdges} onSelect={(c) => { setSel(c); setTab("info"); }} selected={sel} userConnections={ud} isMobile={isMobile} mapView={mapView} /></div>}

      {/* ── UPDATES PANEL ────────────────────────────────────────── */}
      {/* ── INSIGHTS PANEL ────────────────────────────────────────── */}
      {panel === "insights" && <InsightsPanel isMobile={isMobile} />}

      {/* ── NEWS ──────────────────────────────────────────────────── */}
      {panel === "updates" && <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, overflowY: "auto", background: "#faf9f5" }}>
        <div style={{ padding: isMobile ? "0 12px" : "0 20px" }}>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 700, color: "#1a1a18", margin: "16px 0 6px" }}>News</h2>
          <p style={{ fontSize: 11, color: "#a0a09b", marginBottom: 10 }}>Funding, acquisitions, people moves, milestones, interviews</p>
          <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
            {Object.entries(UPDATE_TYPES).map(([k, cfg]) => (
              <button key={k} onClick={() => setUpdateFilter(k)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${updateFilter === k ? cfg.c : "#e8e5dc"}`, background: updateFilter === k ? cfg.c + "18" : "transparent", color: updateFilter === k ? cfg.c : "#8a8a85", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: updateFilter === k ? 600 : 400 }}>{cfg.label}</button>
            ))}
          </div>
        </div>
        {isMobile ? (
          /* ── MOBILE: vertical arrow timeline ── */
          <div style={{ position: "relative", padding: "0 12px 40px 40px" }}>
            <div style={{ position: "absolute", left: 23, top: 0, bottom: 20, width: 2, background: "linear-gradient(to bottom, #C15F3C, #e8e5dc)" }} />
            <div style={{ position: "absolute", left: 18, bottom: 10, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "10px solid #e8e5dc" }} />
            {filteredUpdates.map((u, i) => {
              const co = companies.find(c => c.id === u.company);
              const tc = UPDATE_TYPES[u.type] || { c: "#94A3B8", label: u.type };
              const dateObj = new Date(u.date);
              return (
                <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                  <div style={{ position: "absolute", left: -23, top: 14, width: 12, height: 12, borderRadius: "50%", background: tc.c, border: "3px solid #faf9f5", boxShadow: `0 0 0 2px ${tc.c}50`, zIndex: 2 }} />
                  <div style={{ position: "absolute", left: -11, top: 19, width: 11, height: 2, background: tc.c + "60" }} />
                  <div style={{ background: "#ffffff", borderRadius: 10, border: `1px solid ${tc.c}30`, borderLeft: `3px solid ${tc.c}`, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: tc.c, fontWeight: 600, textTransform: "uppercase" }}>{tc.label}</span>
                      <span style={{ fontSize: 10, color: "#a0a09b" }}>{dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#2d2d2a", lineHeight: 1.5, marginBottom: 6 }}>{u.text}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {co && <span onClick={() => { setSel(co); setPanel("graph"); setTab("info"); }} style={{ fontSize: 11, color: CC[co.cat]?.c || "#666", cursor: "pointer" }}>{CC[co.cat]?.i} {co.name} →</span>}
                      {u.link && <a href={u.link} target="_blank" rel="noopener" style={{ fontSize: 10, color: "#a0a09b", textDecoration: "none" }}>Source →</a>}
                      {u.type === "interview" && u.link && <UpdateSummariseBtn url={u.link} label={u.text} person={u.text.split(" on ")[0] || ""} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── DESKTOP: list format ── */
          <div style={{ padding: "0 20px 20px" }}>
            {filteredUpdates.map((u, i) => {
              const co = companies.find(c => c.id === u.company);
              const tc = UPDATE_TYPES[u.type] || { c: "#94A3B8", label: u.type };
              return (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #f5f3ee" }}>
                  <div style={{ flexShrink: 0, width: 90 }}>
                    <div style={{ fontSize: 14, color: "#a0a09b" }}>{u.date}</div>
                    <div style={{ fontSize: 10, color: tc.c, textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>{tc.label}</div>
                  </div>
                  <div style={{ width: 3, borderRadius: 2, background: tc.c, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, color: "#2d2d2a", lineHeight: 1.5 }}>{u.text}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                      {co && <span onClick={() => { setSel(co); setPanel("graph"); setTab("info"); }} style={{ fontSize: 12, color: CC[co.cat]?.c || "#666", cursor: "pointer" }}>{CC[co.cat]?.i} {co.name} →</span>}
                      {u.link && <a href={u.link} target="_blank" rel="noopener" style={{ fontSize: 11, color: "#8a8a85", textDecoration: "none" }}>📰 Source →</a>}
                      {u.type === "interview" && u.link && <UpdateSummariseBtn url={u.link} label={u.text} person={u.text.split(" on ")[0] || ""} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* ── PEOPLE PANEL (collapsible categories) ─────────────────── */}
      {panel === "people" && <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", background: "#faf9f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 700, color: "#1a1a18", margin: "16px 0 4px" }}>Key People</h2>
            <p style={{ fontSize: 13, color: "#a0a09b", marginBottom: 14 }}>Founders, CEOs, investors, and leaders</p>
          </div>
          <button onClick={() => {
            if (allPeopleOpen) { setOpenCats(new Set()); setAllPeopleOpen(false); }
            else { const allCats = new Set(); Object.values(PEOPLE).forEach(p => { const co = companies.find(c => p.co.includes(c.id)); if (co) allCats.add(co.cat); }); setOpenCats(allCats); setAllPeopleOpen(true); }
          }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e8e5dc", background: "transparent", color: "#8a8a85", fontSize: 11, cursor: "pointer", fontFamily: "inherit", height: 36 }}>{allPeopleOpen ? "Collapse All" : "Expand All"}</button>
        </div>
        {(() => {
          const sectorFunding = {};
          companies.forEach(c => { sectorFunding[c.cat] = (sectorFunding[c.cat] || 0) + (c.fn || 0); });
          // Group people by category
          const groups = {};
          Object.entries(PEOPLE).forEach(([name, p]) => {
            const co = companies.find(c => p.co.includes(c.id));
            const cat = co?.cat || "other";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push([name, p]);
          });
          // Sort categories by funding
          const sortedCats = Object.keys(groups).sort((a, b) => (sectorFunding[b] || 0) - (sectorFunding[a] || 0));
          return sortedCats.map(cat => {
            const isOpen = openCats.has(cat);
            const people = groups[cat];
            const cfg = CC[cat] || { c: "#666", l: cat, i: "👤" };
            return (
              <div key={cat} style={{ marginBottom: 8 }}>
                {/* Category header — clickable */}
                <div onClick={() => setOpenCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#ffffff", border: `1px solid ${isOpen ? cfg.c + "40" : "#e8e5dc"}`, cursor: "pointer", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 18 }}>{cfg.i}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: cfg.c }}>{cfg.l}</span>
                    <span style={{ fontSize: 12, color: "#a0a09b", marginLeft: 8 }}>{people.length} {people.length === 1 ? "person" : "people"}</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#a0a09b", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                </div>
                {/* People cards — collapsible */}
                <div style={{ maxHeight: isOpen ? people.length * 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease-in-out" }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 8, padding: "8px 0" }}>
                    {people.map(([name, p]) => {
                      const isStarred = stars.has(`person:${name}`);
                      return (
                        <div key={name} id={`person-${name.replace(/\s+/g, "-")}`} style={{ background: highlightPerson === name ? "#fff3e0" : "#ffffff", borderRadius: 8, padding: "12px", border: `1px solid ${highlightPerson === name ? "#C15F3C" : "#e8e5dc"}`, transition: "all 0.3s ease" }}>
                          <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 16, color: "#1a1a18", fontWeight: 600 }}>{name}</div>
                              <div style={{ fontSize: 13, color: "#8a8a85", marginTop: 1 }}>{p.role}</div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <span onClick={() => toggleStar("person", name)} style={{ cursor: "pointer" }}><StarIcon filled={isStarred} /></span>
                              {p.tw && <a href={p.tw} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 4, background: "#2a2a28", border: "1px solid #333" }}><XIcon size={12} /></a>}
                              {p.li && <a href={p.li} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 4, background: "#0A66C2" }}><LIIcon size={12} /></a>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                            {p.co.map(cid => { const co2 = companies.find(c => c.id === cid); return co2 ? <span key={cid} onClick={() => { setSel(co2); setPanel("graph"); setTab("info"); }} style={{ fontSize: 8, color: CC[co2.cat]?.c, cursor: "pointer", padding: "1px 5px", borderRadius: 3, background: (CC[co2.cat]?.c || "#666") + "18" }}>{co2.s || co2.name}</span> : null; })}
                          </div>
                          {p.pods && p.pods.length > 0 && <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #e8e5dc" }}>
                            <div style={{ fontSize: 12, color: "#a0a09b", fontWeight: 600, marginBottom: 3 }}>INTERVIEWS & PODCASTS</div>
                            <PodcastList pods={p.pods} personName={name} />
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>}

      {/* ── EVENTS PANEL ─────────────────────────────────────────── */}
      {panel === "events" && <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", background: "#faf9f5" }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 700, color: "#1a1a18", margin: "16px 0 6px" }}>London AI Events</h2>
        <p style={{ fontSize: 13, color: "#a0a09b", marginBottom: 14 }}>Curated meetups, conferences, and community gatherings</p>
        {eventsLoading ? <div style={{ textAlign: "center", padding: 40, color: "#a0a09b" }}>Loading events...</div> :
        events.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#a0a09b" }}>No events found</div> :
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
          {events.map((ev, i) => {
            const isPast = new Date(ev.date) < new Date();
            return (
              <div key={i} style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e8e5dc", padding: 16, opacity: isPast ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#C15F3C", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {new Date(ev.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {ev.time && <span style={{ color: "#8a8a85", fontWeight: 400 }}> · {ev.time}</span>}
                    </div>
                    <h3 style={{ margin: "4px 0 0", fontSize: 17, fontFamily: "'Inter',sans-serif", fontWeight: 700, color: "#1a1a18" }}>{ev.title}</h3>
                  </div>
                  {ev.recurring && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#30D15818", color: "#30D158", fontWeight: 600 }}>RECURRING</span>}
                </div>
                {ev.venue && <div style={{ fontSize: 12, color: "#6b6b66", marginBottom: 4 }}>📍 {ev.venue}</div>}
                {ev.organiser && <div style={{ fontSize: 12, color: "#8a8a85", marginBottom: 6 }}>Organised by {ev.organiser}</div>}
                {ev.description && <p style={{ fontSize: 13, color: "#4a4a45", lineHeight: 1.5, margin: "0 0 8px" }}>{ev.description}</p>}
                {ev.speakers?.length > 0 && ev.speakers[0] && <div style={{ fontSize: 11, color: "#6b6b66", marginBottom: 6 }}>🎤 {ev.speakers.join(", ")}</div>}
                {ev.topics?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {ev.topics.map((t, j) => <span key={j} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#e8e5dc", color: "#6b6b66" }}>{t}</span>)}
                </div>}
                {ev.registration_url && <a href={ev.registration_url} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "#C15F3C", color: "#fff", fontSize: 11, textDecoration: "none", fontFamily: "inherit", fontWeight: 600 }}>{isPast ? "View details →" : "Register →"}</a>}
              </div>
            );
          })}
        </div>}
      </div>}

      {/* ── BITS PANEL (admin-only) ─────────────────────────────── */}
      {panel === "bits" && user?.id === ADMIN_UID && <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", background: "#faf9f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 700, color: "#1a1a18", margin: "16px 0 6px" }}>⚡ Bits <span style={{ fontSize: 12, color: "#C15F3C", fontWeight: 400 }}>Admin</span></h2>
          <button onClick={async () => {
            setBitsLoading(true);
            try {
              const res = await fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=scrape", { method: "POST" });
              const d = await res.json();
              alert(`Scraped: ${d.found || 0} found, ${d.inserted || 0} inserted${d.error ? ". Error: " + d.error : ""}`);
              setBitsFetched(false); // re-fetch
            } catch (e) { alert("Scrape failed: " + e.message); }
            setBitsLoading(false);
          }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #C15F3C", background: "#C15F3C18", color: "#C15F3C", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, height: 36 }}>🔍 Scrape New</button>
        </div>
        <p style={{ fontSize: 13, color: "#a0a09b", marginBottom: 10 }}>Curated posts, articles, charts — review and approve before publishing</p>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          {[["all", `All (${bits.length})`], ["pending", `Pending (${bits.filter(b=>b._pending).length})`], ["approved", `Approved (${bits.filter(b=>!b._pending).length})`], ["tweet", "𝕏 Posts"], ["article", "Articles"], ["chart", "Charts"], ["podcast", "Podcasts"]].map(([k, l]) => (
            <button key={k} onClick={() => setBitsFilter(k)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${bitsFilter === k ? "#C15F3C" : "#e8e5dc"}`, background: bitsFilter === k ? "#C15F3C18" : "transparent", color: bitsFilter === k ? "#C15F3C" : "#8a8a85", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: bitsFilter === k ? 600 : 400 }}>{l}</button>
          ))}
        </div>
        {bitsLoading ? <div style={{ textAlign: "center", padding: 40, color: "#a0a09b" }}>Loading bits...</div> :
        bits.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#a0a09b" }}>No bits yet — hit Scrape to find some</div> :
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
          {bits.filter(b => {
            if (bitsFilter === "pending") return b._pending;
            if (bitsFilter === "approved") return !b._pending;
            if (bitsFilter === "all") return true;
            return b.type === bitsFilter;
          }).map((bit, i) => {
            const typeConfig = { tweet: { icon: "𝕏", c: "#1DA1F2" }, article: { icon: "📰", c: "#30D158" }, chart: { icon: "📊", c: "#BF5AF2" }, podcast: { icon: "🎙️", c: "#FF9F0A" }, video: { icon: "🎬", c: "#FF2D55" }, meme: { icon: "😂", c: "#FFD60A" } };
            const tc = typeConfig[bit.type] || { icon: "⚡", c: "#C15F3C" };
            return (
              <div key={bit.id || i} style={{ background: "#ffffff", borderRadius: 10, border: `1px solid ${bit._pending ? "#FF9F0A50" : "#e8e5dc"}`, padding: 16 }}>
                {/* Status badge */}
                {bit._pending && <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#FF9F0A18", color: "#FF9F0A", fontWeight: 600 }}>PENDING REVIEW</span>
                  {bit.ai_relevance_score && <span style={{ fontSize: 9, color: "#a0a09b", marginLeft: 6 }}>Score: {(bit.ai_relevance_score * 100).toFixed(0)}%</span>}
                </div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{tc.icon}</span>
                    <span style={{ fontSize: 10, color: tc.c, fontWeight: 600, textTransform: "uppercase" }}>{bit.type}</span>
                    {bit.date && <span style={{ fontSize: 10, color: "#a0a09b" }}>{new Date(bit.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                  </div>
                  {bit.engagement && <span style={{ fontSize: 9, color: "#a0a09b" }}>{bit.engagement}</span>}
                </div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontFamily: "'Inter',sans-serif", fontWeight: 700, color: "#1a1a18", lineHeight: 1.3 }}>{bit.title}</h3>
                {bit.description && <p style={{ fontSize: 13, color: "#4a4a45", lineHeight: 1.5, margin: "0 0 6px" }}>{bit.description.replace(/<[^>]*>/g, "")}</p>}
                {bit.ai_reason && bit._pending && <p style={{ fontSize: 11, color: "#8a8a85", margin: "0 0 6px", fontStyle: "italic" }}>AI: {bit.ai_reason}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {bit.author && <span style={{ fontSize: 11, color: "#6b6b66" }}>{bit.author}</span>}
                  {bit.author_handle && <span style={{ fontSize: 10, color: "#a0a09b" }}>{bit.author_handle}</span>}
                  {bit.source && <span style={{ fontSize: 9, color: "#c5c3ba" }}>{bit.source}</span>}
                </div>
                {bit.tags?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {bit.tags.map((t, j) => <span key={j} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: t === "londonmaxxing" ? "#C15F3C18" : "#e8e5dc", color: t === "londonmaxxing" ? "#C15F3C" : "#6b6b66", fontWeight: t === "londonmaxxing" ? 600 : 400 }}>{t}</span>)}
                </div>}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {bit.url && <a href={bit.url} target="_blank" rel="noopener" style={{ fontSize: 11, color: "#C15F3C", textDecoration: "none", fontWeight: 500 }}>View →</a>}
                  {bit._pending && <>
                    <div style={{ flex: 1 }} />
                    <button onClick={async () => {
                      await fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bit.id }) });
                      setBits(prev => prev.map(b => b.id === bit.id ? { ...b, _pending: false, status: "approved" } : b));
                    }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✓ Approve</button>
                    <button onClick={async () => {
                      await fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bit.id }) });
                      setBits(prev => prev.filter(b => b.id !== bit.id));
                    }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #FF453A", background: "#FF453A18", color: "#FF453A", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✕ Reject</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>}
      </div>}

      {/* ── SCORE PANEL ──────────────────────────────────────────── */}
      {panel === "score" && <div style={{ position: "fixed", top: isMobile ? 56 : 70, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", background: "#faf9f5" }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 700, color: "#1a1a18", margin: "16px 0 6px" }}>Network Score & Badges</h2>
        {!user && <div style={{ padding: "12px", borderRadius: 8, background: "#FF9F0A18", border: "1px solid #FF9F0A33", marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#FF9F0A" }}>⚠️ Sign up to save your score, appear on the leaderboard, and track connections across devices.</span>
          <button onClick={() => setAuthMode("signup")} style={{ marginLeft: 8, padding: "3px 8px", borderRadius: 4, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 9, cursor: "pointer" }}>Sign up</button>
        </div>}
        {/* Score card */}
        <div style={{ background: "linear-gradient(135deg,#e8e5dc,#ffffff)", borderRadius: 12, padding: "20px", border: "1px solid #d5d3ca", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>{score.emoji || "🔭"}</div>
          <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "'Inter',sans-serif", color: "#FFD700", marginTop: 4 }}>{score.score}</div>
          <div style={{ fontSize: 16, color: "#2d2d2a", fontWeight: 600 }}>{score.level || "Explorer"}</div>
          {score.nextLevel && <>
            <div style={{ width: "100%", height: 4, background: "#e8e5dc", borderRadius: 2, marginTop: 10 }}>
              <div style={{ width: score.pct + "%", height: 4, background: "linear-gradient(90deg,#FF2D55,#FFD700)", borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 8.5, color: "#a0a09b", marginTop: 4 }}>{score.pct}% to {score.nextLevel} ({score.nextMin} pts)</div>
          </>}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#2d2d2a" }}>{mn}</div><div style={{ fontSize: 8, color: "#a0a09b" }}>Tracked</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#2d2d2a" }}>{score.breakdown.catCount || 0}</div><div style={{ fontSize: 8, color: "#a0a09b" }}>Categories</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#2d2d2a" }}>{score.breakdown.frontierCoverage || 0}/7</div><div style={{ fontSize: 8, color: "#a0a09b" }}>Frontier</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "#2d2d2a" }}>{earnedBadges.length}/{BADGES.length}</div><div style={{ fontSize: 8, color: "#a0a09b" }}>Badges</div></div>
          </div>
        </div>
        {/* Badges */}
        <div style={{ fontSize: 11, color: "#6b6b66", fontWeight: 600, marginBottom: 8 }}>BADGES</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(140px,1fr))", gap: 6, marginBottom: 16 }}>
          {BADGES.map(b => {
            const earned = earnedBadges.find(e => e.id === b.id);
            return (<div key={b.id} style={{ background: earned ? "#e8e5dc" : "#f8f7f3", borderRadius: 8, padding: "10px", border: `1px solid ${earned ? "#d5d3ca" : "#f5f3ee"}`, opacity: earned ? 1 : 0.4, textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 10, color: "#2d2d2a", fontWeight: 600, marginTop: 3 }}>{b.name}</div>
              <div style={{ fontSize: 8, color: "#a0a09b", marginTop: 2 }}>{b.desc}</div>
              {earned && <div style={{ fontSize: 7.5, color: "#30D158", marginTop: 3 }}>✓ Earned</div>}
            </div>);
          })}
        </div>
      </div>}

      {/* ── DETAIL PANEL (graph) ──────────────────────────────────── */}
      {sel && panel === "graph" && <DraggableCard isMobile={isMobile} onClose={() => setSel(null)}>
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #e8e5dc" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: CC[sel.cat]?.c, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{CC[sel.cat]?.i} {CC[sel.cat]?.l}</span>
              <h2 style={{ margin: "2px 0 0", fontSize: 18, fontFamily: "'Inter',sans-serif", fontWeight: 700, color: "#1a1a18" }}>{sel.name}</h2>
              {sel.hq && <p style={{ margin: "1px 0 0", fontSize: 12, color: "#8a8a85" }}>📍 {sel.hq}</p>}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "start", marginLeft: 8 }}>
              <span onClick={() => toggleStar("company", sel.id)} style={{ cursor: "pointer", padding: 4 }}><StarIcon filled={stars.has(`company:${sel.id}`)} /></span>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#a0a09b", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
            </div>
          </div>
          {selUD && <div style={{ marginTop: 6, padding: "4px 7px", borderRadius: 5, background: US[selUD.status]?.c + "18", border: `1px solid ${US[selUD.status]?.c}30`, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9 }}>{US[selUD.status]?.i}</span>
            <span style={{ fontSize: 9, color: US[selUD.status]?.c, fontWeight: 600 }}>{US[selUD.status]?.l}</span>
            {(selUD.contact_name || selUD.contact) && <span style={{ fontSize: 8, color: "#6b6b66" }}>· {selUD.contact_name || selUD.contact}</span>}
          </div>}
          <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
            {["info", "people", "links", "🤝"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "4px 0", border: "none", borderBottom: tab === t ? `2px solid ${CC[sel.cat]?.c}` : "2px solid transparent", background: "none", color: tab === t ? "#1a1a18" : "#a0a09b", fontSize: 12, fontFamily: "inherit", cursor: "pointer", textTransform: "uppercase", fontWeight: 600 }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: isMobile ? "10px 14px calc(14px + env(safe-area-inset-bottom, 20px))" : "10px 14px 14px" }}>
          {tab === "info" && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
              {sel.fund && <M l="Funding" v={sel.fund} />}{sel.val && <M l="Valuation" v={sel.val} />}{sel.emp && <M l="Team" v={sel.emp} />}{sel.yr && <M l="Founded" v={sel.yr} />}
            </div>
            {sel.focus && <S t="Focus" v={sel.focus} />}
            {sel.ethos && <S t="Ethos" v={sel.ethos} />}
            {sel.ms && <S t="Milestones" v={sel.ms} />}
            {sel.jobs && <a href={sel.jobs} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "#e8e5dc", color: "#2d2d2a", fontSize: 9.5, textDecoration: "none", fontFamily: "inherit", border: "1px solid #d5d3ca", marginTop: 6 }}>🔗 Careers →</a>}
          </>}
          {tab === "people" && <>
            {sel.founders && <S t="Founders" v={sel.founders} />}
            {sel.kp && <S t="Key People" v={sel.kp} />}
            {relatedPeople.length > 0 && <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 8, color: "#8a8a85", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Social Links</div>
              {relatedPeople.map(([name, p]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ fontSize: 10, color: "#4a4a45", flex: 1 }}>{name}</span>
                  {p.tw && <a href={p.tw} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#2a2a28", border: "1px solid #333" }}><XIcon size={11} /></a>}
                  {p.li && <a href={p.li} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#0A66C2" }}><LIIcon size={11} /></a>}
                </div>
              ))}
              {/* Podcasts for this company's people */}
              {relatedPeople.some(([, p]) => p.pods?.length > 0) && <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 8, color: "#8a8a85", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Interviews & Podcasts</div>
                {relatedPeople.map(([name, p]) => p.pods?.length > 0 ? (
                  <div key={name} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: "#6b6b66", marginBottom: 2 }}>{name}</div>
                    <PodcastList pods={p.pods} compact personName={name} />
                  </div>
                ) : null)}
              </div>}
            </div>}
          </>}
          {tab === "links" && <>
            {ce.length === 0 ? <p style={{ fontSize: 12, color: "#a0a09b" }}>No connections.</p> :
              ce.map((e, i) => { const oid = e.s === sel.id ? e.t : e.s; const o = companies.find(c => c.id === oid); if (!o) return null; return (<div key={i} onClick={() => { setSel(o); setTab("info"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: "rgba(0,0,0,0.02)" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: ECfg[e.ty]?.c || "#444" }} /><span style={{ fontSize: 10, color: "#4a4a45", flex: 1 }}>{o.name}</span>{e.l && <span style={{ fontSize: 7.5, color: "#a0a09b" }}>{e.l}</span>}<span style={{ fontSize: 7, color: "#c5c3ba", textTransform: "uppercase" }}>{e.ty}</span></div>); })}
          </>}
          {tab === "🤝" && <>
            <p style={{ fontSize: 9, color: "#8a8a85", marginBottom: 8 }}>Your connection to {sel.s || sel.name}.</p>
            {!user && <div style={{ padding: "6px 8px", borderRadius: 5, background: "#FF9F0A18", border: "1px solid #FF9F0A33", marginBottom: 8, fontSize: 9, color: "#FF9F0A" }}>Sign up to save connections across devices. <span onClick={() => setAuthMode("signup")} style={{ textDecoration: "underline", cursor: "pointer" }}>Sign up</span></div>}
            {editConn === sel.id ? <>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: "#8a8a85", marginBottom: 3 }}>STATUS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {Object.entries(US).map(([k, cfg]) => (
                    <button key={k} onClick={() => setCf(p => ({ ...p, status: k }))} style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${cf.status === k ? cfg.c : "#e8e5dc"}`, background: cf.status === k ? cfg.c + "20" : "transparent", color: cf.status === k ? cfg.c : "#64748B", fontSize: 8, cursor: "pointer", fontFamily: "inherit" }}>{cfg.i} {cfg.l}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={cf.contact_name || ""} onChange={e => setCf(p => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" style={{ ...inputStyle, marginBottom: 5 }} />
              <textarea value={cf.notes || ""} onChange={e => setCf(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => saveConn(sel.id, cf)} style={{ flex: 1, padding: "5px", borderRadius: 5, border: "none", background: "#C15F3C", color: "#000", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditConn(null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid #e8e5dc", background: "transparent", color: "#8a8a85", fontSize: 9, cursor: "pointer" }}>Cancel</button>
                {selUD && <button onClick={() => saveConn(sel.id, null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid #FF453A33", background: "transparent", color: "#FF453A", fontSize: 9, cursor: "pointer" }}>Remove</button>}
              </div>
            </> : <>
              {selUD ? <div>
                <div style={{ padding: "8px", borderRadius: 6, background: "#ffffff", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 12 }}>{US[selUD.status]?.i}</span><span style={{ fontSize: 11, color: US[selUD.status]?.c, fontWeight: 600 }}>{US[selUD.status]?.l}</span></div>
                  {(selUD.contact_name || selUD.contact) && <div style={{ fontSize: 10, color: "#4a4a45", marginTop: 3 }}>Contact: {selUD.contact_name || selUD.contact}</div>}
                  {selUD.notes && <div style={{ fontSize: 9.5, color: "#6b6b66", marginTop: 3 }}>{selUD.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setCf({ status: selUD.status, contact_name: selUD.contact_name || selUD.contact || "", notes: selUD.notes || "" }); setEditConn(sel.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #e8e5dc", background: "transparent", color: "#6b6b66", fontSize: 9, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => { setCf({ status: "target", contact_name: "", notes: "" }); setEditConn(sel.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #30D15850", background: "#30D15810", color: "#30D158", fontSize: 9, cursor: "pointer" }}>+ Add another</button>
                </div>
              </div> : <button onClick={() => { setCf({ status: "target", contact_name: "", notes: "" }); setEditConn(sel.id); }} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid #30D15850", background: "#30D15810", color: "#30D158", fontSize: 9.5, cursor: "pointer" }}>+ Add Connection</button>}
            </>}
          </>}
        </div>
      </DraggableCard>}

      {/* ── MAP LEGENDS ─────────────────────────────────────────── */}
      {panel === "graph" && !sel && <div style={{ position: "absolute", bottom: isMobile ? 100 : 14, left: isMobile ? 8 : 12, background: "rgba(255,255,255,0.95)", borderRadius: 8, padding: "8px 12px", border: "1px solid #e8e5dc", zIndex: 500, backdropFilter: "blur(8px)", maxWidth: isMobile ? "calc(100vw - 16px)" : 300 }}>
        <div style={{ fontSize: 12, color: "#a0a09b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Connections</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          {[["Alumni", "#C15F3C"], ["Spin-off", "#BF5AF2"], ["Investment", "#FFD700"], ["Academic", "#5AC8FA"], ["Partnership", "#6a9bcc"], ["Accelerator", "#FF9500"]].map(([l, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 14, height: 3, background: c, display: "inline-block", borderRadius: 1 }} />
              <span style={{ fontSize: 12, color: "#6b6b66" }}>{l}</span>
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#a0a09b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Bubble Size = Funding</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="80" height="24"><circle cx="8" cy="12" r="5" fill="#C15F3C" opacity="0.3" stroke="#C15F3C" strokeWidth="1"/><circle cx="30" cy="12" r="9" fill="#C15F3C" opacity="0.3" stroke="#C15F3C" strokeWidth="1"/><circle cx="58" cy="12" r="13" fill="#C15F3C" opacity="0.3" stroke="#C15F3C" strokeWidth="1"/></svg>
          <span style={{ fontSize: 11, color: "#8a8a85" }}>Seed → Series A → $1B+</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#a0a09b" }}>Click → details · Hover → highlight network · Drag to rearrange</p>
      </div>}
    </div>
  );
}

// ── SUBCOMPONENTS ───────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid #e8e5dc", background: "#f5f3ee", color: "#2d2d2a", fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none", marginBottom: 8, boxSizing: "border-box" };

function M({ l, v }) { return (<div style={{ background: "#ffffff", borderRadius: 5, padding: "5px 7px" }}><div style={{ fontSize: 10, color: "#a0a09b", textTransform: "uppercase", letterSpacing: 0.3 }}>{l}</div><div style={{ fontSize: 15, color: "#2d2d2a", fontWeight: 500 }}>{String(v)}</div></div>); }
function S({ t, v }) { return (<div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "#8a8a85", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 14, color: "#4a4a45", lineHeight: 1.5 }}>{v}</div></div>); }
function UpdateSummariseBtn({ url, label, person }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const EDGE_FN_URL = "https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/summarize-podcast";
  const doSummarise = async () => {
    if (summary) return;
    setLoading(true);
    try {
      const res = await fetch(EDGE_FN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ podcast_url: url, podcast_label: label, person_name: person }) });
      const data = await res.json();
      setSummary(data.summary || data.error || "Could not generate summary.");
    } catch { setSummary("Error generating summary."); }
    setLoading(false);
  };
  return (<>
    <button onClick={doSummarise} style={{ padding: "1px 6px", borderRadius: 3, border: "1px solid #e8e5dc", background: summary ? "#C15F3C10" : "transparent", color: summary ? "#C15F3C" : "#a0a09b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
      {loading ? <span style={{ animation: "pulse 1s infinite" }}>⏳</span> : summary ? "✓ Summary" : "✨ Summarise"}
    </button>
    {summary && <div style={{ width: "100%", fontSize: 12, color: "#6b6b66", lineHeight: 1.5, padding: "4px 0 2px", borderLeft: "2px solid #e8e5dc", paddingLeft: 10, marginTop: 4 }}>
      {summary.split("•").filter(Boolean).map((b, j) => <div key={j} style={{ marginBottom: 2 }}>• {b.trim()}</div>)}
    </div>}
  </>);
}

function DraggableCard({ isMobile, onClose, children }) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const cardRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    // Only allow drag from the handle area (top 40px)
    const touch = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || touch.clientY - rect.top > 40) return;
    startY.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY.current;
    // Only allow dragging down (positive dy)
    setDragY(Math.max(0, dy));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // If dragged more than 120px down, close the card
    if (dragY > 120) {
      onClose();
    }
    setDragY(0);
  }, [isDragging, dragY, onClose]);

  if (!isMobile) {
    // Desktop: plain fixed card, no drag
    return (
      <div style={{ position: "fixed", top: 70, right: 6, width: 320, maxHeight: "calc(100vh - 80px)", overflowY: "auto", background: "rgba(255,255,255,0.98)", borderRadius: 12, backdropFilter: "blur(16px)", border: "1px solid #e8e5dc", zIndex: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        {children}
      </div>
    );
  }

  // Mobile: draggable bottom sheet
  const opacity = dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1;
  return (
    <div
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "92vh",
        overflowY: isDragging ? "hidden" : "auto",
        background: "rgba(255,255,255,0.98)",
        borderRadius: "16px 16px 0 0",
        backdropFilter: "blur(16px)",
        border: "1px solid #e8e5dc",
        borderBottom: "none",
        zIndex: 30,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
        transform: `translateY(${dragY}px)`,
        opacity,
        transition: isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Drag handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", cursor: "grab" }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: "#d5d3ca" }} />
      </div>
      {children}
    </div>
  );
}

function SB({ l, v, c }) { return (<div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 6, padding: "3px 8px", border: "1px solid #e8e5dc", textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: "'Inter',sans-serif" }}>{v}</div><div style={{ fontSize: 10, color: "#a0a09b", textTransform: "uppercase" }}>{l}</div></div>); }

function PodcastList({ pods, compact, personName }) {
  const [showAll, setShowAll] = useState(false);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState({});
  const [chatOpen, setChatOpen] = useState(null);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState({});
  const [chatLoading, setChatLoading] = useState(false);
  const visible = showAll ? pods : pods.slice(0, 3);

  const EDGE_FN_URL = "https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/summarize-podcast";

  const summarize = async (pod) => {
    const key = pod.url;
    if (summaries[key]) return;
    setLoading(p => ({ ...p, [key]: true }));
    try {
      // Check local cache first
      const { data: cached } = await supabase.from("podcast_summaries").select("summary").eq("podcast_url", key).single();
      if (cached?.summary) {
        setSummaries(p => ({ ...p, [key]: cached.summary }));
        setLoading(p => ({ ...p, [key]: false }));
        return;
      }
      // Call Edge Function (proxies to Claude API)
      const res = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcast_url: key, podcast_label: pod.label, person_name: personName || "" }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummaries(p => ({ ...p, [key]: data.summary }));
      } else {
        setSummaries(p => ({ ...p, [key]: data.error || "Could not generate summary." }));
      }
    } catch (e) {
      setSummaries(p => ({ ...p, [key]: "Could not generate summary." }));
    }
    setLoading(p => ({ ...p, [key]: false }));
  };

  const sendChat = async (pod) => {
    if (!chatMsg.trim()) return;
    const key = pod.url;
    const history = chatHistory[key] || [];
    const newHistory = [...history, { role: "user", content: chatMsg }];
    setChatHistory(p => ({ ...p, [key]: newHistory }));
    setChatMsg("");
    setChatLoading(true);
    try {
      const res = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          podcast_url: key,
          podcast_label: pod.label,
          person_name: personName || "",
          chat_messages: newHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Unable to respond.";
      setChatHistory(p => ({ ...p, [key]: [...(p[key] || []), { role: "assistant", content: reply }] }));
    } catch { setChatHistory(p => ({ ...p, [key]: [...(p[key] || []), { role: "assistant", content: "Error — try again." }] })); }
    setChatLoading(false);
  };

  return (<div>
    {visible.map((pod, i) => {
      const key = pod.url;
      const hasSummary = summaries[key];
      const isLoading = loading[key];
      const isChatOpen = chatOpen === key;
      const chat = chatHistory[key] || [];
      return (
        <div key={i} style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <a href={pod.url} target="_blank" rel="noopener" style={{ flex: 1, fontSize: compact ? 12 : 13, color: "#6b6b66", textDecoration: "none", lineHeight: 1.4 }}>
              <span style={{ color: "#8a8a85" }}>🎙️</span> <span style={{ color: "#4a4a45" }}>{pod.label}</span>
            </a>
            <button onClick={() => summarize(pod)} style={{ flexShrink: 0, padding: "1px 5px", borderRadius: 3, border: "1px solid #e8e5dc", background: hasSummary ? "#C15F3C18" : "transparent", color: hasSummary ? "#C15F3C" : "#5a564e", fontSize: 8, cursor: "pointer", fontFamily: "inherit" }}>
              {isLoading ? <span style={{ display: "inline-block", animation: "pulse 1s infinite" }}>⏳</span> : hasSummary ? "✓" : "✨"}
            </button>
          </div>
          {hasSummary && <div style={{ fontSize: 9.5, color: "#6b6b66", lineHeight: 1.5, padding: "4px 0 2px 16px", borderLeft: "2px solid #e8e5dc", marginTop: 2, marginBottom: 2 }}>
            {hasSummary.split("•").filter(Boolean).map((b, j) => (
              <div key={j} style={{ marginBottom: 2 }}>• {b.trim()}</div>
            ))}
            <button onClick={() => setChatOpen(isChatOpen ? null : key)} style={{ fontSize: 8, color: "#6a9bcc", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2, fontFamily: "inherit" }}>
              {isChatOpen ? "close chat" : "💬 ask about this"}
            </button>
          </div>}
          {isChatOpen && <div style={{ marginLeft: 16, marginTop: 4, marginBottom: 4 }}>
            {chat.map((m, j) => (
              <div key={j} style={{ fontSize: 9, color: m.role === "user" ? "#d4cfc4" : "#a09b90", padding: "2px 0", borderLeft: m.role === "assistant" ? "2px solid #C15F3C33" : "none", paddingLeft: m.role === "assistant" ? 6 : 0 }}>
                {m.role === "user" ? "You: " : "AI: "}{m.content}
              </div>
            ))}
            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
              <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat(pod)} placeholder="Ask a question..." style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid #e8e5dc", background: "#f5f3ee", color: "#4a4a45", fontSize: 9, fontFamily: "inherit", outline: "none" }} />
              <button onClick={() => sendChat(pod)} disabled={chatLoading} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "#C15F3C", color: "#fff", fontSize: 8, cursor: "pointer", opacity: chatLoading ? 0.5 : 1 }}>{chatLoading ? "..." : "→"}</button>
            </div>
          </div>}
        </div>
      );
    })}
    {pods.length > 3 && !showAll && <span onClick={() => setShowAll(true)} style={{ fontSize: 8.5, color: "#C15F3C", cursor: "pointer", display: "inline-block", marginTop: 2 }}>+ {pods.length - 3} more</span>}
    {showAll && pods.length > 3 && <span onClick={() => setShowAll(false)} style={{ fontSize: 8.5, color: "#a0a09b", cursor: "pointer", display: "inline-block", marginTop: 2 }}>show less</span>}
  </div>);
}
