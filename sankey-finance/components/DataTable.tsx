"use client";

import type { LinkRow } from "./types";
import type React from "react";

type Props = {
  rows: LinkRow[];
  onChange: (rows: LinkRow[]) => void;
};

export default function DataTable({ rows, onChange }: Props) {
  const update = (idx: number, patch: Partial<LinkRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...rows,
      { from: "New source", to: "New target", current: 0, comparison: 0 },
    ]);
  };

  const delRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const num = (s: string) => {
    const v = Number(s);
    return Number.isFinite(v) ? v : 0;
  };

  return (
    <div className="table-shell">
      <div className="table-header">
        <div className="table-title">Data editor</div>
        <span className="panel-tag">{rows.length} rows</span>
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {["From", "To", "Amount, current", "Amount, comparison", ""].map(
                (h) => (
                  <th key={h}>{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="table-cell">
                  <input
                    value={r.from}
                    onChange={(e) => update(i, { from: e.target.value })}
                    className="table-input"
                  />
                </td>
                <td className="table-cell">
                  <input
                    value={r.to}
                    onChange={(e) => update(i, { to: e.target.value })}
                    className="table-input"
                  />
                </td>
                <td className="table-cell">
                  <input
                    inputMode="decimal"
                    value={String(r.current)}
                    onChange={(e) =>
                      update(i, { current: Math.max(0, num(e.target.value)) })
                    }
                    className="table-input"
                  />
                </td>
                <td className="table-cell">
                  <input
                    inputMode="decimal"
                    value={r.comparison === undefined ? "" : String(r.comparison)}
                    onChange={(e) =>
                      update(i, {
                        comparison:
                          e.target.value.trim() === ""
                            ? undefined
                            : Math.max(0, num(e.target.value)),
                      })
                    }
                    placeholder="(optional)"
                    className="table-input"
                  />
                </td>
                <td className="table-cell" style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => delRow(i)}
                    className="btn btn-ghost btn-icon-only"
                    title="Delete row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-actions-row">
        <button type="button" onClick={addRow} className="btn btn-ghost">
          <span className="btn-icon">＋</span>
          <span>Add row</span>
        </button>
        <div>{rows.length} active links</div>
      </div>

      <div style={{ fontSize: 11 }}>Data source notes</div>
      <input placeholder="" className="table-notes-input" />
    </div>
  );
}
