"use client";
 
import { useEffect, useMemo, useRef, useState } from "react";
import type { LinkRow } from "./types";
import DataTable from "./DataTable";
import SankeyChart from "./SankeyChart";
import { computeBalance } from "./balance";
import { downloadPng, downloadSvg } from "./exportUtils";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import FullscreenModal from "./FullscreenModal";

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

interface ChartTransform {
  k: number;
  x: number;
  y: number;
}

const seed: LinkRow[] = [
  { from: "Product A", to: "Revenue", current: 35, comparison: 30 },
  { from: "Product B", to: "Revenue", current: 10, comparison: 11 },
  { from: "Product C", to: "Revenue", current: 5, comparison: 4 },
  { from: "Revenue", to: "Gross profit", current: 30, comparison: 26 },
  { from: "Revenue", to: "Cost of revenue", current: 20, comparison: 19 },
  { from: "Gross profit", to: "Operating profit", current: 15, comparison: 12 },
  { from: "Gross profit", to: "Operating expenses", current: 15, comparison: 14 },
  { from: "Operating profit", to: "Net profit", current: 10, comparison: 8 },
  { from: "Operating profit", to: "Tax", current: 5, comparison: 4 },
];

function makeLinkKey(source: string, target: string): string {
  return `${source}${LINK_SEPARATOR}${target}`;
}

export default function SankeyEditor() {
  const [title, setTitle] = useState("Example Inc FY24 Income Statement");
  const [rows, setRows] = useState<LinkRow[]>(seed);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);
  const [nodeStyles, setNodeStyles] = useState<Record<string, NodeStyle>>({});
  const [linkStyles, setLinkStyles] = useState<Record<string, LinkStyle>>({});
  const [flowAnimation, setFlowAnimation] = useState<boolean>(false);
  const [manualAdjustEnabled, setManualAdjustEnabled] = useState<boolean>(false);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, number>>({});
  const [balanceAnimClass, setBalanceAnimClass] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartTransform, setChartTransform] = useState<ChartTransform | undefined>(
    undefined,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);

  const balance = useMemo(() => computeBalance(rows), [rows]);
  const debouncedRows = useDebouncedValue(rows, 200);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (balance.ok) {
      setBalanceAnimClass("balance-pulse");
      timeoutId = window.setTimeout(() => setBalanceAnimClass(""), 1000);
    } else {
      setBalanceAnimClass("balance-shake");
      timeoutId = window.setTimeout(() => setBalanceAnimClass(""), 300);
    }
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [balance.ok]);

  const handleRenameNode = (newIdRaw: string) => {
    const oldId = selectedNodeId;
    if (!oldId) return;

    const newId = newIdRaw.trim();
    if (!newId || newId === oldId) return;

    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        from: r.from === oldId ? newId : r.from,
        to: r.to === oldId ? newId : r.to,
      })),
    );

    setSelectedNodeId(newId);

    setNodeStyles((prev) => {
      if (!prev[oldId]) return prev;
      const next: Record<string, NodeStyle> = { ...prev };
      next[newId] = prev[oldId];
      delete next[oldId];
      return next;
    });

    setLinkStyles((prev) => {
      const next: Record<string, LinkStyle> = {};
      Object.keys(prev).forEach((key) => {
        const [source, target] = key.split(LINK_SEPARATOR);
        const newSource = source === oldId ? newId : source;
        const newTarget = target === oldId ? newId : target;
        const newKey = makeLinkKey(newSource, newTarget);
        next[newKey] = prev[key];
      });
      return next;
    });
  };

  // Fixed: Do not pass manualAdjustEnabled prop to SankeyChart--it is not recognized.
  // Rest same as before, tidied up to just return a single root.

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Scenario</div>
          <span className="panel-tag">Income statement</span>
        </div>

        <div className="panel-content">
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
            />
          </div>

          <div className="chart-shell">
            <div className="chart-header-row">
              <div>
                <div className="chart-title">Flow view</div>
                <div className="chart-subtitle">
                  YoY impact &amp; structural balance
                </div>
              </div>
              <div className="chart-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (!svgRef.current) return;
                    const safeTitle =
                      title.trim().replace(/\s+/g, "-") || "chart";
                    downloadSvg(svgRef.current, `${safeTitle}.svg`);
                  }}
                >
                  <span className="btn-icon">⇩</span>
                  <span>Export SVG</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => {
                    if (!svgRef.current) return;
                    const safeTitle =
                      title.trim().replace(/\s+/g, "-") || "chart";
                    try {
                      await downloadPng(
                        svgRef.current,
                        `${safeTitle}.png`,
                        2,
                      );
                    } catch (error) {
                      // eslint-disable-next-line no-console
                      console.error("Failed to export PNG", error);
                    }
                  }}
                >
                  <span className="btn-icon">⬇</span>
                  <span>Export PNG</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsFullscreen(true)}
                >
                  <span className="btn-icon">⛶</span>
                  <span>Full screen</span>
                </button>
              </div>
            </div>

            <div className="toggle-row" style={{ marginBottom: 6 }}>
              <span>Flow animation</span>
              <button
                type="button"
                className={`toggle-switch ${
                  flowAnimation ? "toggle-switch--on" : ""
                }`}
                onClick={() => setFlowAnimation((v) => !v)}
              >
                <span className="toggle-switch-thumb" />
              </button>
              <span>Manual adjust</span>
              <button
                type="button"
                className={`toggle-switch ${
                  manualAdjustEnabled ? "toggle-switch--on" : ""
                }`}
                onClick={() => setManualAdjustEnabled((v) => !v)}
              >
                <span className="toggle-switch-thumb" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon-only"
                onClick={() => {
                  setNodeOffsets({});
                }}
              >
                ↺
              </button>
            </div>

            <div className="chart-frame">
              <SankeyChart
                title={title}
                rows={debouncedRows}
                svgRef={svgRef}
                selectedNodeId={selectedNodeId}
                selectedLink={selectedLink}
                nodeStyles={nodeStyles}
                linkStyles={linkStyles}
                flowAnimation={flowAnimation}
                fullscreen={false}
                transform={chartTransform}
                onTransformChange={(t) => setChartTransform(t)}
                nodeOffsets={nodeOffsets}
                onNodeOffsetChange={(id: string, offset: number) => {
                  setNodeOffsets((prev) => ({
                    ...prev,
                    [id]: offset,
                  }));
                }}
                onSelectNode={(id) => {
                  setSelectedNodeId(id);
                  setSelectedLink(null);
                }}
                onSelectLink={(source, target) => {
                  setSelectedNodeId(null);
                  setSelectedLink({ source, target });
                }}
              />
            </div>
          </div>

          <div
            className={`chart-balance-bar ${
              balance.ok ? "chart-balance-bar--ok" : "chart-balance-bar--warn"
            } ${balanceAnimClass}`}
          >
            <span className="chart-balance-icon">
              {balance.ok ? "●" : "⚠"}
            </span>
            <span>
              {balance.ok
                ? "All nodes are balanced"
                : `Not balanced: ${balance.notBalanced.join(", ")}`}
            </span>
          </div>

          <div className="inspector-panel">
            <div className="inspector-title">Inspector</div>

            {!selectedNodeId && !selectedLink && (
              <div className="inspector-empty">
                Click a node or link in the chart to edit its properties.
              </div>
            )}

            {selectedNodeId && (
              <div className="inspector-row">
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Node
                </div>
                <label>
                  <span className="inspector-label">Name</span>
                  <input
                    value={selectedNodeId}
                    onChange={(e) => handleRenameNode(e.target.value)}
                    className="inspector-input"
                  />
                </label>
                <label>
                  <span className="inspector-label">Fill color</span>
                  <input
                    type="color"
                    value={nodeStyles[selectedNodeId]?.fill ?? "#111827"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNodeStyles((prev) => ({
                        ...prev,
                        [selectedNodeId]: { fill: value },
                      }));
                    }}
                    style={{
                      width: 40,
                      height: 24,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                    }}
                  />
                </label>
              </div>
            )}

            {!selectedNodeId && selectedLink && (
              <div className="inspector-row">
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Link
                </div>
                <div style={{ fontSize: 12 }}>
                  {selectedLink.source} → {selectedLink.target}
                </div>
                <label>
                  <span className="inspector-label">Stroke color</span>
                  <input
                    type="color"
                    value={
                      linkStyles[
                        makeLinkKey(selectedLink.source, selectedLink.target)
                      ]?.stroke ?? "#9ca3af"
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      const key = makeLinkKey(
                        selectedLink.source,
                        selectedLink.target,
                      );
                      setLinkStyles((prev) => {
                        const existing = prev[key];
                        const next: Record<string, LinkStyle> = {
                          ...prev,
                          [key]: {
                            stroke: value,
                            opacity: existing?.opacity ?? 0.45,
                          },
                        };
                        return next;
                      });
                    }}
                    style={{
                      width: 40,
                      height: 24,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                    }}
                  />
                </label>
                <label>
                  <span className="inspector-label">
                    Opacity (
                    {Math.round(
                      (linkStyles[
                        makeLinkKey(selectedLink.source, selectedLink.target)
                      ]?.opacity ?? 0.45) * 100,
                    )}
                    %)
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={
                      linkStyles[
                        makeLinkKey(selectedLink.source, selectedLink.target)
                      ]?.opacity ?? 0.45
                    }
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const key = makeLinkKey(
                        selectedLink.source,
                        selectedLink.target,
                      );
                      setLinkStyles((prev) => {
                        const existing = prev[key];
                        const next: Record<string, LinkStyle> = {
                          ...prev,
                          [key]: {
                            stroke: existing?.stroke ?? "#9ca3af",
                            opacity: value,
                          },
                        };
                        return next;
                      });
                    }}
                    className="inspector-range"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Input</div>
          <span className="panel-tag">Links</span>
        </div>
        <div className="panel-content">
          <DataTable rows={rows} onChange={setRows} />
        </div>
      </div>

      <FullscreenModal open={isFullscreen} onClose={() => setIsFullscreen(false)}>
        <div className="fullscreen-chart-layout">
          <div className="fullscreen-chart-header">
            <div className="fullscreen-chart-title-group">
              <div className="fullscreen-chart-title">{title}</div>
              <div className="fullscreen-chart-subtitle">
                Scroll to zoom • Drag to pan • Double-click to reset
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon-only fullscreen-close-button"
              onClick={() => setIsFullscreen(false)}
            >
              ×
            </button>
          </div>

          <div className="fullscreen-chart-body">
            <div className="fullscreen-chart-frame">
              <SankeyChart
                title={title}
                rows={debouncedRows}
                svgRef={svgRef}
                selectedNodeId={selectedNodeId}
                selectedLink={selectedLink}
                nodeStyles={nodeStyles}
                linkStyles={linkStyles}
                flowAnimation={flowAnimation}
                fullscreen
                transform={chartTransform}
                onTransformChange={(t) => setChartTransform(t)}
                nodeOffsets={nodeOffsets}
                onNodeOffsetChange={(id: string, offset: number) => {
                  setNodeOffsets((prev) => ({
                    ...prev,
                    [id]: offset,
                  }));
                }}
                onSelectNode={(id) => {
                  setSelectedNodeId(id);
                  setSelectedLink(null);
                }}
                onSelectLink={(source, target) => {
                  setSelectedNodeId(null);
                  setSelectedLink({ source, target });
                }}
              />
            </div>
          </div>
        </div>
      </FullscreenModal>
    </>
  );
}