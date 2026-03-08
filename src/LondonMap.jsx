import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CC, ECfg, edges as allEdges } from "./data";

const EDGE_COLORS = {
  alumni: "#C15F3C", spinoff: "#BF5AF2", investment: "#FFD700",
  academic: "#5AC8FA", partnership: "#6a9bcc", accelerator: "#FF9500",
};

function nr(c, view) {
  if (view === "investors") {
    if (c.cat === "investor") return 32;
    const f = c.fn || 0;
    if (f >= 1000) return 14; if (f >= 500) return 12; if (f >= 200) return 10; if (f >= 50) return 8; return 6;
  }
  if (c.cat === "frontier") return 26; if (c.cat === "investor") return 10; if (c.cat === "academic") return 13;
  if (c.cat === "accelerator") return 9; if (c.cat === "frontier-emerging") return 18;
  const f = c.fn || 0;
  if (f >= 1000) return 22; if (f >= 500) return 18; if (f >= 200) return 15; if (f >= 50) return 12; if (f >= 10) return 10; return 8;
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

    svg.append("rect").attr("width", w).attr("height", h).attr("fill", "#faf9f5");
    const g = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    const isInv = mapView === "investors";

    // Prepare data
    const nodes = companies.map(c => ({ ...c, r: nr(c, mapView) }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = edges.filter(e => nodeMap.has(e.s) && nodeMap.has(e.t)).map(e => ({
      source: e.s, target: e.t, ty: e.ty, l: e.l,
    }));

    // Simulation — adjust forces for investor view
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance(d => isInv && d.ty === "investment" ? 160 : 80)
        .strength(0.3))
      .force("charge", d3.forceManyBody().strength(d => isInv && d.cat === "investor" ? -d.r * 30 : -120))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(d => d.r + (isInv && d.cat === "investor" ? 16 : 14)))
      .force("x", d3.forceX(w / 2).strength(0.04))
      .force("y", d3.forceY(h / 2).strength(0.04));
    simRef.current = sim;

    // Draw edges
    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", d => EDGE_COLORS[d.ty] || "#ccc")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", d => d.ty === "partnership" ? "4 3" : "none");

    // Draw nodes
    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .attr("class", "node-g")
      .attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Glow for investors in investor view
    if (isInv) {
      node.filter(d => d.cat === "investor").append("circle")
        .attr("r", d => d.r + 4).attr("fill", "none")
        .attr("stroke", d => CC[d.cat]?.c || "#999").attr("stroke-width", 2.5)
        .attr("stroke-opacity", 0.3)
        .attr("filter", "none");
    }

    // Main circle
    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (isInv && d.cat === "investor") return (CC[d.cat]?.c || "#999");
        return CC[d.cat]?.c || "#999";
      })
      .attr("stroke", d => selected?.id === d.id ? "#C15F3C" : "white")
      .attr("stroke-width", d => {
        if (selected?.id === d.id) return 3;
        if (isInv && d.cat === "investor") return 2.5;
        return 1.5;
      })
      .attr("opacity", d => isInv && d.cat === "investor" ? 1 : 0.85);

    // Emoji icon inside
    node.append("text")
      .text(d => CC[d.cat]?.i || "")
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
      .attr("font-family", "'Inter', sans-serif")
      .attr("font-weight", d => isInv && d.cat === "investor" ? 700 : 500)
      .attr("fill", d => isInv && d.cat === "investor" ? "#1a1a18" : "#4a4a45")
      .attr("pointer-events", "none");

    // Click handler
    node.on("click", (e, d) => { e.stopPropagation(); onSelect(d); });
    svg.on("click", () => onSelect(null));

    // Shared highlight function
    const applyHighlight = (activeId) => {
      if (!activeId) {
        node.attr("opacity", 1);
        link.attr("stroke-opacity", 0.4).attr("stroke-width", 1.5);
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
          .attr("stroke-opacity", active ? 0.7 : 0.03)
          .attr("stroke-width", active ? 2.5 : 0.7);
      });
    };

    // Store ref for selection highlight
    svg.node().__applyHighlight = applyHighlight;

    // Hover highlight — persists selection on leave
    node.on("mouseenter", (e, d) => {
      applyHighlight(d.id);
    }).on("mouseleave", () => {
      // If something is selected, highlight that instead of clearing
      if (selected) {
        applyHighlight(selected.id);
      } else {
        applyHighlight(null);
      }
    });

    // Apply initial selection highlight if company is selected
    if (selected) {
      // Small delay to let simulation place nodes
      setTimeout(() => applyHighlight(selected.id), 100);
    }

    // Tick
    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [companies, edges, selected, isMobile, mapView]);

  return (
    <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
  );
}
