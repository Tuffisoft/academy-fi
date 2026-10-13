"use client";

import { motion, type SVGMotionProps } from "motion/react";
import { useRevealStep } from "@/components/fi/presentation/reveal";

/** Fades in an SVG circle (e.g. a donut chart segment) once the enclosing ClickSteps reaches `at`. */
export function PieSegment({
  at,
  ...circleProps
}: { at: number } & SVGMotionProps<SVGCircleElement>) {
  const step = useRevealStep();

  return (
    <motion.circle
      {...circleProps}
      initial={{ opacity: 0 }}
      animate={{ opacity: step >= at ? 1 : 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    />
  );
}
