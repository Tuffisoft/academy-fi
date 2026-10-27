"use client";
import { useEffect } from "react";
import { programHistory } from "@/lib/loyalty/program-history";

export function ProgramHistoryTracker() {
  // Intentionally document-wide: earlier/later app entries must be tracked too.
  useEffect(() => {
    programHistory();
  }, []);
  return null;
}
