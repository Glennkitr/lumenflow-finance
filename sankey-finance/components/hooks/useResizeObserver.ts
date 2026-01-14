"use client";

import { useEffect, useRef, useState } from "react";

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>(): {
  ref: React.RefObject<T>;
  width: number;
  height: number;
} {
  // Use a non-null generic type but initialize with null via a type assertion.
  // This keeps the ref compatible with React element refs (which expect RefObject<T>)
  // while still guarding against a missing element at runtime.
  const ref = useRef<T>(null as unknown as T);
  const [{ width, height }, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const element = ref.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.contentRect;
        setSize({
          width: box.width,
          height: box.height,
        });
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width, height };
}

export default useResizeObserver;


