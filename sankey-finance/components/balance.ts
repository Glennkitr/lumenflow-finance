import type { LinkRow } from "./types";

export function computeBalance(linkRows: LinkRow[], tol = 1e-2) {
  const inSum = new Map<string, number>();
  const outSum = new Map<string, number>();

  for (const r of linkRows) {
    const v = Number.isFinite(r.current) ? r.current : 0;
    outSum.set(r.from, (outSum.get(r.from) ?? 0) + v);
    inSum.set(r.to, (inSum.get(r.to) ?? 0) + v);
  }

  const nodes = new Set<string>([
    ...Array.from(inSum.keys()),
    ...Array.from(outSum.keys()),
  ]);

  const notBalanced: string[] = [];
  for (const n of nodes) {
    const ins = inSum.get(n) ?? 0;
    const outs = outSum.get(n) ?? 0;

    const isIntermediate = ins > 0 && outs > 0;
    if (!isIntermediate) continue;

    if (Math.abs(ins - outs) > tol) notBalanced.push(n);
  }

  return { ok: notBalanced.length === 0, notBalanced };
}
