import { IconContext } from "@phosphor-icons/react";
import { use } from "react";

import { cn } from "@/utils/style";

import type { ExtendedIconProps } from "../preview";

export function PageIcon({ icon, color, className }: { icon: string; color?: string; className?: string }) {
  const iconContext = use<ExtendedIconProps>(IconContext);

  if (!icon || iconContext.hidden) return null;

  return (
    <i
      className={cn("ph shrink-0", `ph-${icon}`, className)}
      style={{ fontSize: `${iconContext.size}px`, color: color || iconContext.color }}
    />
  );
}
