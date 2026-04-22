import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/utils/style";

interface FontDisplayProps {
  family: string;
  label: string;
  url?: string;
  type: "local" | "web";
}

const loadedFonts = new Set<string>();

export function FontDisplay({ family, label, url, type = "web" }: FontDisplayProps) {
  const previewName = type === "local" ? family : `${family} Preview`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(() => type === "local" || loadedFonts.has(previewName));
  const isInView = useInView(containerRef, { once: true, amount: 0.1, margin: "50px" });

  useEffect(() => {
    if (!isInView || isLoaded || !url) return;

    const fontFace = new FontFace(previewName, `url(${url})`, { display: "swap" });

    void fontFace.load().then((loadedFace) => {
      if (!document.fonts.has(loadedFace)) document.fonts.add(loadedFace);
      loadedFonts.add(previewName);
      setIsLoaded(true);
    });
  }, [isInView, isLoaded, previewName, url]);

  return (
    <div ref={containerRef} className="inline-flex items-baseline gap-2">
      <span
        style={{ fontFamily: isLoaded ? `'${previewName}', sans-serif` : "sans-serif" }}
        className={cn(isLoaded ? "opacity-100" : "opacity-50", "transition-opacity duration-200 ease-in")}
      >
        {label}
      </span>
      {label !== family && <span className="text-xs text-muted-foreground">{family}</span>}
    </div>
  );
}
