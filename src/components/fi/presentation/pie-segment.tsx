"use client";

import { motion } from "motion/react";
import type { SVGProps } from "react";
import { useRevealStep } from "@/components/fi/presentation/reveal";

/** Fades in an SVG circle (e.g. a donut chart segment) once the enclosing ClickSteps reaches `at`. */
export function PieSegment({
  at,
  ...circleProps
}: { at: number } & SVGProps<SVGCircleElement>) {
  const step = useRevealStep();

  return (
    <motion.circle
      {...(circleProps as any)}
      initial={{ opacity: 0 }}
      animate={{ opacity: step >= at ? 1 : 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    />
  );
}
