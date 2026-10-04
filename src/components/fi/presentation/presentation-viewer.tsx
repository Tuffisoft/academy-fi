/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/fi/elements/ThemeToggle";
import { LanguageToggle } from "@/components/fi/elements/LanguageToggle";
import { DropdownMenuPortalContainerProvider } from "@/components/ui/dropdown-menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { NavigationProvider } from "@/components/fi/presentation/reveal";

export function PresentationViewer({
  title,
  slides,
}: {
  title: string;
  slides: React.ReactNode[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Drives the full-viewport layout directly; the native Fullscreen API is only a best-effort enhancement.
  const [isExpanded, setIsExpanded] = useState(false);
  // The Fullscreen API hides anything outside the fullscreen element, so portals
  // (dropdowns) must render inside this node once it goes fullscreen.
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const advanceHandlersRef = useRef<Map<number, () => void>>(new Map());

  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        setIsExpanded(false);
        setPortalContainer(null);
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => carouselApi.off("select", onSelect);
  }, [carouselApi]);

  const toggleFullscreen = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      setPortalContainer(null);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else {
      setIsExpanded(true);
      setPortalContainer(containerRef.current);
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, [isExpanded]);

  const registerAdvance = useCallback((index: number, advance: () => void) => {
    advanceHandlersRef.current.set(index, advance);
    return () => {
      advanceHandlersRef.current.delete(index);
    };
  }, []);

  // Used by a slide's own ClickSteps once its reveals are exhausted.
  const handleScrollNext = useCallback(() => {
    carouselApi?.scrollNext();
  }, [carouselApi]);

  const handlePrevSlide = useCallback(() => {
    carouselApi?.scrollPrev();
  }, [carouselApi]);

  // Keyboard "next" mirrors a click: advance the active slide's reveals first, then move on.
  const handleKeyboardNext = useCallback(() => {
    const advance = advanceHandlersRef.current.get(selectedIndex);
    if (advance) {
      advance();
    } else {
      handleScrollNext();
    }
  }, [selectedIndex, handleScrollNext]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input")) return;

      if (event.key === "Backspace" || event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrevSlide();
      } else if (
        event.key === "ArrowRight" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        handleKeyboardNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevSlide, handleKeyboardNext]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-6",
        isExpanded
          ? "fixed inset-0 z-50 h-screen w-screen items-center justify-center bg-background overflow-visible pointer-events-none"
          : "w-full max-w-4xl",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          isExpanded &&
            "absolute top-4 right-4 left-4 z-50 pointer-events-auto",
        )}
      >
        <h1 className={cn("text-2xl font-semibold", isExpanded && "hidden")}>
          {title}
        </h1>
        <DropdownMenuPortalContainerProvider container={portalContainer}>
          <div
            className={cn(
              "ml-auto flex items-center gap-2",
              isExpanded && "pointer-events-auto",
            )}
          >
            <div className="pointer-events-auto">
              <ModeToggle />
            </div>
            <div className="pointer-events-auto">
              <LanguageToggle />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="pointer-events-auto"
            >
              {isExpanded ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </DropdownMenuPortalContainerProvider>
      </div>
      <Carousel
        className={cn(
          "w-full",
          isExpanded && "max-w-[min(92vw,164vh)] px-14 pointer-events-none",
        )}
        setApi={setCarouselApi}
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              className={isExpanded ? "pointer-events-auto" : ""}
            >
              <NavigationProvider
                onNextSlide={handleScrollNext}
                index={index}
                registerAdvance={registerAdvance}
              >
                {slide}
              </NavigationProvider>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className={isExpanded ? "pointer-events-auto" : ""} />
        <CarouselNext className={isExpanded ? "pointer-events-auto" : ""} />
      </Carousel>
    </div>
  );
}
