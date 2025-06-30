import { type propertyValuationRange } from '@/ai/flows/property-valuation';
import { type propertySummary } from '@/ai/flows/property-summary';

export type ValuationResult = Awaited<ReturnType<typeof propertyValuationRange>>;
export type SummaryResult = Awaited<ReturnType<typeof propertySummary>>;

export type PropertyInputSchema = {
  address: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: number;
};

export type SummaryDetails = {
  location: { score: number; details: string };
  utilities: { score: number; details: string };
  planning: { score: number; details: string };
  legal: { score: number; details: string };
  quality: { score: number; details: string };
};

export type CombinedResult = {
  valuation: ValuationResult;
  summary: SummaryResult;
  summaryDetails: SummaryDetails;
};
