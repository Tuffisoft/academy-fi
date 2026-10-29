import type { LeadSearchStatus } from "@/generated/prisma/enums";

export type SavedLeadSummary = {
  id: string;
  userId: string;
  placeId: string;
  sourceSearchId: string | null;
  createdAt: string;
  authorName: string;
  location: string | null;
  industry: string | null;
};

export type LeadSearchSummary = {
  id: string;
  userId: string;
  location: string;
  industry: string;
  radiusKm: number;
  maxResults: number;
  analyzeWebsites: boolean;
  status: LeadSearchStatus;
  createdAt: string;
  authorName: string;
  resultCount: number;
  placeIds?: string[];
  runId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  phase: string | null;
  processedPages: number;
  pauseRequested: boolean;
  errorCode: string | null;
  resultLimit: boolean;
};
