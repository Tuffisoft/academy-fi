import type { LeadSearchStatus } from "@/generated/prisma/enums";

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
};
