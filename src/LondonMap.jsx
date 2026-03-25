import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CC, ECfg, edges as allEdges } from "./data";

const EDGE_COLORS = {
  alumni: "#C15F3C", spinoff: "#BF5AF2", investment: "#FFD700",
  academic: "#5AC8FA", partnership: "#6a9bcc",
};

// Investor brand colours + logo domains (for Clearbit)
const INVESTOR_BRAND = {
  "sequoia-eu": { c: "#1B7F37", domain: "sequoiacap.com" },
  "accel":      { c: "#4A00E0", domain: "accel.com" },
  "balderton":  { c: "#1A1A2E", domain: "balderton.com" },
  "atomico":    { c: "#FF4500", domain: "atomico.com" },
  "softbank":   { c: "#005BAC", domain: "softbank.com" },
  "localglobe": { c: "#1DB954", domain: "localglobe.vc" },
  "index":      { c: "#E8324A", domain: "indexventures.com" },
  "lightspeed": { c: "#FF6B00", domain: "lsvp.com" },
  "khosla":     { c: "#2C3E50", domain: "khoslaventures.com" },
  "gv":         { c: "#4285F4", domain: "gv.com" },
  "nvidia-inv": { c: "#76B900", domain: "nvidia.com" },
  "plural":     { c: "#6C5CE7", domain: "plural.vc" },
  "mmc":        { c: "#0D2137", domain: "mmc.vc" },
  "air-street": { c: "#F97316", domain: "airstreet.com" },
  "seedcamp":   { c: "#E91E63", domain: "seedcamp.com" },
  "ef":         { c: "#000000", domain: "joinef.com" },
  "sovereign-ai":{ c: "#003078", domain: "sovereignai.gov.uk" },
  "thrive":     { c: "#000000", domain: "thrivecap.com" },
  "battery":    { c: "#1E3A5F", domain: "battery.com" },
  "georgian":   { c: "#00B4D8", domain: "georgian.io" },
};

function nr(c, view, mobile) {
  const m = mobile ? 1.5 : 1;
  const minR = mobile ? 22 : 0;
  if (view === "investors") {
    if (c.cat === "investor") return Math.max(minR, 32 * m);
    const f = c.fn || 0;
    if (f >= 1000) return Math.max(minR, 14 * m); if (f >= 500) return Math.max(minR, 12 * m); if (f >= 200) return Math.max(minR, 10 * m); if (f >= 50) return Math.max(minR, 8 * m); return Math.max(minR, 6 * m);
  }
  if (c.cat === "frontier") return Math.max(minR, 26 * m); if (c.cat === "investor") return Math.max(minR, 10 * m); if (c.cat === "academic") return Math.max(minR, 13 * m);
  if (c.cat === "frontier-emerging") return Math.max(minR, 18 * m);
  const f = c.fn || 0;
  if (f >= 1000) return Math.max(minR, 22 * m); if (f >= 500) return Math.max(minR, 18 * m); if (f >= 200) return Math.max(minR, 15 * m); if (f >= 50) return Math.max(minR, 12 * m); if (f >= 10) return Math.max(minR, 10 * m); return Math.max(minR, 8 * m);
}

// Get the investor colour for a portfolio company (find which investor it's connected to)
function getInvestorColor(nodeId, links) {
  for (const l of links) {
    if (l.ty !== "investment") continue;
    const sid = typeof l.source === "object" ? l.source.id : l.source;
    const tid = typeof l.target === "object" ? l.target.id : l.target;
    if (tid === nodeId && INVESTOR_BRAND[sid]) return INVESTOR_BRAND[sid].c;
    if (sid === nodeId && INVESTOR_BRAND[tid]) return INVESTOR_BRAND[tid].c;
  }
  return CC["investor"]?.c || "#FFD700";
}

export default function LondonMap({ companies, edges, onSelect, selected, userConnections, isMobile, mapView = "companies" }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const w = svgRef.current.parentElement.clientWidth;
    const h = svgRef.current.parentElement.clientHeight;
    svg.attr("width", w).attr("height", h);
    svg.selectAll("*").remove();
    // Also clean up tooltips from previous renders
    d3.select(svgRef.current.parentNode).selectAll(".edge-tooltip").remove();
    d3.select(svgRef.current.parentNode).selectAll(".node-tooltip").remove();

    svg.append("rect").attr("width", w).attr("height", h).attr("fill", "#faf9f5");
    const defs = svg.append("defs");
    const g = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    // Zoom out on mobile for investor view (nodes are larger and more spread out)
    if (isMobile && mapView === "investors") {
      svg.call(zoom.transform, d3.zoomIdentity.translate(w * 0.15, h * 0.15).scale(0.7));
    }

    const isInv = mapView === "investors";

    const nodes = companies.map(c => ({ ...c, r: nr(c, mapView, isMobile) }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = edges.filter(e => nodeMap.has(e.s) && nodeMap.has(e.t)).map(e => ({
      source: e.s, target: e.t, ty: e.ty, l: e.l,
    }));

    // In investor view, create clipPaths for investor logos
    if (isInv) {
      nodes.filter(n => n.cat === "investor" && INVESTOR_BRAND[n.id]).forEach(n => {
        defs.append("clipPath").attr("id", `clip-${n.id}`)
          .append("circle").attr("r", n.r).attr("cx", n.r).attr("cy", n.r);
      });
    }

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance(d => isInv && d.ty === "investment" ? 160 : 80)
        .strength(0.3))
      .force("charge", d3.forceManyBody().strength(d => isInv && d.cat === "investor" ? -d.r * 30 : -120))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(d => d.r + (isInv && d.cat === "investor" ? 16 : isMobile ? 20 : 14)))
      .force("x", d3.forceX(w / 2).strength(0.04))
      .force("y", d3.forceY(h / 2).strength(0.04));
    simRef.current = sim;

    // Draw edges — in investor view, colour by investor brand
    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", d => {
        if (isInv && d.ty === "investment") {
          const sid = typeof d.source === "object" ? d.source.id : d.source;
          return INVESTOR_BRAND[sid]?.c || "#FFD700";
        }
        return EDGE_COLORS[d.ty] || "#ccc";
      })
      .attr("stroke-width", d => isInv && d.ty === "investment" ? 2 : 1.5)
      .attr("stroke-opacity", d => isInv && d.ty === "investment" ? 0.5 : 0.4)
      .attr("stroke-dasharray", d => d.ty === "partnership" ? "4 3" : "none");

    // Edge tooltip
    const tip = d3.select(svgRef.current.parentNode).append("div").attr("class", "edge-tooltip")
      .style("position", "absolute").style("pointer-events", "none").style("display", "none")
      .style("background", "rgba(255,255,255,0.96)").style("backdrop-filter", "blur(8px)")
      .style("border", "1px solid #e8e5dc").style("border-radius", "6px")
      .style("padding", "5px 10px").style("font-size", "11px").style("font-family", "'DM Sans',sans-serif")
      .style("color", "#2d2d2a").style("z-index", "600").style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
      .style("max-width", "240px").style("white-space", "nowrap");

    link.style("cursor", "pointer")
      .on("mouseenter", function(e, d) {
        const edgeColor = isInv && d.ty === "investment" ? (INVESTOR_BRAND[typeof d.source === "object" ? d.source.id : d.source]?.c || "#FFD700") : (EDGE_COLORS[d.ty] || "#ccc");
        const typeName = {alumni:"Alumni Flow",spinoff:"Spin-off",investment:"Investment",academic:"Academic",partnership:"Partnership"}[d.ty] || d.ty;
        d3.select(this).attr("stroke-opacity", 0.9).attr("stroke-width", 3);
        const sName = typeof d.source === "object" ? d.source.name : d.source;
        const tName = typeof d.target === "object" ? d.target.name : d.target;
        tip.html(`<span style="color:${edgeColor};font-weight:600">${typeName}</span><br/><span style="color:#6b6b66">${sName} → ${tName}</span>${d.l ? `<br/><span style="color:#8a8a85;font-size:10px">${d.l}</span>` : ""}`)
          .style("display", "block");
      })
      .on("mousemove", function(e) {
        const rect = svgRef.current.parentNode.getBoundingClientRect();
        tip.style("left", (e.clientX - rect.left + 12) + "px").style("top", (e.clientY - rect.top - 10) + "px");
      })
      .on("mouseleave", function(e, d) {
        const baseOpacity = isInv && d.ty === "investment" ? 0.5 : 0.4;
        const baseWidth = isInv && d.ty === "investment" ? 2 : 1.5;
        d3.select(this).attr("stroke-opacity", baseOpacity).attr("stroke-width", baseWidth);
        tip.style("display", "none");
      });

    const edgeLabels = g.append("g").attr("class", "edge-labels").style("pointer-events", "none");

    // Draw nodes with entrance animation
    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .attr("class", "node-g")
      .attr("cursor", "pointer")
      .attr("opacity", 0)
      .transition().duration(600).delay((d, i) => i * 8).attr("opacity", 1).selection();
    // Drag only on desktop — disable on mobile to avoid scroll/pan conflicts
    if (!isMobile) {
      node.call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );
    }

    // Glow for investors in investor view — use brand colour
    if (isInv) {
      node.filter(d => d.cat === "investor").append("circle")
        .attr("r", d => d.r + 4).attr("fill", "none")
        .attr("stroke", d => INVESTOR_BRAND[d.id]?.c || "#FFD700").attr("stroke-width", 2.5)
        .attr("stroke-opacity", 0.3);
    }

    // Main circle — investor view uses brand colours
    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (isInv && d.cat === "investor") return "#ffffff";
        if (isInv && d.cat !== "investor") {
          return getInvestorColor(d.id, links) + "40";
        }
        return CC[d.cat]?.c || "#999";
      })
      .attr("stroke", d => {
        if (selected?.id === d.id) return "#C15F3C";
        if (isInv && d.cat === "investor" && INVESTOR_BRAND[d.id]) return INVESTOR_BRAND[d.id].c;
        if (isInv && d.cat !== "investor") return getInvestorColor(d.id, links) + "80";
        return "white";
      })
      .attr("stroke-width", d => {
        if (selected?.id === d.id) return 3;
        if (isInv && d.cat === "investor") return 2.5;
        return 1.5;
      })
      .attr("opacity", d => isInv && d.cat === "investor" ? 1 : 0.85);

    // Investor logos via foreignObject
    if (isInv) {
      node.filter(d => d.cat === "investor" && INVESTOR_BRAND[d.id]).each(function(d) {
        const brand = INVESTOR_BRAND[d.id];
        const sz = d.r * 1.3;
        const fo = d3.select(this).append("foreignObject")
          .attr("x", -sz/2).attr("y", -sz/2)
          .attr("width", sz).attr("height", sz)
          .attr("pointer-events", "none");
        const div = fo.append("xhtml:div")
          .style("width", sz + "px").style("height", sz + "px")
          .style("display", "flex").style("align-items", "center").style("justify-content", "center")
          .style("overflow", "hidden").style("border-radius", "50%");
        const img = div.append("xhtml:img")
          .attr("src", `https://www.google.com/s2/favicons?domain=${brand.domain}&sz=128`)
          .style("width", "60%").style("height", "60%")
          .style("object-fit", "contain")
          .style("display", "block")
          .style("image-rendering", "auto");
        img.node().onerror = function() {
          div.selectAll("img").remove();
          div.append("xhtml:span")
            .style("font-size", (sz * 0.4) + "px")
            .style("font-weight", "800")
            .style("color", brand.c)
            .style("font-family", "'DM Sans',sans-serif")
            .text(d.name.charAt(0));
        };
      });
    }

    // Emoji icon inside (skip for investors with logos in investor view)
    node.append("text")
      .text(d => (isInv && d.cat === "investor" && INVESTOR_BRAND[d.id]) ? "" : (CC[d.cat]?.i || ""))
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => Math.max(d.r * 0.65, 8) + "px")
      .attr("pointer-events", "none");

    // Company name label
    node.append("text")
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + "…" : d.name)
      .attr("dy", d => d.r + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", d => {
        if (isInv && d.cat === "investor") return "13px";
        return d.r > 14 ? "10px" : "8px";
      })
      .attr("font-family", "'DM Sans', sans-serif")
      .attr("font-weight", d => isInv && d.cat === "investor" ? 700 : 500)
      .attr("fill", d => {
        if (isInv && d.cat === "investor" && INVESTOR_BRAND[d.id]) return INVESTOR_BRAND[d.id].c;
        if (isInv && d.cat === "investor") return "#1a1a18";
        return "#4a4a45";
      })
      .attr("pointer-events", "none");

    // Node hover tooltip
    const nodeTip = d3.select(svgRef.current.parentNode).append("div").attr("class", "node-tooltip")
      .style("position", "absolute").style("pointer-events", "none").style("display", "none")
      .style("background", "var(--bg-elevated)").style("border", "1px solid var(--border)")
      .style("border-radius", "8px").style("padding", "8px 12px").style("z-index", "700")
      .style("font-family", "'DM Sans',sans-serif").style("opacity", "0").style("transition", "opacity 150ms ease");

    node.on("click", (e, d) => { e.stopPropagation(); onSelect(d); });
    svg.on("click", () => onSelect(null));

    const applyHighlight = (activeId) => {
      if (!activeId) {
        node.attr("opacity", 1);
        link.attr("stroke-opacity", d => isInv && d.ty === "investment" ? 0.5 : 0.4)
          .attr("stroke-width", d => isInv && d.ty === "investment" ? 2 : 1.5);
        return;
      }
      const connected = new Set([activeId]);
      links.forEach(l => {
        const sid = typeof l.source === "object" ? l.source.id : l.source;
        const tid = typeof l.target === "object" ? l.target.id : l.target;
        if (sid === activeId) connected.add(tid);
        if (tid === activeId) connected.add(sid);
      });
      node.attr("opacity", n => connected.has(n.id) ? 1 : 0.08);
      link.each(function(l) {
        const sid = typeof l.source === "object" ? l.source.id : l.source;
        const tid = typeof l.target === "object" ? l.target.id : l.target;
        const active = sid === activeId || tid === activeId;
        d3.select(this)
          .attr("stroke-opacity", active ? 0.8 : 0.03)
          .attr("stroke-width", active ? 3 : 0.7);
      });
    };

    svg.node().__applyHighlight = applyHighlight;

    node.on("mouseenter", (e, d) => {
      applyHighlight(d.id);
      // Show tooltip
      const catLabel = CC[d.cat]?.l || d.cat;
      const funding = d.fund || "";
      nodeTip.html(`<div style="font-family:'DM Serif Display',Georgia,serif;font-size:16px;color:var(--text-primary)">${d.name}</div>${funding ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);margin-top:2px">${funding}</div>` : ""}<div style="font-size:11px;color:${CC[d.cat]?.c || "var(--text-muted)"};margin-top:2px">${catLabel}</div>`)
        .style("display", "block");
      setTimeout(() => nodeTip.style("opacity", "1"), 10);
      // Edge labels
      edgeLabels.selectAll("text").remove();
      links.forEach(l => {
        const sid = typeof l.source === "object" ? l.source.id : l.source;
        const tid = typeof l.target === "object" ? l.target.id : l.target;
        if (sid === d.id || tid === d.id) {
          const sx = typeof l.source === "object" ? l.source.x : 0;
          const sy = typeof l.source === "object" ? l.source.y : 0;
          const tx = typeof l.target === "object" ? l.target.x : 0;
          const ty2 = typeof l.target === "object" ? l.target.y : 0;
          const mx = (sx + tx) / 2, my = (sy + ty2) / 2;
          if (l.l) {
            const edgeCol = isInv && l.ty === "investment" ? (INVESTOR_BRAND[sid]?.c || "#FFD700") : (EDGE_COLORS[l.ty] || "#999");
            edgeLabels.append("text")
              .attr("x", mx).attr("y", my - 4)
              .text(l.l)
              .attr("text-anchor", "middle")
              .attr("font-size", "9px")
              .attr("font-family", "'DM Sans',sans-serif")
              .attr("fill", edgeCol)
              .attr("font-weight", 600)
              .attr("paint-order", "stroke")
              .attr("stroke", "#faf9f5")
              .attr("stroke-width", 3);
          }
        }
      });
    }).on("mousemove", (e) => {
      const rect = svgRef.current.parentNode.getBoundingClientRect();
      nodeTip.style("left", (e.clientX - rect.left + 14) + "px").style("top", (e.clientY - rect.top - 10) + "px");
    }).on("mouseleave", () => {
      nodeTip.style("opacity", "0");
      setTimeout(() => nodeTip.style("display", "none"), 150);
      edgeLabels.selectAll("text").remove();
      if (selected) { applyHighlight(selected.id); }
      else { applyHighlight(null); }
    });

    if (selected) {
      setTimeout(() => applyHighlight(selected.id), 100);
    }

    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [companies, edges, selected, isMobile, mapView]);

  return (
    <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "manipulation" }} />
  );
}
