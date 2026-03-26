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

function nr(c, view, mobile) {
  const m = mobile ? 1.5 : 1;
  if (view === "investors") {
    if (c.cat === "investor") return 20 * m;
    const f = c.fn || 0;
    if (f >= 1000) return 12 * m; if (f >= 500) return 10 * m; if (f >= 200) return 8 * m; if (f >= 50) return 7 * m; return 5 * m;
  }
  if (c.cat === "frontier") return 26 * m; if (c.cat === "investor") return 10 * m; if (c.cat === "academic") return 13 * m;
  if (c.cat === "frontier-emerging") return 18 * m;
  const f = c.fn || 0;
  if (f >= 1000) return 22 * m; if (f >= 500) return 18 * m; if (f >= 200) return 15 * m; if (f >= 50) return 12 * m; if (f >= 10) return 10 * m; return 8 * m;
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
  regulation: { label: "AI Reg", c: "#6a9bcc" },
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
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [cats, setCats] = useState(new Set(Object.keys(CC).filter(k => k !== "investor")));
  const [hov, setHov] = useState(null);
  const [dim, setDim] = useState({ w: 1200, h: 800 });
  const isMobile = dim.w < 768;
  const [tab, setTab] = useState("info");
  const [fundingRounds, setFundingRounds] = useState([]);
  const [signals, setSignals] = useState([]);
  const layout = "force";
  const [panel, _setPanel] = useState("graph");
  const [panelAnim, setPanelAnim] = useState(false);
  const setPanel = useCallback((p) => {
    if (p === panel) return;
    setPanelAnim(true);
    setTimeout(() => { _setPanel(p); setPanelAnim(false); }, 200);
  }, [panel]);
  const panelTransition = { opacity: panelAnim ? 0 : 1, transform: panelAnim ? "translateY(8px)" : "translateY(0)", transition: "opacity 200ms ease, transform 200ms ease" };
  const [highlightPerson, setHighlightPerson] = useState(null);
  const [openCats, setOpenCats] = useState(new Set());
  const [allPeopleOpen, setAllPeopleOpen] = useState(false);
  const [peoplePeek, setPeoplePeek] = useState(null); // inline company card in People panel
  const [showMyNet, setShowMyNet] = useState(false);
  const [updateFilter, setUpdateFilter] = useState("all");
  const [mapView, setMapView] = useState("companies"); // "companies" | "investors"
  const [legendOpen, setLegendOpen] = useState(true);
  const [legendDismissed, setLegendDismissed] = useState(() => localStorage.getItem('ldnai-legend-dismissed') === '1');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Insights (sector vertical analyses)
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [insightAsk, setInsightAsk] = useState("");
  const [insightAnswer, setInsightAnswer] = useState("");
  const [insightAsking, setInsightAsking] = useState(false);

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

  // Track header height dynamically (it wraps on mobile)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      if (h > 0) setHeaderHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
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
    if ((panel !== "bits" && panel !== "insights") || bitsFetched) return;
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

  // Lazy-load insights
  useEffect(() => {
    if (panel !== "insights" || insightsFetched) return;
    setInsightsLoading(true);
    supabase.from("insights").select("*").order("title").then(({ data, error }) => {
      if (data) setInsights(data);
      setInsightsFetched(true); setInsightsLoading(false);
    }).catch(() => { setInsightsFetched(true); setInsightsLoading(false); });
  }, [panel, insightsFetched]);

  const askInsight = async (insight, question) => {
    setInsightAsking(true); setInsightAnswer("");
    try {
      const sectorCompanies = companies.filter(c => (insight.company_ids || []).includes(c.id));
      const companyContext = sectorCompanies.map(c => `${c.name}: ${c.focus || ""} ${c.clients || ""} (${c.fund || "no funding info"})`).join("\n");
      const sectorContext = `SECTOR: ${insight.title}\nPROBLEM: ${insight.the_problem}\nWHO'S SOLVING IT: ${insight.whos_solving_it}\nWHAT'S WORKING: ${insight.whats_working}\nUNSPOKEN TRUTHS: ${insight.unspoken_truths}\nLAST MILE GAPS: ${insight.last_mile_gaps}\nADJACENT BETS: ${insight.adjacent_bets}\nCOMPANIES:\n${companyContext}`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "You are an AI sector analyst for the London AI ecosystem. Give specific, opinionated answers grounded in the company data provided. Be direct and avoid hedging. Reference specific companies where relevant. Keep answers concise (3-5 paragraphs max).",
          messages: [{ role: "user", content: `Context about the ${insight.title} sector in London:\n${sectorContext}\n\nQuestion: ${question}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("\n") || "No response.";
      setInsightAnswer(text);
    } catch (e) { setInsightAnswer("Failed to generate answer. Try again."); }
    setInsightAsking(false);
  };

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
      // In companies view, hide investors
      if (mapView === "companies" && c.cat === "investor") return false;
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
  const tc = c => {
    if (c === "investor" && mapView === "investors") return; // always keep investor checked in Investors view
    setCats(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  };

  const ce = sel ? edges.filter(e => e.s === sel.id || e.t === sel.id) : [];
  const selUD = sel ? ud[sel.id] : null;
  const relatedPeople = sel ? Object.entries(PEOPLE).filter(([n, p]) => p.co.includes(sel.id)) : [];

  // Fetch funding rounds + signals when company selected
  useEffect(() => {
    if (!sel) { setFundingRounds([]); setSignals([]); return; }
    fetch(`https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api?resource=funding_rounds&company=${sel.id}`)
      .then(r => r.json()).then(d => setFundingRounds(d.data || []))
      .catch(() => setFundingRounds([]));
    fetch(`https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api?resource=signals&company=${sel.id}`)
      .then(r => r.json()).then(d => setSignals(d.data || []))
      .catch(() => setSignals([]));
  }, [sel?.id]);
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
    const nodes = filt.map(c => ({ ...c, r: nr(c, mapView, isMobile) }));
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
      .force("charge", d3.forceManyBody().strength(d => isInvView && d.cat === "investor" ? -d.r * 20 : -d.r * 18))
      .force("center", d3.forceCenter(w / 2, h / 2).strength(0.04))
      .force("collision", d3.forceCollide().radius(d => d.r + (isInvView && d.cat === "investor" ? 16 : 4)))
      .force("x", d3.forceX(w / 2).strength(0.015))
      .force("y", d3.forceY(h / 2).strength(0.015));

    if (layout === "cluster") Object.entries(catCenters).forEach(([cat, pos]) => {
      g.append("text").text(CC[cat]?.l || cat).attr("x", pos.x).attr("y", pos.y - 50)
        .attr("text-anchor", "middle").attr("fill", CC[cat]?.c || "#666").attr("font-size", "10px")
        .attr("font-family", "'DM Serif Display',Georgia,serif").attr("font-weight", "600").attr("opacity", 0.4);
    });

    const link = g.append("g").selectAll("path").data(links).enter().append("path")
      .attr("fill", "none")
      .attr("stroke", d => ECfg[d.ty]?.c || "#333").attr("stroke-width", d => d.ty === "alumni" ? 1.3 : 0.7)
      .attr("stroke-opacity", 0.14).attr("stroke-dasharray", d => ECfg[d.ty]?.d || null);

    const node = g.append("g").selectAll("g").data(nodes).enter().append("g").attr("class", "node-g").attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on("click", (e, d) => { e.stopPropagation(); setSel(p => p?.id === d.id ? null : companies.find(c => c.id === d.id)); setTab("info"); setPanel("graph"); })
      .on("mouseenter", (e, d) => setHov(d.id)).on("mouseleave", () => setHov(null));

    node.append("circle").attr("r", d => d.r + 2).attr("fill", "none")
      .attr("stroke", d => CC[d.cat]?.c || "#666").attr("stroke-width", d => isInvView && d.cat === "investor" ? 1.5 : 0.7).attr("stroke-opacity", d => isInvView && d.cat === "investor" ? 0.25 : 0.1).attr("filter", "url(#gl)");
    node.append("circle").attr("r", d => d.r)
      .attr("fill", d => isInvView && d.cat === "investor" ? (CC[d.cat]?.c || "#666") + "30" : (CC[d.cat]?.c || "#666") + "18")
      .attr("stroke", d => CC[d.cat]?.c || "#666")
      .attr("stroke-width", d => isInvView && d.cat === "investor" ? 1.8 : 1.2);
    node.filter(d => ud[d.id]).append("circle").attr("r", d => d.r + 4).attr("fill", "none")
      .attr("stroke", d => US[ud[d.id]?.status]?.c || "#30D158").attr("stroke-width", 1.8).attr("stroke-dasharray", "3,2").attr("stroke-opacity", 0.75);
    // Star indicator
    node.filter(d => stars.has(`company:${d.id}`)).append("text").text("⭐").attr("x", d => d.r - 2).attr("y", d => -d.r + 4).attr("font-size", "8px").attr("pointer-events", "none");
    node.append("text").text(d => CC[d.cat]?.i || "").attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => Math.max(d.r * 0.7, 9) + "px").attr("pointer-events", "none");
    node.append("text").text(d => { const n = d.s || d.name; return n.length > 16 ? n.slice(0, 14) + "…" : n; })
      .attr("text-anchor", "middle").attr("dy", d => d.r + 13)
      .attr("fill", "var(--footer-text)")
      .attr("font-size", d => d.r > 14 ? "11px" : "10px")
      .attr("font-weight", "400")
      .attr("font-family", "'DM Sans',-apple-system,sans-serif").attr("pointer-events", "none");

    svg.on("click", () => setSel(null));
    sim.on("tick", () => {
      link.attr("d", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });
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
  return (<>
    <div style={{ width: "100%", height: "100vh", background: "var(--bg-base)", overflow: "hidden", fontFamily: "var(--font-body)", position: "relative", color: "var(--text-primary)" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes skeletonPulse{0%,100%{opacity:0.6}50%{opacity:1}}@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@keyframes staggerFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c5c3ba;border-radius:4px}input[type=range]{-webkit-appearance:none;background:transparent}input[type=range]::-webkit-slider-track{height:2px;background:var(--border);border-radius:2px}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:8px;border-radius:50%;background:var(--accent);margin-top:-3px;cursor:pointer}.panel-enter{opacity:0;transform:translateY(8px)}.panel-enter-active{opacity:1;transform:translateY(0);transition:opacity 200ms ease,transform 200ms ease}`}</style>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div ref={headerRef} style={{ position: "fixed", top: 0, left: 0, right: 0, padding: isMobile ? "6px 8px" : "10px 14px", background: "var(--bg-base)", borderBottom: "1px solid var(--border)", zIndex: 1000, display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexWrap: "wrap", maxHeight: isMobile ? 48 : "auto" }}>
        <div style={{ flexShrink: 0, cursor: "pointer" }} onClick={() => { setPanel("graph"); setSel(null); setMobileMenuOpen(false); }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 30, fontFamily: "var(--font-body)", fontWeight: 800, background: "linear-gradient(135deg,var(--accent),#d97757,#e8a87c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LDN/ai</h1>
          {!isMobile && <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {companies.filter(c => !["investor", "academic"].includes(c.cat)).length} companies · {edges.length} connections
          </p>}
        </div>
        <div style={{ flex: 1 }} />
        {/* Nav */}
        {!isMobile && <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
          {[["graph", "Map"], ["people", "People"], ["insights", "Insights"], ["events", "Events"], ["updates", "News"], ["bits", "Bits"]].map(([k, l]) => (
            <button key={k} onClick={() => { setPanel(k); if (k !== "graph") setSel(null); }} style={{ padding: "6px 12px", border: "none", height: 36, lineHeight: "24px", background: panel === k ? "var(--bg-sunken)" : "transparent", color: panel === k ? "var(--text-primary)" : "var(--text-muted)", fontSize: 14, fontFamily: "var(--font-body)", cursor: "pointer", fontWeight: panel === k ? 500 : 400 }}>{l}</button>
          ))}
        </div>}
        {/* Search */}
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="Search companies, people, contacts…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, height: 36, boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: 14, width: isMobile ? 150 : 260, outline: "none", fontFamily: "var(--font-body)" }} />
          {searchResults && search && <div style={{ position: isMobile ? "fixed" : "absolute", top: isMobile ? 56 : "100%", left: isMobile ? 8 : "auto", right: isMobile ? 8 : 0, width: isMobile ? "auto" : 320, maxHeight: isMobile ? "60vh" : 400, overflowY: "auto", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", marginTop: isMobile ? 0 : 4, zIndex: 1100,  }}>
            {searchResults.companies.length > 0 && <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--bg-sunken)" }}>
              <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>COMPANIES</div>
              {searchResults.companies.map(c => (
                <div key={c.id} onClick={() => { setSel(c); setPanel("graph"); setTab("info"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 10 }}>{CC[c.cat]?.i}</span>
                  <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{c.name}</span>
                  {ud[c.id] && <span style={{ fontSize: 7, color: US[ud[c.id].status]?.c }}>{US[ud[c.id].status]?.i}</span>}
                </div>
              ))}
            </div>}
            {searchResults.people.length > 0 && <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--bg-sunken)" }}>
              <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>PEOPLE</div>
              {searchResults.people.map(([name, p]) => (
                <div key={name} onClick={() => {
                  // Find the person's category
                  const personCo = companies.find(c => p.co.includes(c.id));
                  const personCat = personCo?.cat || "other";
                  // Expand that category
                  setOpenCats(prev => { const n = new Set(prev); n.add(personCat); return n; });
                  setPanel("people"); setSearch(""); setHighlightPerson(name);
                  setTimeout(() => { const el = document.getElementById(`person-${name.replace(/\s+/g, "-")}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300);
                  setTimeout(() => setHighlightPerson(null), 4000);
                }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 10.5, color: "var(--text-primary)" }}>{name}</span>
                  <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{p.role}</span>
                </div>
              ))}
            </div>}
            {searchResults.connections.length > 0 && <div style={{ padding: "6px 10px" }}>
              <div style={{ fontSize: 8, color: "#30D158", fontWeight: 600, marginBottom: 4 }}>YOUR CONNECTIONS</div>
              {searchResults.connections.map((m, i) => (
                <div key={i} onClick={() => { setSel(m.company); setPanel("graph"); setTab("network"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 9 }}>{US[m.status]?.i}</span>
                  <span style={{ fontSize: 10.5, color: "var(--text-primary)" }}>{m.company.name}</span>
                  {m.contact_name && <span style={{ fontSize: 8, color: "var(--footer-text)" }}>· {m.contact_name}</span>}
                </div>
              ))}
            </div>}
            {searchResults.companies.length === 0 && searchResults.people.length === 0 && searchResults.connections.length === 0 &&
              <div style={{ padding: 12, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>No results</div>}
          </div>}
        </div>
        
        {!isMobile && <button onClick={() => setShowFeedback(true)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>💬</button>}
        {!isMobile && <button onClick={() => setPanel("score")} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: panel === "score" ? "rgba(255,215,0,0.1)" : "transparent", color: "var(--warning)", fontSize: 14, height: 36, cursor: "pointer", fontFamily: "var(--font-body)" }}>🏆{score.score > 0 ? ` ${score.score}` : ""}</button>}
        {!isMobile &&
          <button onClick={() => { setShowMyNet(!showMyNet); if (panel !== "graph") setPanel("graph"); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${showMyNet ? "var(--success)" : "var(--border)"}`, background: showMyNet ? "rgba(48,209,88,0.1)" : "transparent", color: showMyNet ? "var(--success)" : "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>🤝</button>
        }
        {/* Auth — desktop only */}
        {!isMobile && (user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", fontSize: 12, color: "var(--footer-text)", fontFamily: "var(--font-body)", height: 36, boxSizing: "border-box", display: "flex", alignItems: "center" }}>👤 {profile?.username || user.email}</div>
            <button onClick={signOut} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>Sign out</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setAuthMode("login")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--footer-text)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>Log in</button>
            <button onClick={() => setAuthMode("signup")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--success)", background: "rgba(48,209,88,0.1)", color: "var(--success)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>Sign up</button>
          </div>
        ))}
        {/* Mobile hamburger */}
        {isMobile && <button onClick={() => setMobileMenuOpen(o => !o)} style={{ width: 44, height: 44, borderRadius: 6, border: "1px solid var(--border)", background: mobileMenuOpen ? "var(--accent)" : "transparent", color: mobileMenuOpen ? "#fff" : "var(--text-secondary)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "var(--font-body)" }}>{mobileMenuOpen ? "✕" : "☰"}</button>}
      </div>

      {/* ── MOBILE NAV OVERLAY ────────────────────────────────────── */}
      {isMobile && mobileMenuOpen && <div style={{ position: "fixed", inset: 0, background: "var(--bg-base)", zIndex: 1000, paddingTop: 56, overflowY: "auto" }}>
        <button onClick={() => setMobileMenuOpen(false)} style={{ position: "absolute", top: 10, right: 10, width: 44, height: 44, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        <div style={{ padding: "20px 24px" }}>
          {[["graph", "Map"], ["people", "People"], ["insights", "Insights"], ["events", "Events"], ["updates", "News"], ["bits", "Bits"]].map(([k, l]) => (
            <button key={k} onClick={() => { setPanel(k); if (k !== "graph") setSel(null); setMobileMenuOpen(false); }} style={{ display: "block", width: "100%", padding: "14px 0", border: "none", borderBottom: "1px solid var(--border)", background: "transparent", color: panel === k ? "var(--accent)" : "var(--text-primary)", fontSize: 18, fontFamily: "var(--font-display)", cursor: "pointer", textAlign: "left", fontWeight: 400 }}>{l}</button>
          ))}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            {user ? (
              <div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontFamily: "var(--font-body)" }}>👤 {profile?.username || user.email}</div>
                <button onClick={() => { signOut(); setMobileMenuOpen(false); }} style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)" }}>Sign out</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setAuthMode("login"); setMobileMenuOpen(false); }} style={{ flex: 1, padding: "10px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)" }}>Log in</button>
                <button onClick={() => { setAuthMode("signup"); setMobileMenuOpen(false); }} style={{ flex: 1, padding: "10px 16px", borderRadius: 6, border: "1px solid var(--success)", background: "rgba(48,209,88,0.1)", color: "var(--success)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)" }}>Sign up</button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
            <a href="/privacy.html" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontFamily: "var(--font-body)" }}>Privacy</a>
            <a href="/terms.html" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontFamily: "var(--font-body)" }}>Terms</a>
            <a href="https://github.com/jxi5410/AI.LDN" target="_blank" rel="noopener" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontFamily: "var(--font-body)" }}>GitHub</a>
          </div>
        </div>
      </div>}

      {/* ── AUTH MODAL ────────────────────────────────────────────── */}
      {authMode && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setAuthMode(null); setSignupSuccess(false); }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-elevated)", borderRadius: 14, padding: 24, border: "1px solid var(--border)", width: 360, maxWidth: "90vw" }}>
          {signupSuccess ? <>
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>Check your email</h2>
              <p style={{ fontSize: 10.5, color: "var(--footer-text)", lineHeight: 1.5, marginBottom: 12 }}>We've sent a confirmation link to <strong style={{ color: "var(--text-primary)" }}>{authForm.email}</strong>. Click the link in the email to activate your account.</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Didn't receive it? Check your spam folder, or try again in a few minutes.</p>
              <button onClick={() => { setAuthMode(null); setSignupSuccess(false); }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--footer-text)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-body)" }}>Close</button>
            </div>
          </> : <>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-muted)" }}>{authMode === "signup" ? "Join the LDN/ai network" : "Sign in to track your connections"}</p>
          {authError && <div style={{ padding: "6px 10px", borderRadius: 6, background: "#FF453A18", border: "1px solid #FF453A33", color: "#FF453A", fontSize: 9.5, marginBottom: 10 }}>{authError}</div>}
          {authMode === "signup" && <input type="text" placeholder="Username *" value={authForm.username} onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} style={inputStyle} />}
          <input type="email" placeholder="Email *" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          <input type="password" placeholder="Password *" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} style={inputStyle} />
          {authMode === "signup" && <>
            <input type="text" placeholder="X / Twitter handle (optional)" value={authForm.twitter} onChange={e => setAuthForm(p => ({ ...p, twitter: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="LinkedIn URL (optional)" value={authForm.linkedin} onChange={e => setAuthForm(p => ({ ...p, linkedin: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="Company (optional)" value={authForm.company} onChange={e => setAuthForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
          </>}
          <button onClick={() => handleAuth(authMode)} disabled={authLoading} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", marginTop: 4, opacity: authLoading ? 0.6 : 1 }}>
            {authLoading ? "..." : authMode === "signup" ? "Create Account" : "Sign In"}
          </button>
          <p style={{ margin: "10px 0 0", fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>
            {authMode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <span onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthError(""); setSignupSuccess(false); }} style={{ color: "#00D4FF", cursor: "pointer" }}>{authMode === "signup" ? "Log in" : "Sign up"}</span>
          </p>
          </>}
        </div>
      </div>}

      {/* ── FEEDBACK MODAL ────────────────────────────────────────── */}
      {showFeedback && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowFeedback(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-elevated)", borderRadius: 14, padding: 24, border: "1px solid var(--border)", width: 400, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>💬 Feedback</h2>
          <p style={{ margin: "0 0 14px", fontSize: 9.5, color: "var(--text-muted)" }}>Help us improve LDN/ai</p>
          {fbSubmitted ? <div style={{ padding: 20, textAlign: "center" }}><span style={{ fontSize: 28 }}>✅</span><p style={{ color: "#30D158", marginTop: 8 }}>Thank you! Feedback submitted.</p></div> : <>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["feature", "bug", "data", "general"].map(c => (
                <button key={c} onClick={() => setFbForm(p => ({ ...p, category: c }))} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${fbForm.category === c ? "#30D158" : "#e8e5dc"}`, background: fbForm.category === c ? "#30D15818" : "transparent", color: fbForm.category === c ? "#30D158" : "#64748B", fontSize: 9, cursor: "pointer", fontFamily: "var(--font-body)", textTransform: "capitalize" }}>{c}</button>
              ))}
            </div>
            <textarea value={fbForm.message} onChange={e => setFbForm(p => ({ ...p, message: e.target.value }))} placeholder="What would you like to see improved?" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <button onClick={submitFeedback} disabled={!fbForm.message.trim()} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", opacity: fbForm.message.trim() ? 1 : 0.4 }}>Submit Feedback</button>
          </>}
          {/* My feedback history */}
          {myFeedback.length > 0 && <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>YOUR FEEDBACK HISTORY</div>
            {myFeedback.map(fb => (
              <div key={fb.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--bg-sunken)" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: fb.status === "resolved" ? "#30D15818" : fb.status === "in_progress" ? "#FFD60A18" : "#e8e5dc", color: fb.status === "resolved" ? "#30D158" : fb.status === "in_progress" ? "#FFD60A" : "#64748B", textTransform: "uppercase" }}>{fb.status}</span>
                  <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{fb.category}</span>
                  <span style={{ fontSize: 7.5, color: "var(--text-faint)" }}>{new Date(fb.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{fb.message}</div>
                {fb.admin_response && <div style={{ fontSize: 9.5, color: "#30D158", marginTop: 3, padding: "3px 6px", background: "#30D15810", borderRadius: 4 }}>↳ {fb.admin_response}</div>}
              </div>
            ))}
          </div>}
        </div>
      </div>}

      {/* ── LEFT SIDEBAR (graph) ──────────────────────────────────── */}
      {panel === "graph" && !isMobile && <div style={{ position: "absolute", top: headerHeight + 10, left: 6, zIndex: 20000, background: "var(--bg-elevated)", borderRadius: 10, padding: "10px", border: "1px solid var(--border)", maxHeight: `calc(100vh - ${headerHeight + 16}px)`, overflowY: "auto", width: 220, flex: "0 0 220px" }}>
        {/* Segmented control */}
        <div style={{ display: "flex", gap: 0, marginBottom: 8, background: "var(--bg-sunken)", borderRadius: 6, padding: 2 }}>
          {[["companies", "Companies"], ["investors", "Investors"]].map(([k, l]) => (
            <button key={k} onClick={() => {
              setMapView(k);
              if (k === "investors") { setCats(prev => new Set([...prev, "investor"])); }
              else { setCats(prev => { const n = new Set(prev); n.delete("investor"); return n; }); }
            }} style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "none", background: mapView === k ? "var(--bg-elevated)" : "transparent", color: mapView === k ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: mapView === k ? 600 : 400, transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>
        {/* All/None links */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8, paddingLeft: 2 }}>
          <span onClick={() => setCats(new Set(mapView === "companies" ? Object.keys(CC).filter(k => k !== "investor") : Object.keys(CC)))} style={{ fontSize: 11, color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)" }}>All</span>
          <span onClick={() => setCats(mapView === "investors" ? new Set(["investor"]) : new Set())} style={{ fontSize: 11, color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)" }}>None</span>
        </div>
        {Object.entries(CC).map(([k, cfg]) => (
          <div key={k} onClick={() => tc(k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 4, cursor: "pointer", opacity: cats.has(k) ? 1 : 0.35, transition: "all 0.15s" }}
            onMouseEnter={e => { if (cats.has(k)) e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: cfg.c, flexShrink: 0 }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${cats.has(k) ? "var(--success)" : "var(--border)"}`, background: cats.has(k) ? "var(--success)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {cats.has(k) && <svg width="8" height="8" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1, fontFamily: "var(--font-body)", fontWeight: 500 }}>{cfg.l}</span>
            <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)", background: "var(--bg-sunken)", padding: "1px 6px", borderRadius: 10 }}>{companies.filter(c => c.cat === k).length}</span>
          </div>
        ))}
      </div>}

      {/* ── MOBILE FILTER BUTTON + DRAWER ──────────────────────── */}
      {panel === "graph" && isMobile && <>
        <button onClick={() => setMobileFiltersOpen(o => !o)} style={{ position: "fixed", top: headerHeight + 6, left: 8, zIndex: 20001, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: mobileFiltersOpen ? "var(--accent)" : "rgba(255,255,255,0.95)", color: mobileFiltersOpen ? "#fff" : "var(--text-secondary)", fontSize: 12, fontFamily: "var(--font-body)", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 14 }}>☰</span> Filters
        </button>
        {mobileFiltersOpen && <>
          {/* Backdrop — tap to dismiss */}
          <div onClick={() => setMobileFiltersOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20001, background: "rgba(0,0,0,0.15)" }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20002, background: "rgba(255,255,255,0.97)", borderTop: "1px solid var(--border)", borderRadius: "14px 14px 0 0", padding: "10px 14px 20px", backdropFilter: "blur(14px)", maxHeight: "60vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ width: 36, height: 4, background: "#d1d1cc", borderRadius: 2 }} />
            <button onClick={() => setMobileFiltersOpen(false)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg-sunken)", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "var(--font-body)", lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[["companies", "Companies"], ["investors", "Investors"]].map(([k, l]) => (
              <button key={k} onClick={() => {
                setMapView(k);
                if (k === "investors") { setCats(prev => new Set([...prev, "investor"])); }
                else { setCats(prev => { const n = new Set(prev); n.delete("investor"); return n; }); }
              }} style={{ flex: 1, padding: "6px", borderRadius: 6, border: `1px solid ${mapView === k ? "#C15F3C" : "#e8e5dc"}`, background: mapView === k ? "#C15F3C18" : "transparent", color: mapView === k ? "#C15F3C" : "#8a8a85", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: mapView === k ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[["All", () => setCats(new Set(mapView === "companies" ? Object.keys(CC).filter(k => k !== "investor") : Object.keys(CC)))], ["None", () => setCats(mapView === "investors" ? new Set(["investor"]) : new Set())]].map(([l, fn]) => (
              <button key={l} onClick={fn} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>{l}</button>
            ))}
          </div>
          {Object.entries(CC).map(([k, cfg]) => (
            <div key={k} onClick={() => tc(k)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 6, cursor: "pointer", opacity: cats.has(k) ? 1 : 0.3 }}>
              <span style={{ fontSize: 18, width: 20, textAlign: "center", color: cats.has(k) ? "#30D158" : "#ccc" }}>{cats.has(k) ? "✓" : ""}</span>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: cfg.c, flexShrink: 0 }} />
              <span style={{ fontSize: 15, color: "var(--text-secondary)", flex: 1 }}>{cfg.l}</span>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{companies.filter(c => c.cat === k).length}</span>
            </div>
          ))}
        </div>
        </>}
      </>}

      {/* ── LONDON MAP ────────────────────────────────────────────── */}
      {panel === "graph" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, zIndex: 5 }}><LondonMap companies={filt} edges={fEdges} onSelect={(c) => { setSel(c); setTab("info"); }} selected={sel} userConnections={ud} isMobile={isMobile} mapView={mapView} /></div>}

      {/* ── UPDATES PANEL ────────────────────────────────────────── */}
      {/* ── INSIGHTS PANEL ────────────────────────────────────────── */}
      {panel === "bits" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, overflowY: "auto", paddingBottom: isMobile ? 40 : 130, background: "var(--bg-base)", ...panelTransition }}>
        {/* Subtitle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 20px 12px" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-body)" }}>Data, charts, ecosystem signals, and curated reads from London's AI scene</p>
          <a href="https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api" target="_blank" rel="noopener" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontWeight: 500, whiteSpace: "nowrap" }}>API Docs →</a>
        </div>
        {/* Admin scrape button */}
        {user?.id === ADMIN_UID && <div style={{ padding: "6px 20px 0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={async () => {
            setBitsLoading(true);
            try {
              const res = await fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=scrape", { method: "POST" });
              const d = await res.json();
              alert(`Scraped: ${d.found || 0} found, ${d.inserted || 0} inserted${d.error ? ". Error: " + d.error : ""}`);
              setBitsFetched(false);
            } catch (e) { alert("Scrape failed: " + e.message); }
            setBitsLoading(false);
          }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--accent)", background: "var(--accent-bg)", color: "var(--accent)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 600 }}>🔍 Scrape</button>
        </div>}
        {/* Insights section */}
        <InsightsPanel isMobile={isMobile} />
        {/* Curated bits below */}
        <div style={{ padding: isMobile ? "0 12px 20px" : "0 20px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "8px 0 10px", paddingTop: 12, borderTop: "1px solid var(--border)" }}>Curated Reads</div>
          {bitsLoading ? <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Loading...</div> :
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 10 }}>
            {bits.filter(b => user?.id === ADMIN_UID ? true : !b._pending).map((bit, i) => {
              const typeConfig = { tweet: { icon: "𝕏", c: "#1DA1F2" }, article: { icon: "📰", c: "#30D158" }, chart: { icon: "📊", c: "#BF5AF2" }, podcast: { icon: "🎙️", c: "#FF9F0A" }, video: { icon: "🎬", c: "#FF2D55" }, data: { icon: "📈", c: "#BF5AF2" } };
              const tc = typeConfig[bit.type] || { icon: "⚡", c: "var(--accent)" };
              return (
                <div key={bit.id || i} style={{ background: "var(--bg-elevated)", borderRadius: 10, border: `1px solid ${bit._pending ? "#FF9F0A50" : "#e8e5dc"}`, padding: 14 }}>
                  {bit._pending && <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#FF9F0A18", color: "#FF9F0A", fontWeight: 600 }}>PENDING</span>
                    {bit.ai_relevance_score && <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>{(bit.ai_relevance_score * 100).toFixed(0)}%</span>}
                  </div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 13 }}>{tc.icon}</span>
                      <span style={{ fontSize: 10, color: tc.c, fontWeight: 600, textTransform: "uppercase" }}>{bit.type}</span>
                      {bit.date && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(bit.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                    </div>
                    {bit.engagement && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{bit.engagement}</span>}
                  </div>
                  <h3 style={{ margin: "0 0 3px", fontSize: 14, fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{bit.title}</h3>
                  {bit.description && <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 5px" }}>{bit.description.replace(/<[^>]*>/g, "")}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    {bit.author && <span style={{ fontSize: 10, color: "var(--footer-text)" }}>{bit.author}</span>}
                    {bit.source && <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{bit.source}</span>}
                  </div>
                  {bit.tags?.length > 0 && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
                    {bit.tags.map((t, j) => <span key={j} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: t === "londonmaxxing" ? "#C15F3C18" : "#f0ede8", color: t === "londonmaxxing" ? "#C15F3C" : "#6b6b66", fontWeight: t === "londonmaxxing" ? 600 : 400 }}>{t}</span>)}
                  </div>}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {bit.url && <a href={bit.url} target="_blank" rel="noopener" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>View →</a>}
                    {bit._pending && user?.id === ADMIN_UID && <>
                      <div style={{ flex: 1 }} />
                      <button onClick={async () => {
                        await fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bit.id }) });
                        setBits(prev => prev.map(b => b.id === bit.id ? { ...b, _pending: false } : b));
                      }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>✓</button>
                      <button onClick={async () => {
                        await fetch("https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/bits?action=reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bit.id }) });
                        setBits(prev => prev.filter(b => b.id !== bit.id));
                      }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #FF453A", background: "#FF453A18", color: "#FF453A", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>✕</button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      </div>}

      {/* ── NEWS ──────────────────────────────────────────────────── */}
      {panel === "updates" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, paddingBottom: isMobile ? 40 : 130, background: "var(--bg-base)", display: "flex", flexDirection: "column", ...panelTransition }}>
        {/* Sticky header with subtitle + filter buttons */}
        <div style={{ padding: isMobile ? "8px 12px" : "8px 20px", background: "var(--bg-base)", borderBottom: "1px solid var(--border)", flexShrink: 0, zIndex: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "10px 0 12px" }}>Funding, acquisitions, people moves, milestones, interviews</p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {Object.entries(UPDATE_TYPES).map(([k, cfg]) => (
              <button key={k} onClick={() => setUpdateFilter(k)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${updateFilter === k ? cfg.c : "#e8e5dc"}`, background: updateFilter === k ? cfg.c + "18" : "transparent", color: updateFilter === k ? cfg.c : "#8a8a85", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: updateFilter === k ? 600 : (k === "regulation" ? 700 : 400), letterSpacing: k === "regulation" ? 0.3 : 0 }}>{cfg.label}</button>
            ))}
          </div>
        </div>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
        {updateFilter === "regulation" ? (
          /* ── AI REGULATION SECTION ── */
          <div style={{ padding: isMobile ? "12px" : "16px 20px" }}>
            <div style={{ background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)", padding: isMobile ? "12px 10px" : "16px 18px", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "var(--text-secondary)" }}>🏛️ UK AI Regulation</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>The UK is charting a distinct path — pro-innovation, sector-specific, and deliberately avoiding the EU's prescriptive model</p>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
                <p style={{ margin: "0 0 10px" }}>The UK government has opted against comprehensive AI legislation, instead relying on <strong style={{ color: "var(--text-primary)" }}>existing regulators</strong> (FCA, ICO, CMA, Ofcom) to apply five cross-sector principles: safety, transparency, fairness, accountability, and contestability. A dedicated <strong style={{ color: "var(--text-primary)" }}>UK AI Bill</strong> is expected no earlier than H2 2026.</p>
                <p style={{ margin: "0 0 10px" }}>The government is betting heavily on <strong style={{ color: "var(--text-primary)" }}>AI Growth Zones</strong>, <strong style={{ color: "var(--text-primary)" }}>AI Growth Labs</strong> (regulatory sandboxes), and the <strong style={{ color: "var(--text-primary)" }}>£500M Sovereign AI fund</strong> (launching April 2026, chaired by Balderton's James Wise) to attract investment — £40B+ in private commitments in 2025 alone.</p>
                <p style={{ margin: 0 }}>The tension is real. Creative industries want mandatory licensing of copyrighted works for AI training. AI developers want broad exceptions. The government's copyright impact assessment is due by <strong style={{ color: "var(--text-primary)" }}>18 March 2026</strong>.</p>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Regulatory Timeline</div>
              <div style={{ borderLeft: "2px solid #6a9bcc44", paddingLeft: 12, marginBottom: 14 }}>
                {[
                  { date: "H2 2026", text: "UK AI Bill expected — frontier AI models, copyright, possibly new AI regulatory body", highlight: true, src: "https://www.taylorwessing.com/en/interface/2025/predictions-2026/uk-tech-and-digital-regulatory-policy-in-2026" },
                  { date: "Apr 2026", text: "UK Sovereign AI Unit launches £500M fund (chaired by James Wise of Balderton)", highlight: true, src: "https://sovereignai.gov.uk/" },
                  { date: "Mar 2026", text: "Government due to publish AI copyright impact assessment — pivotal decision point", highlight: true, src: "https://www.osborneclarke.com/insights/regulatory-outlook-february-2026-artificial-intelligence" },
                  { date: "Feb 2026", text: "Deepfake intimate images criminalised. Automated decision-making rules relaxed", src: "https://www.osborneclarke.com/insights/regulatory-outlook-february-2026-artificial-intelligence" },
                  { date: "Dec 2025", text: "Copyright consultation: majority favour mandatory licensing", src: "https://www.osborneclarke.com/insights/regulatory-outlook-january-2026-artificial-intelligence" },
                  { date: "Nov 2025", text: "£24B+ private AI investment committed in a single month", src: "https://www.gov.uk/government/news/ai-to-power-national-renewal-as-government-announces-billions-of-additional-investment-and-new-plans-to-boost-uk-businesses-jobs-and-innovation" },
                  { date: "Nov 2025", text: "Getty v Stability AI dismissed in UK High Court", src: "https://www.kslaw.com/news-and-insights/eu-uk-ai-round-up-december-2025" },
                  { date: "Oct 2025", text: "MI5 warns of 'potential future risks from autonomous AI systems'", src: "https://lordslibrary.parliament.uk/potential-future-risks-from-autonomous-ai-systems/" },
                  { date: "Oct 2025", text: "Government proposes AI Growth Labs — regulatory sandboxes", src: "https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-united-kingdom" },
                  { date: "Jun 2025", text: "Hassabis calls for 'smart regulation' at SXSW London", src: "https://www.cityam.com/ai-regulation-needs-to-be-smarter-in-the-uk-urges-deepmind-boss/" },
                  { date: "Jun 2025", text: "UK AI Bill delayed until H2 2026. Data Use and Access Act passes", src: "https://www.moorebarlow.com/blog/ai-regulation-in-the-uk-september-2025-update/" },
                  { date: "Nov 2023", text: "Bletchley Park AI Safety Summit. Ian Hogarth chairs AI Safety Institute", src: "https://www.gov.uk/government/publications/international-ai-safety-report-2025" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                    <div style={{ flexShrink: 0, fontSize: 11, color: item.highlight ? "#6a9bcc" : "var(--text-muted)", fontWeight: 600, minWidth: isMobile ? 65 : 95 }}>{item.date}</div>
                    <div style={{ flex: 1, fontSize: 13, color: item.highlight ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.5 }}>{item.text}{item.src && <>{" "}<a href={item.src} target="_blank" rel="noopener" style={{ fontSize: 10, color: "#6a9bcc", textDecoration: "none" }}>📄</a></>}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Key Voices</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { name: "Demis Hassabis", role: "CEO, Google DeepMind", view: "Pro 'smart regulation' — warns against 'move fast and break things' for AI." },
                  { name: "Ian Hogarth", role: "Chair, AI Safety Institute", view: "Coined 'compute governance'. Leads UK frontier AI evaluation." },
                  { name: "Dario Amodei", role: "CEO, Anthropic", view: "Supports targeted frontier model regulation. 'Constitutional AI' as self-regulation." },
                  { name: "Connor Leahy", role: "CEO, Conjecture", view: "Strongest safety hawk. Warns of existential risk. Advocates compute caps." },
                ].map((v, i) => (
                  <div key={i} style={{ background: "var(--bg-sunken)", borderRadius: 6, padding: "8px 10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{v.role}</div>
                    <div style={{ fontSize: 12, color: "var(--footer-text)", lineHeight: 1.5 }}>{v.view}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isMobile ? (
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
                  <div style={{ position: "absolute", left: -23, top: 14, width: 12, height: 12, borderRadius: "50%", background: tc.c, border: "3px solid var(--bg-base)", outline: `2px solid ${tc.c}50`, zIndex: 2 }} />
                  <div style={{ position: "absolute", left: -11, top: 19, width: 11, height: 2, background: tc.c + "60" }} />
                  <div style={{ background: "var(--bg-elevated)", borderRadius: 10, border: `1px solid ${tc.c}30`, borderLeft: `3px solid ${tc.c}`, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: tc.c, fontWeight: 600, textTransform: "uppercase" }}>{tc.label}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 6 }}>{u.text}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {co && <span onClick={() => { setSel(co); setPanel("graph"); setTab("info"); }} style={{ fontSize: 11, color: CC[co.cat]?.c || "#666", cursor: "pointer" }}>{CC[co.cat]?.i} {co.name} →</span>}
                      {u.link && <a href={u.link} target="_blank" rel="noopener" style={{ fontSize: 10, color: "var(--text-muted)", textDecoration: "none" }}>Source →</a>}
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
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--bg-sunken)" }}>
                  <div style={{ flexShrink: 0, width: 90 }}>
                    <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{u.date}</div>
                    <div style={{ fontSize: 10, color: tc.c, textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>{tc.label}</div>
                  </div>
                  <div style={{ width: 3, borderRadius: 2, background: tc.c, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, color: "var(--text-primary)", lineHeight: 1.5 }}>{u.text}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                      {co && <span onClick={() => { setSel(co); setPanel("graph"); setTab("info"); }} style={{ fontSize: 12, color: CC[co.cat]?.c || "#666", cursor: "pointer" }}>{CC[co.cat]?.i} {co.name} →</span>}
                      {u.link && <a href={u.link} target="_blank" rel="noopener" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}>📰 Source →</a>}
                      {u.type === "interview" && u.link && <UpdateSummariseBtn url={u.link} label={u.text} person={u.text.split(" on ")[0] || ""} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>}

      {/* ── PEOPLE PANEL (collapsible categories) ─────────────────── */}
      {panel === "people" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", paddingBottom: isMobile ? 40 : 130, background: "var(--bg-base)", ...panelTransition }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "10px 0 12px" }}>Founders, CEOs, investors, and leaders</p>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => { const allCats = new Set(); Object.values(PEOPLE).forEach(p => { const co = companies.find(c => p.co.includes(c.id)); if (co) allCats.add(co.cat); }); setOpenCats(allCats); setAllPeopleOpen(true); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>Expand All</button>
            <button onClick={() => { setOpenCats(new Set()); setAllPeopleOpen(false); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", height: 36 }}>Collapse All</button>
          </div>
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
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "var(--bg-elevated)", border: `1px solid ${isOpen ? cfg.c + "40" : "#e8e5dc"}`, cursor: "pointer", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 18 }}>{cfg.i}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: cfg.c }}>{cfg.l}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{people.length} {people.length === 1 ? "person" : "people"}</span>
                  </div>
                  <span style={{ fontSize: 14, color: "var(--text-muted)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                </div>
                {/* People cards — collapsible */}
                <div style={{ maxHeight: isOpen ? people.length * 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease-in-out" }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 8, padding: "8px 0" }}>
                    {people.map(([name, p]) => {
                      const isStarred = stars.has(`person:${name}`);
                      const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
                      const coObj = companies.find(c => p.co.includes(c.id));
                      const accentColor = CC[coObj?.cat]?.c || "#C15F3C";
                      // Try to get avatar from X handle
                      const xHandle = p.tw ? p.tw.replace(/https?:\/\/(x|twitter)\.com\//,"").replace(/\//g,"") : null;
                      const avatarUrl = xHandle ? `https://unavatar.io/x/${xHandle}` : null;
                      return (
                        <div key={name} id={`person-${name.replace(/\s+/g, "-")}`} style={{ background: highlightPerson === name ? "#fff3e0" : "var(--bg-elevated)", borderRadius: 10, padding: "14px", border: `1px solid ${highlightPerson === name ? "#C15F3C" : "#e8e5dc"}`, transition: "all 0.3s ease", borderTop: `3px solid ${accentColor}30` }}>
                          <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                            {/* Avatar — photo or initials fallback */}
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${accentColor}30`, overflow: "hidden", position: "relative" }}>
                              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} /> : null}
                              <span style={{ fontSize: 14, fontWeight: 700, color: accentColor, display: avatarUrl ? "none" : "flex", position: avatarUrl ? "absolute" : "static", inset: 0, alignItems: "center", justifyContent: "center" }}>{initials}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 700 }}>{name}</div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{p.role}</div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <span onClick={() => toggleStar("person", name)} style={{ cursor: "pointer" }}><StarIcon filled={isStarred} /></span>
                              {p.tw && <a href={p.tw} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 5, background: "#2a2a28", border: "1px solid #333" }}><XIcon size={12} /></a>}
                              {p.li && <a href={p.li} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 5, background: "#0A66C2" }}><LIIcon size={12} /></a>}
                            </div>
                          </div>
                          {/* Company tags with logos */}
                          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                            {p.co.map(cid => {
                              const co2 = companies.find(c => c.id === cid);
                              if (!co2) return null;
                              // Extract domain from jobs URL for logo
                              let logoDomain = null;
                              try { if (co2.jobs) logoDomain = new URL(co2.jobs).hostname.replace("www.","").replace("jobs.ashbyhq.com","").replace("job-boards.eu.greenhouse.io",""); } catch {}
                              // Manual domain overrides for common cases
                              const domainMap = { deepmind: "deepmind.google", anthropic: "anthropic.com", openai: "openai.com", mistral: "mistral.ai", cohere: "cohere.com", "meta-ai": "meta.com", "ms-research": "microsoft.com", stability: "stability.ai", elevenlabs: "elevenlabs.io", synthesia: "synthesia.io", wayve: "wayve.ai", isomorphic: "isomorphiclabs.com", helsing: "helsing.ai", darktrace: "darktrace.com", nscale: "nscale.com", graphcore: "graphcore.ai", polyai: "poly.ai", tractable: "tractable.ai", cleo: "meetcleo.com", onfido: "onfido.com", "signal-ai": "signal-ai.com", callosum: "callosum.com", "mozart-ai": "mozartai.com", trace: "trace.so", balderton: "balderton.com", atomico: "atomico.com", sequoia: "sequoiacap.com", accel: "accel.com", "air-street": "airstreet.com", plural: "plural.vc", localglobe: "localglobe.vc", index: "indexventures.com", gv: "gv.com", mmc: "mmc.vc", seedcamp: "seedcamp.com", ef: "joinef.com", "sovereign-ai": "sovereignai.gov.uk" };
                              const domain = domainMap[co2.id] || logoDomain;
                              const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;
                              return (
                                <span key={cid} onClick={() => { setSel(co2); setPanel("graph"); setTab("info"); }} style={{ fontSize: 11, color: CC[co2.cat]?.c, cursor: "pointer", padding: "3px 8px", borderRadius: 5, background: (CC[co2.cat]?.c || "#666") + "15", fontWeight: 600, border: `1px solid ${(CC[co2.cat]?.c || "#666")}25`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  {logoUrl && <img src={logoUrl} alt="" style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />}
                                  {co2.s || co2.name}
                                </span>
                              );
                            })}
                          </div>
                          {/* Portfolio investments for investor-linked people */}
                          {(() => {
                            const investorCos = p.co.filter(cid => { const c = companies.find(x => x.id === cid); return c?.cat === "investor"; });
                            if (investorCos.length === 0) return null;
                            const portfolioCos = edges.filter(e => e.ty === "investment" && investorCos.includes(e.s)).map(e => companies.find(c => c.id === e.t)).filter(Boolean);
                            if (portfolioCos.length === 0) return null;
                            return (
                              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--bg-sunken)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Portfolio ({portfolioCos.length})</div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {portfolioCos.slice(0, 12).map(co2 => {
                                    const domMap = { deepmind: "deepmind.google", anthropic: "anthropic.com", openai: "openai.com", mistral: "mistral.ai", cohere: "cohere.com", stability: "stability.ai", elevenlabs: "elevenlabs.io", synthesia: "synthesia.io", wayve: "wayve.ai", isomorphic: "isomorphiclabs.com", helsing: "helsing.ai", darktrace: "darktrace.com", nscale: "nscale.com", graphcore: "graphcore.ai", polyai: "poly.ai", tractable: "tractable.ai", faculty: "faculty.ai", "signal-ai": "signal-ai.com", physicsx: "physicsx.ai", healx: "healx.io", encord: "encord.com", "holistic-ai": "holisticai.com", "robin-ai": "robin.ai", condukt: "condukt.ai", blackwall: "blackwall.ai", nexcade: "nexcade.ai", "peak-ai": "peak.ai" };
                                    const logoUrl = domMap[co2.id] ? `https://logo.clearbit.com/${domMap[co2.id]}` : null;
                                    return (
                                      <span key={co2.id} onClick={() => setPeoplePeek(co2)} style={{ fontSize: 10, color: "#5a5a55", cursor: "pointer", padding: "2px 6px", borderRadius: 4, background: "var(--bg-sunken)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                        {logoUrl && <img src={logoUrl} alt="" style={{ width: 12, height: 12, borderRadius: 2, objectFit: "contain" }} onError={e => e.target.style.display="none"} />}
                                        {co2.s || co2.name}
                                      </span>
                                    );
                                  })}
                                  {portfolioCos.length > 12 && <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 4px" }}>+{portfolioCos.length - 12}</span>}
                                </div>
                              </div>
                            );
                          })()}
                          {p.pods && p.pods.length > 0 && <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--bg-sunken)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Interviews & Podcasts</div>
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
        {/* ── INLINE COMPANY PEEK CARD (stays in People panel) ─── */}
        {peoplePeek && (() => {
          const pk = peoplePeek;
          const pkColor = CC[pk.cat]?.c || "#666";
          const pkEdges = edges.filter(e => e.s === pk.id || e.t === pk.id);
          const pkRelPeople = Object.entries(PEOPLE).filter(([, p]) => p.co.includes(pk.id));
          const domainMap = { deepmind: "deepmind.google", anthropic: "anthropic.com", openai: "openai.com", mistral: "mistral.ai", cohere: "cohere.com", stability: "stability.ai", elevenlabs: "elevenlabs.io", synthesia: "synthesia.io", wayve: "wayve.ai", isomorphic: "isomorphiclabs.com", helsing: "helsing.ai", darktrace: "darktrace.com", nscale: "nscale.com", graphcore: "graphcore.ai", polyai: "poly.ai", tractable: "tractable.ai", faculty: "faculty.ai", "signal-ai": "signal-ai.com", physicsx: "physicsx.ai", healx: "healx.io", encord: "encord.com", "holistic-ai": "holisticai.com", "robin-ai": "robin.ai", condukt: "condukt.ai", blackwall: "blackwall.ai", nexcade: "nexcade.ai", "peak-ai": "peak.ai", balderton: "balderton.com", atomico: "atomico.com", accel: "accel.com", mmc: "mmc.vc", seedcamp: "seedcamp.com", localglobe: "localglobe.vc", plural: "plural.vc", index: "indexventures.com", gv: "gv.com" };
          const pkLogo = domainMap[pk.id] ? `https://logo.clearbit.com/${domainMap[pk.id]}` : null;
          return (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999, background: "rgba(26,26,24,0.45)", backdropFilter: "blur(4px)", top: headerHeight, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setPeoplePeek(null); }}>
              <div style={{ background: "var(--bg-base)", borderRadius: "16px 16px 0 0", maxWidth: 480, width: "100%", maxHeight: "75vh", overflowY: "auto", border: "1px solid var(--border)", borderBottom: "none" }}>
                {/* Header */}
                <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-base)", borderRadius: "16px 16px 0 0", zIndex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
                      {pkLogo && <img src={pkLogo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain", border: "1px solid var(--border)" }} onError={e => e.target.style.display = "none"} />}
                      <div>
                        <span style={{ fontSize: 10, color: pkColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{CC[pk.cat]?.i} {CC[pk.cat]?.l}</span>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{pk.name}</h3>
                      </div>
                    </div>
                    <button onClick={() => setPeoplePeek(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}>✕</button>
                  </div>
                  {pk.hq && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>📍 {pk.hq}</p>}
                </div>
                {/* Body */}
                <div style={{ padding: "12px 16px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                    {pk.fund && <M l="Funding" v={pk.fund} />}{pk.val && <M l="Valuation" v={pk.val} />}{pk.emp && <M l="Team" v={pk.emp} />}{pk.yr && <M l="Founded" v={pk.yr} />}
                  </div>
                  {pk.focus && <S t="Focus" v={pk.focus} />}
                  {pk.clients && <S t="Clients & Markets" v={pk.clients} />}
                  {pk.ethos && <S t="Ethos" v={pk.ethos} />}
                  {pk.founders && <S t="Founders" v={pk.founders} />}
                  {pk.ms && <S t="Milestones" v={pk.ms} />}
                  {pk.jobs && <a href={pk.jobs} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "var(--border)", color: "var(--text-primary)", fontSize: 9.5, textDecoration: "none", fontFamily: "var(--font-body)", border: "1px solid var(--border-strong)", marginTop: 4 }}>🔗 Careers →</a>}
                  {/* Connected people */}
                  {pkRelPeople.length > 0 && <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>People ({pkRelPeople.length})</div>
                    {pkRelPeople.map(([pName, pData]) => (
                      <div key={pName} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12 }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{pName}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{pData.role}</span>
                      </div>
                    ))}
                  </div>}
                  {/* Connections */}
                  {pkEdges.length > 0 && <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Connections ({pkEdges.length})</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {pkEdges.slice(0, 15).map((e, i) => {
                        const oid = e.s === pk.id ? e.t : e.s;
                        const o = companies.find(c => c.id === oid);
                        if (!o) return null;
                        return (<span key={i} onClick={() => setPeoplePeek(o)} style={{ fontSize: 10, color: "#5a5a55", cursor: "pointer", padding: "2px 6px", borderRadius: 4, background: "var(--bg-sunken)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {domainMap[o.id] && <img src={`https://logo.clearbit.com/${domainMap[o.id]}`} alt="" style={{ width: 11, height: 11, borderRadius: 2 }} onError={e2 => e2.target.style.display="none"} />}
                          {o.s || o.name}
                          <span style={{ fontSize: 8, color: "var(--text-faint)" }}>{e.ty}</span>
                        </span>);
                      })}
                    </div>
                  </div>}
                  {/* Go to Map button */}
                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <button onClick={() => { setSel(pk); setPanel("graph"); setTab("info"); setPeoplePeek(null); }} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500 }}>🌌 View on Map</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>}

      {/* ── INSIGHTS PANEL ───────────────────────────────────────── */}
      {panel === "insights" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", paddingBottom: isMobile ? 40 : 130, background: "var(--bg-base)", ...panelTransition }}>
        {insightsLoading ? <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(320px,1fr))", gap: 10, marginTop: 14 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div> :
        !selectedInsight ? <>
          {/* ── VERTICAL SECTOR ANALYSIS ── */}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--text-primary)", margin: "14px 0 4px" }}>Vertical Sector Analysis</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", fontFamily: "var(--font-body)" }}>What problems they solve, what's working, what's not, and where the gaps are · <span style={{ fontStyle: "italic" }}>AI-assisted</span></p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
            {insights.map((ins, insIdx) => {
              const sectorCos = companies.filter(c => (ins.company_ids || []).includes(c.id));
              return (
                <div key={ins.id} onClick={() => { setSelectedInsight(ins); setInsightAnswer(""); setInsightAsk(""); }} style={{ background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", padding: 14, cursor: "pointer", transition: "transform 0.15s, border-color 0.15s", animation: `staggerFadeIn 400ms ease ${insIdx * 80}ms both` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{ins.icon}</span>
                    <span style={{ fontWeight: 400, color: "var(--text-primary)", fontSize: 18, fontFamily: "var(--font-display)" }}>{ins.title}</span>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{ins.the_problem || ""}</p>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {sectorCos.slice(0, 5).map(c => <span key={c.id} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--bg-sunken)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{c.name}</span>)}
                    {sectorCos.length > 5 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--bg-sunken)", color: "var(--text-faint)", fontFamily: "var(--font-body)" }}>+{sectorCos.length - 5}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── RESEARCH & ARTICLES ── */}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--text-primary)", margin: "28px 0 4px", borderTop: "2px solid var(--border)", paddingTop: 20 }}>Research & Articles</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", fontFamily: "var(--font-body)" }}>In-depth analysis of London's AI ecosystem</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
            {[
              { href: "/ecosystem/", title: "The London AI Ecosystem in 2026", desc: "Complete guide: 74 companies, 20 investors, $37B+ funding across 7 sectors", meta: "Pillar page" },
              { href: "/insights/fifteen-papers.html", title: "Fifteen Papers That Built Modern AI", desc: "The paradigm-defining papers behind everything — told through the people, not the proofs", meta: "16 Mar 2026 · 5 min read" },
              { href: "/insights/londonmaxxing.html", title: "Londonmaxxing: The Data", desc: "Why the meme is backed by real numbers — funding, unicorns, infrastructure", meta: "Analysis" },
              { href: "/insights/unicorns.html", title: "London AI Unicorns", desc: "Every billion-dollar AI company: nScale, ElevenLabs, Wayve, Helsing, Synthesia", meta: "Analysis" },
              { href: "/insights/funding.html", title: "$37B Funding Analysis", desc: "Where London AI funding actually goes — largest rounds, sector breakdown", meta: "Analysis" },
              { href: "/insights/compare.html", title: "Dealroom vs Beauhurst vs LDN/ai", desc: "How LDN/ai compares to paid platforms for London AI data", meta: "Comparison" },
            ].map(a => <a key={a.href} href={a.href} style={{ display: "block", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", padding: 14, textDecoration: "none", transition: "border-color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="var(--border-strong)"; e.currentTarget.querySelector('.art-title').style.color = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.querySelector('.art-title').style.color = "var(--text-primary)"; }}>
              <span className="art-title" style={{ fontWeight: 400, color: "var(--text-primary)", fontSize: 20, fontFamily: "var(--font-display)", display: "block", marginBottom: 4, transition: "color 0.15s" }}>{a.title}</span>
              <p style={{ margin: "0 0 6px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "var(--font-body)" }}>{a.desc}</p>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{a.meta}</span>
            </a>)}
          </div>

          {/* ── CHARTS (from Bits) ── */}
          {bits.filter(b => !b._pending && b.type === "chart").length > 0 && <>
            <h2 style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "28px 0 4px", borderTop: "2px solid var(--border)", paddingTop: 20 }}>Charts</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>Data visualisations from the ecosystem</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
              {bits.filter(b => !b._pending && b.type === "chart").map(bit => (
                <a key={bit.id} href={bit.url} target="_blank" rel="noopener" style={{ display: "block", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", padding: 14, textDecoration: "none", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#C15F3C"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#e8e5dc"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>📊</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)" }}>{bit.title}</span>
                  </div>
                  {bit.summary && <p style={{ margin: 0, fontSize: 12, color: "var(--footer-text)", lineHeight: 1.5 }}>{bit.summary.slice(0, 120)}...</p>}
                </a>
              ))}
            </div>
          </>}

        </> :
        /* ── EXPANDED INSIGHT ── */
        (() => {
          const ins = selectedInsight;
          if (!ins) return null;
          const sectorCos = companies.filter(c => (ins.company_ids || []).includes(c.id));
          // Bold company names in text
          const boldNames = (text) => {
            if (!text || typeof text !== "string") return text || "";
            // Collect both full names and short names, deduplicate, sort longest first
            const allNames = [...new Set(sectorCos.flatMap(c => [c.name, c.s]).filter(Boolean))].sort((a, b) => b.length - a.length);
            if (!allNames.length) return text;
            try {
              const escaped = allNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
              const re = new RegExp(`(${escaped.join("|")})`, "g");
              const parts = text.split(re);
              const nameSet = new Set(allNames);
              return parts.map((p, i) => nameSet.has(p) ? <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{p}</strong> : p);
            } catch (e) { return text; }
          };
          const sections = [
            { key: "the_problem", title: "The Problem", icon: "🎯" },
            { key: "whos_solving_it", title: "Who's Solving It", icon: "🏢" },
            { key: "whats_working", title: "What's Working", icon: "✅" },
            { key: "unspoken_truths", title: "Unspoken Truths", icon: "🤫" },
            { key: "last_mile_gaps", title: "Last Mile Gaps", icon: "🔓" },
            { key: "adjacent_bets", title: "Adjacent Bets", icon: "🔮" },
          ];
          return <div>
            <button onClick={() => setSelectedInsight(null)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)", padding: "10px 0 6px", fontWeight: 500 }}>← All sectors</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 32 }}>{ins.icon}</span>
              <h2 style={{ fontFamily: "var(--font-body)", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{ins.title}</h2>
            </div>
            {/* Company pills */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "8px 0 16px" }}>
              {sectorCos.map(c => <span key={c.id} onClick={(e) => { e.stopPropagation(); setPanel("graph"); setSel(c); }} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--border)", color: "var(--footer-text)", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#C15F3C22"; e.currentTarget.style.color = "#C15F3C"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#e8e5dc"; e.currentTarget.style.color = "#6b6b66"; }}
              >{c.name}</span>)}
            </div>
            {/* Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sections.map(({ key, title, icon }) => ins[key] ? (
                <div key={key} style={{ background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <h3 style={{ margin: 0, fontSize: 14, fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{boldNames(ins[key])}</p>
                </div>
              ) : null)}
            </div>
            {/* AI Ask */}
            <div style={{ marginTop: 20, background: "var(--accent-bg)", borderRadius: 10, border: "1px solid #C15F3C22", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>🧠</span>
                <h3 style={{ margin: 0, fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>Ask deeper</h3>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px" }}>Ask a specific question about this sector — grounded in our company data</p>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={insightAsk} onChange={e => setInsightAsk(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && insightAsk.trim() && !insightAsking) askInsight(ins, insightAsk.trim()); }}
                  placeholder={`e.g. "Which company is best positioned to win NHS contracts?"`}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, fontFamily: "var(--font-body)", background: "var(--bg-elevated)", outline: "none" }} />
                <button onClick={() => { if (insightAsk.trim() && !insightAsking) askInsight(ins, insightAsk.trim()); }}
                  disabled={!insightAsk.trim() || insightAsking}
                  style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: insightAsking ? "#e8e5dc" : "#C15F3C", color: insightAsking ? "#8a8a85" : "#fff", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)", cursor: insightAsking ? "wait" : "pointer" }}>
                  {insightAsking ? "Thinking..." : "Ask"}
                </button>
              </div>
              {insightAnswer && <div style={{ marginTop: 12, padding: 12, background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{insightAnswer}</p>
              </div>}
            </div>
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.5 }}>⚠️ These sector analyses were generated with the assistance of AI and may contain inaccuracies. Company data is sourced from public information and updated periodically. This content is for informational purposes only and does not constitute investment advice. Last updated March 2026.</p>
            </div>
            <div style={{ height: 40 }} />
          </div>;
        })()}
      </div>}

      {/* ── EVENTS PANEL ─────────────────────────────────────────── */}
      {panel === "events" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", paddingBottom: isMobile ? 40 : 130, background: "var(--bg-base)", ...panelTransition }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "10px 0 12px" }}>Curated meetups, conferences, and community gatherings</p>
        {eventsLoading ? <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 12, marginTop: 10 }}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div> :
        events.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No events found</div> :
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
          {events.map((ev, i) => {
            const isPast = new Date(ev.date) < new Date();
            return (
              <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)", padding: 16, opacity: isPast ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {new Date(ev.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {ev.time && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {ev.time}</span>}
                    </div>
                    <h3 style={{ margin: "4px 0 0", fontSize: 17, fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--text-primary)" }}>{ev.title}</h3>
                  </div>
                  {ev.recurring && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#30D15818", color: "#30D158", fontWeight: 600 }}>RECURRING</span>}
                </div>
                {ev.venue && <div style={{ fontSize: 12, color: "var(--footer-text)", marginBottom: 4 }}>📍 {ev.venue}</div>}
                {ev.organiser && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Organised by {ev.organiser}</div>}
                {ev.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 8px" }}>{ev.description}</p>}
                {ev.speakers?.length > 0 && ev.speakers[0] && <div style={{ fontSize: 11, color: "var(--footer-text)", marginBottom: 6 }}>🎤 {ev.speakers.join(", ")}</div>}
                {ev.topics?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {ev.topics.map((t, j) => <span key={j} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--border)", color: "var(--footer-text)" }}>{t}</span>)}
                </div>}
                {ev.registration_url && <a href={ev.registration_url} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "var(--accent)", color: "#fff", fontSize: 11, textDecoration: "none", fontFamily: "var(--font-body)", fontWeight: 600 }}>{isPast ? "View details →" : "Register →"}</a>}
              </div>
            );
          })}
        </div>}
      </div>}

      {/* ── SCORE PANEL ──────────────────────────────────────────── */}
      {panel === "score" && <div style={{ position: "fixed", top: headerHeight, left: 0, right: 0, bottom: 0, overflowY: "auto", padding: isMobile ? "0 12px 20px" : "0 20px 20px", paddingBottom: isMobile ? 40 : 130, background: "var(--bg-base)", ...panelTransition }}>
        <h2 style={{ fontFamily: "var(--font-body)", fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: "16px 0 6px" }}>Network Score & Badges</h2>
        {!user && <div style={{ padding: "12px", borderRadius: 8, background: "#FF9F0A18", border: "1px solid #FF9F0A33", marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#FF9F0A" }}>⚠️ Sign up to save your score, appear on the leaderboard, and track connections across devices.</span>
          <button onClick={() => setAuthMode("signup")} style={{ marginLeft: 8, padding: "3px 8px", borderRadius: 4, border: "1px solid #30D158", background: "#30D15818", color: "#30D158", fontSize: 9, cursor: "pointer" }}>Sign up</button>
        </div>}
        {/* Score card */}
        <div style={{ background: "var(--bg-sunken)", borderRadius: 12, padding: "20px", border: "1px solid var(--border-strong)", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>{score.emoji || "🔭"}</div>
          <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "var(--font-body)", color: "#FFD700", marginTop: 4 }}>{score.score}</div>
          <div style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 600 }}>{score.level || "Explorer"}</div>
          {score.nextLevel && <>
            <div style={{ width: "100%", height: 4, background: "var(--border)", borderRadius: 2, marginTop: 10 }}>
              <div style={{ width: score.pct + "%", height: 4, background: "var(--accent)", borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 4 }}>{score.pct}% to {score.nextLevel} ({score.nextMin} pts)</div>
          </>}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{mn}</div><div style={{ fontSize: 8, color: "var(--text-muted)" }}>Tracked</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{score.breakdown.catCount || 0}</div><div style={{ fontSize: 8, color: "var(--text-muted)" }}>Categories</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{score.breakdown.frontierCoverage || 0}/7</div><div style={{ fontSize: 8, color: "var(--text-muted)" }}>Frontier</div></div>
            <div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{earnedBadges.length}/{BADGES.length}</div><div style={{ fontSize: 8, color: "var(--text-muted)" }}>Badges</div></div>
          </div>
        </div>
        {/* Badges */}
        <div style={{ fontSize: 11, color: "var(--footer-text)", fontWeight: 600, marginBottom: 8 }}>BADGES</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(140px,1fr))", gap: 6, marginBottom: 16 }}>
          {BADGES.map(b => {
            const earned = earnedBadges.find(e => e.id === b.id);
            return (<div key={b.id} style={{ background: earned ? "#e8e5dc" : "#f8f7f3", borderRadius: 8, padding: "10px", border: `1px solid ${earned ? "#d5d3ca" : "#f5f3ee"}`, opacity: earned ? 1 : 0.4, textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 10, color: "var(--text-primary)", fontWeight: 600, marginTop: 3 }}>{b.name}</div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>{b.desc}</div>
              {earned && <div style={{ fontSize: 7.5, color: "#30D158", marginTop: 3 }}>✓ Earned</div>}
            </div>);
          })}
        </div>
      </div>}

      {/* ── DETAIL PANEL (graph) ──────────────────────────────────── */}
      {sel && panel === "graph" && <DraggableCard isMobile={isMobile} onClose={() => setSel(null)} headerHeight={headerHeight}>
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: CC[sel.cat]?.c, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontFamily: "var(--font-body)", background: "var(--accent-bg)", padding: "2px 6px", borderRadius: 3 }}>{CC[sel.cat]?.i} {CC[sel.cat]?.l}</span>
              <h2 style={{ margin: "6px 0 0", fontSize: 24, fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--text-primary)" }}>{sel.name}</h2>
              {sel.hq && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>📍 {sel.hq}</p>}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "start", marginLeft: 8 }}>
              <span onClick={() => toggleStar("company", sel.id)} style={{ cursor: "pointer", padding: 4 }}><StarIcon filled={stars.has(`company:${sel.id}`)} /></span>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
            </div>
          </div>
          {/* Metric chips */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {sel.fund && <M l="Funding" v={sel.fund} />}{sel.yr && <M l="Founded" v={sel.yr} />}{sel.emp && <M l="Team" v={sel.emp} />}{sel.val && <M l="Valuation" v={sel.val} />}
          </div>
          {selUD && <div style={{ marginTop: 8, padding: "4px 7px", borderRadius: 5, background: US[selUD.status]?.c + "18", border: `1px solid ${US[selUD.status]?.c}30`, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9 }}>{US[selUD.status]?.i}</span>
            <span style={{ fontSize: 9, color: US[selUD.status]?.c, fontWeight: 600 }}>{US[selUD.status]?.l}</span>
            {(selUD.contact_name || selUD.contact) && <span style={{ fontSize: 8, color: "var(--footer-text)" }}>· {selUD.contact_name || selUD.contact}</span>}
          </div>}
          <div style={{ display: "flex", gap: 0, marginTop: 10, flexWrap: "wrap" }}>
            {[["info","Info"], ["funding","Funding"], ["people","People"], ...(signals.length > 0 ? [["signals","Signals"]] : []), ["links","Links"], ["network","Network"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "6px 0", border: "none", borderBottom: tab === k ? "2px solid var(--accent)" : "2px solid transparent", background: "none", color: tab === k ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-body)", cursor: "pointer", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: isMobile ? "10px 14px calc(14px + env(safe-area-inset-bottom, 20px))" : "10px 14px 14px" }}>
          {tab === "info" && <>
            {sel.focus && <S t="Focus" v={sel.focus} />}
            {sel.clients && <S t="Clients & Markets" v={sel.clients} />}
            {sel.ethos && <S t="Ethos" v={sel.ethos} />}
            {sel.ms && <S t="Milestones" v={sel.ms} />}
            {sel.jobs && <a href={sel.jobs} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "var(--border)", color: "var(--text-primary)", fontSize: 9.5, textDecoration: "none", fontFamily: "var(--font-body)", border: "1px solid var(--border-strong)", marginTop: 6 }}>🔗 Careers →</a>}
            {sel.cat !== "investor" && <a href={`/company/${sel.id}.html`} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "6px 12px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent)", fontSize: 9.5, textDecoration: "none", fontFamily: "var(--font-body)", border: "1px solid rgba(193,95,60,0.2)", marginTop: 6, marginLeft: 4 }}>📄 Profile →</a>}
          </>}
          {tab === "funding" && <>
            {sel.cat === "investor" ? (
              /* INVESTOR VIEW: show portfolio companies with round info */
              (() => {
                const portfolioEdges = edges.filter(e => e.ty === "investment" && e.s === sel.id);
                if (portfolioEdges.length === 0) return <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No portfolio data.</p>;
                const totalFunding = portfolioEdges.reduce((s, e) => { const co = companies.find(c => c.id === e.t); return s + (co?.fn || 0); }, 0);
                return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Portfolio · {portfolioEdges.length} companies</div>
                    {totalFunding > 0 && <div style={{ fontSize: 9, color: "#30D158", fontWeight: 600 }}>Combined: ${totalFunding >= 1000 ? Math.round(totalFunding/1000) + "B" : totalFunding + "M"}</div>}
                  </div>
                  {portfolioEdges.sort((a,b) => {
                    const ca = companies.find(c => c.id === a.t);
                    const cb = companies.find(c => c.id === b.t);
                    return (cb?.fn || 0) - (ca?.fn || 0);
                  }).map((e, i) => {
                    const co = companies.find(c => c.id === e.t);
                    if (!co) return null;
                    return <div key={i} onClick={() => { setSel(co); setTab("funding"); }} style={{ padding: "7px 9px", borderRadius: 6, background: "var(--bg-elevated)", border: "1px solid var(--border)", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: CC[co.cat]?.c || "#999", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{co.name}</span>
                          <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 4 }}>{CC[co.cat]?.l}</span>
                        </div>
                        {co.fund && <span style={{ fontSize: 10, fontWeight: 700, color: "#30D158", flexShrink: 0 }}>{co.fund}</span>}
                      </div>
                      {e.l && <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, paddingLeft: 12 }}>{e.l}</div>}
                    </div>;
                  })}
                </div>;
              })()
            ) : (
              /* COMPANY VIEW: show funding rounds */
              (() => {
                // Parse date and sort by series weight then date
                const SERIES_ORDER = {"IPO":100,"Acquisition":99,"Series G":15,"Series F":14,"Series E":13,"Series D":12,"Series C":11,"Series B":10,"Series A":9,"Growth Equity":8,"Venture":7,"Seed":5,"Pre-Seed":4};
                const MONTHS = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12};
                const parseDate = (d) => {
                  if (!d) return 0;
                  const parts = d.split(" ");
                  const yr = parseInt(parts[parts.length-1]) || 0;
                  const mo = MONTHS[parts[0]] || 0;
                  return yr * 100 + mo;
                };
                const sorted = [...fundingRounds].sort((a,b) => {
                  const wa = SERIES_ORDER[a.series] || 0;
                  const wb = SERIES_ORDER[b.series] || 0;
                  if (wb !== wa) return wb - wa;
                  return parseDate(b.date) - parseDate(a.date);
                });
                if (sorted.length === 0) return <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No funding round data yet.</p>;
                return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sorted.map((r, i) => (
                    <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{r.series}</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.date || ""}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                        {r.amount && <div><span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Raised</span><div style={{ fontSize: 13, fontWeight: 700, color: "#30D158" }}>{r.amount}</div></div>}
                        {r.valuation && <div><span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Valuation</span><div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{r.valuation}</div></div>}
                      </div>
                      {r.lead_investors?.length > 0 && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Lead </span>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{r.lead_investors.join(", ")}</span>
                        </div>
                      )}
                      {r.other_investors?.length > 0 && (
                        <div style={{ marginBottom: 2 }}>
                          <span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Also </span>
                          <span style={{ fontSize: 9, color: "var(--footer-text)" }}>{r.other_investors.join(", ")}</span>
                        </div>
                      )}
                      {r.notes && <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, fontStyle: "italic" }}>{r.notes}</div>}
                    </div>
                  ))}
                </div>;
              })()
            )}
          </>}
          {tab === "people" && <>
            {sel.founders && <S t="Founders" v={sel.founders} />}
            {sel.kp && <S t="Key People" v={sel.kp} />}
            {relatedPeople.length > 0 && <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Social Links</div>
              {relatedPeople.map(([name, p]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", flex: 1 }}>{name}</span>
                  {p.tw && <a href={p.tw} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#2a2a28", border: "1px solid #333" }}><XIcon size={11} /></a>}
                  {p.li && <a href={p.li} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#0A66C2" }}><LIIcon size={11} /></a>}
                </div>
              ))}
              {/* Podcasts for this company's people */}
              {relatedPeople.some(([, p]) => p.pods?.length > 0) && <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Interviews & Podcasts</div>
                {relatedPeople.map(([name, p]) => p.pods?.length > 0 ? (
                  <div key={name} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: "var(--footer-text)", marginBottom: 2 }}>{name}</div>
                    <PodcastList pods={p.pods} compact personName={name} />
                  </div>
                ) : null)}
              </div>}
            </div>}
          </>}
          {tab === "signals" && <>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-body)" }}>What founders and leaders are saying — sourced from podcasts, interviews, and conferences.</div>
            {signals.map((sig, i) => {
              const borderColor = sig.source_type === "podcast" ? "var(--accent)" : sig.source_type === "interview" ? "#4A90D9" : sig.source_type === "conference" ? "var(--success)" : "var(--border-strong)";
              return (
              <div key={i} style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: `3px solid ${borderColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontStyle: "italic" }}>{sig.speaker}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{sig.speaker_role}</div>
                  </div>
                  {sig.date && <span style={{ fontSize: 9, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{sig.date}</span>}
                </div>
                {sig.source_url ? (
                  <a href={sig.source_url} target="_blank" rel="noopener" style={{ fontSize: 10, color: "var(--accent)", textDecoration: "none", display: "block", marginBottom: 6, fontFamily: "var(--font-body)" }}>Read more →</a>
                ) : (
                  <div style={{ fontSize: 10, color: "var(--footer-text)", marginBottom: 6, fontFamily: "var(--font-body)" }}>{sig.source_title}</div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 6, fontFamily: "var(--font-body)" }}>{sig.summary}</div>
                {sig.key_quotes && sig.key_quotes.length > 0 && (
                  <div style={{ borderLeft: "2px solid rgba(193,95,60,0.2)", paddingLeft: 8, marginBottom: 6 }}>
                    {sig.key_quotes.map((q, qi) => (
                      <div key={qi} style={{ fontSize: 10, color: "var(--footer-text)", fontStyle: "italic", marginBottom: 3, lineHeight: 1.5, fontFamily: "var(--font-body)" }}>"{q}"</div>
                    ))}
                  </div>
                )}
                {sig.themes && sig.themes.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {sig.themes.map((t, ti) => (
                      <span key={ti} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 500, fontFamily: "var(--font-body)" }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
            <div style={{ fontSize: 9, color: "var(--text-faint)", fontStyle: "italic", marginTop: 8, fontFamily: "var(--font-body)" }}>Signals are curated from public sources. Summaries may not reflect the speaker's full views.</div>
          </>}
          {tab === "links" && <>
            {ce.length === 0 ? <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No connections.</p> :
              ce.map((e, i) => { const oid = e.s === sel.id ? e.t : e.s; const o = companies.find(c => c.id === oid); if (!o) return null; return (<div key={i} onClick={() => { setSel(o); setTab("info"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: "rgba(0,0,0,0.02)" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: ECfg[e.ty]?.c || "#444" }} /><span style={{ fontSize: 10, color: "var(--text-secondary)", flex: 1 }}>{o.name}</span>{e.l && <span style={{ fontSize: 7.5, color: "var(--text-muted)" }}>{e.l}</span>}<span style={{ fontSize: 7, color: "var(--text-faint)", textTransform: "uppercase" }}>{e.ty}</span></div>); })}
          </>}
          {tab === "network" && <>
            <p style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 8 }}>Your connection to {sel.s || sel.name}.</p>
            {!user && <div style={{ padding: "6px 8px", borderRadius: 5, background: "#FF9F0A18", border: "1px solid #FF9F0A33", marginBottom: 8, fontSize: 9, color: "#FF9F0A" }}>Sign up to save connections across devices. <span onClick={() => setAuthMode("signup")} style={{ textDecoration: "underline", cursor: "pointer" }}>Sign up</span></div>}
            {editConn === sel.id ? <>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 3 }}>STATUS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {Object.entries(US).map(([k, cfg]) => (
                    <button key={k} onClick={() => setCf(p => ({ ...p, status: k }))} style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${cf.status === k ? cfg.c : "#e8e5dc"}`, background: cf.status === k ? cfg.c + "20" : "transparent", color: cf.status === k ? cfg.c : "#64748B", fontSize: 8, cursor: "pointer", fontFamily: "var(--font-body)" }}>{cfg.i} {cfg.l}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={cf.contact_name || ""} onChange={e => setCf(p => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" style={{ ...inputStyle, marginBottom: 5 }} />
              <textarea value={cf.notes || ""} onChange={e => setCf(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => saveConn(sel.id, cf)} style={{ flex: 1, padding: "5px", borderRadius: 5, border: "none", background: "var(--accent)", color: "#000", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditConn(null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 9, cursor: "pointer" }}>Cancel</button>
                {selUD && <button onClick={() => saveConn(sel.id, null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid #FF453A33", background: "transparent", color: "#FF453A", fontSize: 9, cursor: "pointer" }}>Remove</button>}
              </div>
            </> : <>
              {selUD ? <div>
                <div style={{ padding: "8px", borderRadius: 6, background: "var(--bg-elevated)", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 12 }}>{US[selUD.status]?.i}</span><span style={{ fontSize: 11, color: US[selUD.status]?.c, fontWeight: 600 }}>{US[selUD.status]?.l}</span></div>
                  {(selUD.contact_name || selUD.contact) && <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3 }}>Contact: {selUD.contact_name || selUD.contact}</div>}
                  {selUD.notes && <div style={{ fontSize: 9.5, color: "var(--footer-text)", marginTop: 3 }}>{selUD.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setCf({ status: selUD.status, contact_name: selUD.contact_name || selUD.contact || "", notes: selUD.notes || "" }); setEditConn(sel.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--footer-text)", fontSize: 9, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => { setCf({ status: "target", contact_name: "", notes: "" }); setEditConn(sel.id); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #30D15850", background: "#30D15810", color: "#30D158", fontSize: 9, cursor: "pointer" }}>+ Add another</button>
                </div>
              </div> : <button onClick={() => { setCf({ status: "target", contact_name: "", notes: "" }); setEditConn(sel.id); }} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid #30D15850", background: "#30D15810", color: "#30D158", fontSize: 9.5, cursor: "pointer" }}>+ Add Connection</button>}
            </>}
          </>}
        </div>
      </DraggableCard>}

      {/* ── MAP STATS + LEGENDS ─────────────────────────────────────── */}
      {panel === "graph" && !sel && !isMobile && !legendDismissed && (
        <div style={{ position: "absolute", top: headerHeight + 8, left: 240, right: 10, zIndex: 500, background: "var(--bg-sunken)", borderRadius: 6, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "var(--font-body)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click any bubble to explore · Bubble size = funding raised · Lines = relationships</span>
          <button onClick={() => { setLegendDismissed(true); localStorage.setItem('ldnai-legend-dismissed', '1'); }} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 14, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
        </div>
      )}
      {/* Mobile: pullable legend */}
      {panel === "graph" && !sel && isMobile && <div
        onClick={() => setLegendOpen(prev => !prev)}
        style={{ position: "absolute", bottom: 90, left: 8, right: 8, background: "rgba(255,255,255,0.95)", borderRadius: 10, border: "1px solid var(--border)", zIndex: 500, backdropFilter: "blur(8px)", overflow: "hidden", transition: "max-height 0.3s ease", maxHeight: legendOpen ? 200 : 28, cursor: "pointer" }}>
        {/* Pull handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 2px" }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "#d0cec8" }} />
        </div>
        {legendOpen && <div style={{ padding: "0 10px 8px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            <strong>{companies.filter(c => !["investor", "academic"].includes(c.cat)).length}</strong> companies · <strong>${Math.round(companies.reduce((s, c) => s + (c.fn || 0), 0) / 1000)}B+</strong> raised · <strong>{companies.filter(c => c.fn >= 500).length}</strong> unicorns
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Tap node → details · Drag to rearrange · Tap here to hide</p>
        </div>}
      </div>}
    </div>

    {/* ── FOOTER ─────────────────────────────────────────────────── */}
    {panel !== "graph" && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--footer-bg)", zIndex: 999 }}>
      {isMobile ? (
        <div style={{ padding: "6px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 24 }}>
          <span style={{ fontSize: 10, color: "var(--footer-text)", fontFamily: "var(--font-body)" }}>© 2026 LDN/ai · <a href="/privacy.html" style={{ color: "var(--footer-text)", textDecoration: "none" }}>Privacy</a> · <a href="/terms.html" style={{ color: "var(--footer-text)", textDecoration: "none" }}>Terms</a></span>
          <span style={{ fontSize: 10, color: "var(--footer-text)", fontFamily: "var(--font-body)" }}>Made in London 🇬🇧</span>
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-body)", background: "linear-gradient(135deg,var(--accent),#d97757)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LDN/ai</span>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--footer-text)", maxWidth: 300, fontFamily: "var(--font-body)" }}>Interactive intelligence platform mapping London's AI ecosystem. 89 companies, 20 investors, 67 people, $37B+ funding.</p>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 10, color: "var(--footer-text-bright)", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, fontFamily: "var(--font-body)" }}>Platform</p>
                <a href="/" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Interactive Map</a>
                <a href="/ecosystem/" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Ecosystem Guide</a>
                <a href="/sourcing" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Sourcing API</a>
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 10, color: "var(--footer-text-bright)", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, fontFamily: "var(--font-body)" }}>Research</p>
                <a href="/insights/londonmaxxing.html" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Londonmaxxing</a>
                <a href="/insights/unicorns.html" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>AI Unicorns</a>
                <a href="/insights/funding.html" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Funding Analysis</a>
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 10, color: "var(--footer-text-bright)", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, fontFamily: "var(--font-body)" }}>About</p>
                <a href="mailto:jxi5410@gmail.com" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Contact</a>
                <a href="https://github.com/jxi5410/AI.LDN" target="_blank" rel="noopener" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>GitHub</a>
                <a href="/privacy.html" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Privacy Policy</a>
                <a href="/terms.html" style={{ display: "block", fontSize: 12, color: "var(--footer-text)", textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-body)" }}>Terms of Use</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #2d2d2a", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--footer-text)", fontFamily: "var(--font-body)" }}>© 2026 Jie Xi. All rights reserved. Data sourced from public records.</span>
            <span style={{ fontSize: 11, color: "var(--footer-text)", fontFamily: "var(--font-body)" }}>Made in London 🇬🇧</span>
          </div>
        </div>
      )}
    </div>}

  </>
  );
}

// ── SUBCOMPONENTS ───────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-sunken)", color: "var(--text-primary)", fontSize: 12, fontFamily: "var(--font-body)", outline: "none", marginBottom: 8, boxSizing: "border-box" };

function Skeleton({ width = "100%", height = 14, style = {} }) {
  return <div style={{ width, height, borderRadius: 4, background: "var(--bg-sunken)", animation: "skeletonPulse 1.5s ease-in-out infinite", ...style }} />;
}

function SkeletonCard() {
  return <div style={{ background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", padding: 14 }}>
    <Skeleton height={18} width="60%" style={{ marginBottom: 8 }} />
    <Skeleton height={12} width="90%" style={{ marginBottom: 6 }} />
    <Skeleton height={12} width="75%" style={{ marginBottom: 10 }} />
    <div style={{ display: "flex", gap: 6 }}>
      <Skeleton height={10} width={60} />
      <Skeleton height={10} width={80} />
    </div>
  </div>;
}

function M({ l, v }) { return (<div style={{ background: "var(--bg-sunken)", borderRadius: 8, padding: "8px 12px", border: "1px solid var(--border)" }}><div style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{String(v)}</div><div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>{l}</div></div>); }
function S({ t, v }) { return (<div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1.5, fontWeight: 600, fontFamily: "var(--font-body)" }}>{t}</div><div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "var(--font-body)" }}>{v}</div></div>); }
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
    <button onClick={doSummarise} style={{ padding: "1px 6px", borderRadius: 3, border: "1px solid var(--border)", background: summary ? "#C15F3C10" : "transparent", color: summary ? "#C15F3C" : "#a0a09b", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)" }}>
      {loading ? <span style={{ animation: "pulse 1s infinite" }}>⏳</span> : summary ? "✓ Summary" : "✨ Summarise"}
    </button>
    {summary && <div style={{ width: "100%", fontSize: 12, color: "var(--footer-text)", lineHeight: 1.5, padding: "4px 0 2px", borderLeft: "2px solid #e8e5dc", paddingLeft: 10, marginTop: 4 }}>
      {summary.split("•").filter(Boolean).map((b, j) => <div key={j} style={{ marginBottom: 2 }}>• {b.trim()}</div>)}
    </div>}
  </>);
}

function DraggableCard({ isMobile, onClose, children, headerHeight = 70 }) {
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
      <div style={{ position: "fixed", top: headerHeight + 6, right: 6, width: 320, maxHeight: `calc(100vh - ${headerHeight + 12}px)`, overflowY: "auto", background: "rgba(255,255,255,0.98)", borderRadius: 12, backdropFilter: "blur(16px)", border: "1px solid var(--border)", zIndex: 600, animation: "slideInRight 250ms ease-out" }}>
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
        border: "1px solid var(--border)",
        borderBottom: "none",
        zIndex: 30,
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

function SB({ l, v, c }) { return (<div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 6, padding: "3px 8px", border: "1px solid var(--border)", textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: "var(--font-body)" }}>{v}</div><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{l}</div></div>); }

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
            <a href={pod.url} target="_blank" rel="noopener" style={{ flex: 1, fontSize: compact ? 12 : 13, color: "var(--footer-text)", textDecoration: "none", lineHeight: 1.4 }}>
              <span style={{ color: "var(--text-muted)" }}>🎙️</span> <span style={{ color: "var(--text-secondary)" }}>{pod.label}</span>
            </a>
            <button onClick={() => summarize(pod)} style={{ flexShrink: 0, padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", background: hasSummary ? "#C15F3C18" : "transparent", color: hasSummary ? "#C15F3C" : "#5a564e", fontSize: 8, cursor: "pointer", fontFamily: "var(--font-body)" }}>
              {isLoading ? <span style={{ display: "inline-block", animation: "pulse 1s infinite" }}>⏳</span> : hasSummary ? "✓" : "✨"}
            </button>
          </div>
          {hasSummary && <div style={{ fontSize: 9.5, color: "var(--footer-text)", lineHeight: 1.5, padding: "4px 0 2px 16px", borderLeft: "2px solid #e8e5dc", marginTop: 2, marginBottom: 2 }}>
            {hasSummary.split("•").filter(Boolean).map((b, j) => (
              <div key={j} style={{ marginBottom: 2 }}>• {b.trim()}</div>
            ))}
            <button onClick={() => setChatOpen(isChatOpen ? null : key)} style={{ fontSize: 8, color: "#6a9bcc", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2, fontFamily: "var(--font-body)" }}>
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
              <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat(pod)} placeholder="Ask a question..." style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-sunken)", color: "var(--text-secondary)", fontSize: 9, fontFamily: "var(--font-body)", outline: "none" }} />
              <button onClick={() => sendChat(pod)} disabled={chatLoading} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "var(--accent)", color: "#fff", fontSize: 8, cursor: "pointer", opacity: chatLoading ? 0.5 : 1 }}>{chatLoading ? "..." : "→"}</button>
            </div>
          </div>}
        </div>
      );
    })}
    {pods.length > 3 && !showAll && <span onClick={() => setShowAll(true)} style={{ fontSize: 8.5, color: "var(--accent)", cursor: "pointer", display: "inline-block", marginTop: 2 }}>+ {pods.length - 3} more</span>}
    {showAll && pods.length > 3 && <span onClick={() => setShowAll(false)} style={{ fontSize: 8.5, color: "var(--text-muted)", cursor: "pointer", display: "inline-block", marginTop: 2 }}>show less</span>}
  </div>);
}
