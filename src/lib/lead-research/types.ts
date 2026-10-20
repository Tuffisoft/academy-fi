import type { LeadSearchStatus } from "@/generated/prisma/enums";

export type SavedLeadSummary = {
  id: string;
  userId: string;
  placeId: string;
  sourceSearchId: string | null;
  createdAt: string;
  authorName: string;
};

export type LeadSearchSummary = {
  id: string;
  location: string;
  industry: string;
  radiusKm: number;
  maxResults: number;
  analyzeWebsites: boolean;
  status: LeadSearchStatus;
  createdAt: string;
  authorName: string;
  resultCount: number;
  runId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  phase: string | null;
  processedPages: number;
  errorCode: string | null;
  resultLimit: boolean;
};
