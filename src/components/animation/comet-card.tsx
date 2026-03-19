import type React from "react";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

import { cn } from "@/utils/style";

type Props = {
  rotateDepth?: number;
  translateDepth?: number;
  glareOpacity?: number;
  scaleFactor?: number;
  className?: string;
  children: React.ReactNode;
};

export const CometCard = ({
  rotateDepth = 17.5,
  translateDepth = 20,
  glareOpacity = 0.4,
  scaleFactor = 1.05,
  className,
  children,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`-${rotateDepth}deg`, `${rotateDepth}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`${rotateDepth}deg`, `-${rotateDepth}deg`]);

  const translateX = useTransform(mouseXSpring, [-0.5, 0.5], [`-${translateDepth}px`, `${translateDepth}px`]);
  const translateY = useTransform(mouseYSpring, [-0.5, 0.5], [`${translateDepth}px`, `-${translateDepth}px`]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.9) 10%, rgba(255, 255, 255, 0.75) 20%, rgba(255, 255, 255, 0) 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className={cn("perspective-distant transform-3d", className)}>
      <motion.div
        ref={ref}
        initial={{ scale: 1, z: 0 }}
        className="relative rounded-md"
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          translateX: translateX,
          translateY: translateY,
          willChange: "transform",
        }}
        whileHover={{ z: 50, scale: scaleFactor, transition: { duration: 0.2 } }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}

        <motion.div
          transition={{ duration: 0.2 }}
          style={{
            background: glareBackground,
            opacity: glareOpacity,
            willChange: "opacity",
          }}
          className="pointer-events-none absolute inset-0 z-50 h-full w-full rounded-md mix-blend-overlay"
        />
      </motion.div>
    </div>
  );
};
