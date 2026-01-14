"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FullscreenModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenModal({ open, onClose, children }: FullscreenModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const overlayClassNames = [
    "fullscreen-overlay",
    open ? "fullscreen-overlay--open" : "fullscreen-overlay--closed",
    reducedMotion ? "fullscreen-overlay--reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cardClassNames = [
    "fullscreen-card",
    open ? "fullscreen-card--open" : "fullscreen-card--closed",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={overlayClassNames}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={cardClassNames}>{children}</div>
    </div>,
    document.body,
  );
}

export default FullscreenModal;


