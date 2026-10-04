"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "cn";

const StepContext = createContext(0);
const NavigationContext = createContext<{
  onNextSlide?: () => void;
  index?: number;
  registerAdvance?: (index: number, advance: () => void) => () => void;
} | null>(null);

export function useRevealStep() {
  return useContext(StepContext);
}

export function useSlideNavigation() {
  return useContext(NavigationContext);
}

/** Wrap a slide's clickable region; each click (outside buttons/links) advances the reveal step. */
export function ClickSteps({
  children,
  className,
  maxSteps,
}: {
  children: ReactNode;
  className?: string;
  maxSteps?: number;
}) {
  const [step, setStep] = useState(0);
  const navigation = useSlideNavigation();

  const triggerAdvance = useCallback(() => {
    if (maxSteps !== undefined && step >= maxSteps) {
      navigation?.onNextSlide?.();
    } else {
      setStep((current) => current + 1);
    }
  }, [step, maxSteps, navigation]);

  // Lets keyboard "next" mirror a click on whichever slide is currently active.
  useEffect(() => {
    if (!navigation?.registerAdvance || navigation.index === undefined) return;
    return navigation.registerAdvance(navigation.index, triggerAdvance);
  }, [navigation, triggerAdvance]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, textarea, input, label")) return;
    triggerAdvance();
  };

  return (
    <div className={className} onClick={handleClick}>
      <StepContext.Provider value={step}>{children}</StepContext.Provider>
    </div>
  );
}

export function NavigationProvider({
  children,
  onNextSlide,
  index,
  registerAdvance,
}: {
  children: ReactNode;
  onNextSlide?: () => void;
  index?: number;
  registerAdvance?: (index: number, advance: () => void) => () => void;
}) {
  return (
    <NavigationContext.Provider value={{ onNextSlide, index, registerAdvance }}>
      {children}
    </NavigationContext.Provider>
  );
}

/** Reveals its children once the enclosing ClickSteps has been clicked `at` times. */
export function ClickReveal({
  at,
  children,
  className,
}: {
  at: number;
  children: ReactNode;
  className?: string;
}) {
  const step = useRevealStep();

  return (
    <AnimatePresence>
      {step >= at && (
        <motion.div
          className={className}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Plays automatically on mount, staggered by `index`. */
export function AutoReveal({
  index = 0,
  children,
  className,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Crossfades between `steps` entries as the enclosing ClickSteps advances; the last entry sticks once reached. */
export function StepVisual({
  steps,
  className,
}: {
  steps: ReactNode[];
  className?: string;
}) {
  const step = useRevealStep();
  const index = Math.min(step, steps.length - 1);

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {steps[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
