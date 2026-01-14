"use client";

import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
import type { LinkRow } from "./types";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import HoverTooltip from "./HoverTooltip";
import { useResizeObserver } from "./hooks/useResizeObserver";

const LINK_SEPARATOR = "→";

interface SelectedLink {
  source: string;
  target: string;
}

interface NodeStyle {
  fill: string;
}

interface LinkStyle {
  stroke: string;
  opacity: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  value?: string;
  yoy?: string;
}

interface ZoomTransformLike {
  k: number;
  x: number;
  y: number;
}

interface Props {
  title: string;
  rows: LinkRow[];
  svgRef?: React.Ref<SVGSVGElement>;
  selectedNodeId?: string | null;
  selectedLink?: SelectedLink | null;
  nodeStyles?: Record<string, NodeStyle>;
  linkStyles?: Record<string, LinkStyle>;
  flowAnimation?: boolean;
  fullscreen?: boolean;
  transform?: ZoomTransformLike;
  onTransformChange?: (t: ZoomTransformLike) => void;
  // Optional manual-adjust hooks from the editor; currently not used
  nodeOffsets?: Record<string, number>;
  onNodeOffsetChange?: (id: string, offset: number) => void;
  onSelectNode?: (id: string) => void;
  onSelectLink?: (source: string, target: string) => void;
}

function linkColor(to: string) {
  const t = to.toLowerCase();
  if (t.includes("profit")) return "#16a34a"; // green
  if (t.includes("expense") || t.includes("cost") || t.includes("tax")) return "#e11d48"; // pink/red
  return "#9ca3af"; // gray
}

function makeLinkKey(source: string, target: string): string {
  return `${source}${LINK_SEPARATOR}${target}`;
}

export default function SankeyChart({
  title,
  rows,
  svgRef,
  selectedNodeId,
  selectedLink,
  nodeStyles,
  linkStyles,
  flowAnimation,
  fullscreen,
  transform,
  onTransformChange,
  onSelectNode,
  onSelectLink,
}: Props) {
  const margin = { top: 60, right: 40, bottom: 40, left: 40 };

  // Measure width of the available container; derive height to avoid feedback loops
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const baseWidth = containerWidth || 900;
  const width = Math.max(baseWidth, 480);

  // Use a responsive aspect ratio, with sensible minimums
  const baseHeightFromWidth = Math.round(width * 0.6);
  const height = fullscreen
    ? Math.max(baseHeightFromWidth, 480)
    : Math.max(baseHeightFromWidth, 420);

  const nodesSet = new Set<string>();
  rows.forEach((r) => {
    nodesSet.add(r.from);
    nodesSet.add(r.to);
  });
  const nodes = Array.from(nodesSet).map((id) => ({ id }));

  const links = rows
    .filter((r) => r.from.trim() && r.to.trim() && r.current > 0)
    .map((r) => ({
      source: r.from,
      target: r.to,
      value: r.current,
      comparison: r.comparison,
    }));

  // Build sankey graph
  const graph = useMemo(() => {
    const sankeyGen = d3Sankey<any, any>()
      .nodeId((d: any) => d.id)
      .nodeWidth(18)
      .nodePadding(16)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    return sankeyGen({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });
  }, [height, links, margin.bottom, margin.left, margin.right, margin.top, nodes, width]);

  // compute node totals + YoY based on incoming current & incoming comparison
  const inCurrent = new Map<string, number>();
  const inComp = new Map<string, number>();

  for (const r of rows) {
    inCurrent.set(r.to, (inCurrent.get(r.to) ?? 0) + (r.current || 0));
    if (typeof r.comparison === "number") {
      inComp.set(r.to, (inComp.get(r.to) ?? 0) + r.comparison);
    }
  }

  const fmtMoney = (v: number) => `$${Math.round(v)}M`;
  const fmtPct = (p: number) => `${Math.round(p)}% Y/Y`;

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
  });

  const internalSvgRef = useRef<SVGSVGElement | null>(null);
  const [internalTransform, setInternalTransform] = useState<d3.ZoomTransform | null>(null);

  const handleSvgRef = (node: SVGSVGElement | null) => {
    internalSvgRef.current = node;
    if (!svgRef) return;
    if (typeof svgRef === "function") {
      svgRef(node);
    } else if ("current" in svgRef) {
      (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
    }
  };

  useEffect(() => {
    if (!transform) return;
    const t = d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k);
    setInternalTransform(t);
    if (internalSvgRef.current) {
      d3.select(internalSvgRef.current).call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        t,
      );
    }
  }, [transform?.k, transform?.x, transform?.y]);

  useEffect(() => {
    if (!internalSvgRef.current) return;

    const svgSelection = d3.select(internalSvgRef.current);

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        const t = event.transform;
        setInternalTransform(t);
        if (onTransformChange) {
          onTransformChange({
            k: t.k,
            x: t.x,
            y: t.y,
          });
        }
      })
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" && (event as MouseEvent).button === 0) {
          return true;
        }
        if (event.type === "dblclick") return true;
        return false;
      });

    svgSelection.call(zoomBehavior as any);

    svgSelection.on("dblclick.zoom", null);
    svgSelection.on("dblclick.zoom", (event) => {
      event.preventDefault();
      const t = d3.zoomIdentity;
      svgSelection.transition().duration(250).call(zoomBehavior.transform, t);
      setInternalTransform(t);
      if (onTransformChange) {
        onTransformChange({ k: t.k, x: t.x, y: t.y });
      }
    });

    return () => {
      svgSelection.on(".zoom", null);
    };
  }, [onTransformChange]);

  const appliedTransform = internalTransform ?? d3.zoomIdentity;

  return (
    <div
      ref={containerRef}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 26, marginTop: 6 }}>
        {title}
      </div>

      <svg
        ref={handleSvgRef}
        width={width}
        height={height}
        style={{ display: "block", margin: "0 auto" }}
      >
        <g
          transform={`translate(${appliedTransform.x},${appliedTransform.y}) scale(${appliedTransform.k})`}
        >
          {/* Links */}
          <g fill="none">
          {graph.links.map((l: any, i: number) => {
            const sourceId =
              typeof l.source === "object" && l.source !== null
                ? l.source.id
                : String(l.source);
            const targetId =
              typeof l.target === "object" && l.target !== null
                ? l.target.id
                : String(l.target);

            const key = makeLinkKey(sourceId, targetId);
            const customStyle = linkStyles?.[key];

            const baseStroke = linkColor(targetId);
            const stroke = customStyle?.stroke ?? baseStroke;
            const baseOpacity = 0.45;
            const opacity = customStyle?.opacity ?? baseOpacity;

            const isSelected =
              selectedLink !== undefined &&
              selectedLink !== null &&
              selectedLink.source === sourceId &&
              selectedLink.target === targetId;

            const strokeWidth = Math.max(1, l.width) + (isSelected ? 2 : 0);
            const strokeOpacity = isSelected
              ? Math.min(1, opacity + 0.25)
              : opacity;

            const pathD = sankeyLinkHorizontal()(l) as string;

            return (
              <g key={key}>
                <path
                  d={pathD}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  style={{ cursor: onSelectLink ? "pointer" : "default" }}
                  onClick={() => {
                    if (onSelectLink) {
                      onSelectLink(sourceId, targetId);
                    }
                  }}
                />
                {flowAnimation && (
                  <path
                    d={pathD}
                    stroke="#f9fafb"
                    strokeWidth={Math.max(1, l.width) * 0.4}
                    strokeOpacity={0.18}
                    className="sankey-link-shimmer"
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
          </g>

          {/* Nodes */}
          <g>
          {graph.nodes.map((n: any, i: number) => {
            const w = n.x1 - n.x0;
            const h = n.y1 - n.y0;

            const isSelected =
              selectedNodeId !== undefined &&
              selectedNodeId !== null &&
              n.id === selectedNodeId;

            const nodeStyle = nodeStyles?.[n.id];
            const fill = nodeStyle?.fill ?? "#111827";

            // label values
            const cur = inCurrent.get(n.id) ?? 0;
            const comp = inComp.get(n.id);
            const yoy =
              comp !== undefined && comp > 0 ? ((cur - comp) / comp) * 100 : undefined;

            const label = [
              n.id,
              cur > 0 ? fmtMoney(cur) : "",
              yoy !== undefined ? fmtPct(yoy) : "",
            ].filter(Boolean);

            return (
              <g key={i}>
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={w}
                  height={h}
                  fill={fill}
                  opacity={0.85}
                  rx={3}
                  stroke={isSelected ? "#fbbf24" : "none"}
                  strokeWidth={isSelected ? 3 : 0}
                  style={{ cursor: onSelectNode ? "pointer" : "default" }}
                  onMouseEnter={(event) => {
                    const curVal = inCurrent.get(n.id) ?? 0;
                    const compVal = inComp.get(n.id);
                    const yoyVal =
                      compVal !== undefined && compVal > 0
                        ? ((curVal - compVal) / compVal) * 100
                        : undefined;

                    setTooltip({
                      visible: true,
                      x: event.clientX,
                      y: event.clientY,
                      title: String(n.id),
                      value: curVal > 0 ? fmtMoney(curVal) : undefined,
                      yoy: yoyVal !== undefined ? fmtPct(yoyVal) : undefined,
                    });
                  }}
                  onMouseMove={(event) => {
                    setTooltip((prev) => ({
                      ...prev,
                      visible: true,
                      x: event.clientX,
                      y: event.clientY,
                    }));
                  }}
                  onMouseLeave={() => {
                    setTooltip((prev) => ({
                      ...prev,
                      visible: false,
                    }));
                  }}
                  onClick={() => {
                    if (onSelectNode) {
                      onSelectNode(n.id as string);
                    }
                  }}
                />
                <text
                  x={n.x0 < width / 2 ? n.x1 + 8 : n.x0 - 8}
                  y={n.y0 + h / 2}
                  textAnchor={n.x0 < width / 2 ? "start" : "end"}
                  dominantBaseline="middle"
                  style={{ fontSize: 12, fill: "#111827", fontWeight: 600 }}
                >
                  {label.map((line, idx) => (
                    <tspan
                      key={idx}
                      x={n.x0 < width / 2 ? n.x1 + 8 : n.x0 - 8}
                      dy={idx === 0 ? 0 : 14}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          </g>
        </g>

        {/* watermark-ish */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          style={{ fontSize: 11, fill: "#9ca3af" }}
        >
          created with yourapp
        </text>
      </svg>

      <HoverTooltip visible={tooltip.visible} x={tooltip.x} y={tooltip.y}>
        <div className="hover-tooltip-content">
          <div className="hover-tooltip-title">{tooltip.title}</div>
          {tooltip.value && (
            <div className="hover-tooltip-row">
              <span className="hover-tooltip-label">Current</span>
              <span className="hover-tooltip-value">{tooltip.value}</span>
            </div>
          )}
          {tooltip.yoy && (
            <div className="hover-tooltip-row">
              <span className="hover-tooltip-label">YoY</span>
              <span className="hover-tooltip-value">{tooltip.yoy}</span>
            </div>
          )}
        </div>
      </HoverTooltip>
    </div>
  );
}
