/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HoverTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  children: React.ReactNode;
}

interface Position {
  left: number;
  top: number;
}

export function HoverTooltip({ visible, x, y, children }: HoverTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 0, top: 0 });

  // Track prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current || typeof window === "undefined") return;

    const OFFSET = 14;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const rect = tooltipRef.current.getBoundingClientRect();

    let left = x + OFFSET;
    let top = y + OFFSET;

    // Flip horizontally if overflowing right
    if (left + rect.width > viewportWidth - 8) {
      left = x - rect.width - OFFSET;
    }
    // Clamp to left edge
    if (left < 8) {
      left = 8;
    }

    // Flip vertically if overflowing bottom
    if (top + rect.height > viewportHeight - 8) {
      top = y - rect.height - OFFSET;
    }
    // Clamp to top edge
    if (top < 8) {
      top = 8;
    }

    setPosition({ left, top });
  }, [visible, x, y]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const className = [
    "hover-tooltip",
    visible ? "hover-tooltip--visible" : "hover-tooltip--hidden",
    reducedMotion ? "hover-tooltip--reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      ref={tooltipRef}
      className={className}
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export default HoverTooltip;


