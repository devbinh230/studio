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

// API Response types for new format
export type ApiValuationResult = {
  valuation_result: {
    evaluation: {
      address: {
        type: string;
        city: string;
        district: string;
        ward: string;
        administrativeLevel: number;
      };
      bathRoom: number;
      bedRoom: number;
      builtYear: number;
      cityCenterDistance: number;
      cityLevel: number;
      clusterPrices: number[][];
      createdDate: string;
      districtCenterDistance: number;
      districtLevel: number;
      facadeWidth: number;
      geoLocation: [number, number];
      hasGarden: boolean;
      homeQualityRemaining: number;
      houseArea: number;
      housePrice: number;
      landArea: number;
      laneWidth: number;
      legal: string;
      modifiedDate: string;
      ownerId: number;
      price: number;
      radarScore: {
        descriptions: string[];
        dividendScore: number;
        evaluationScore: number;
        legalityScore: number;
        liquidityScore: number;
        locationScore: number;
      };
      storyNumber: number;
      totalPrice: number;
      transId: number;
      type: string;
      year: number;
    };
  };
  [key: string]: any;
};

// Combined type that supports both old and new formats
export type CombinedResult = {
  valuation: ValuationResult;
  summary: SummaryResult;
  summaryDetails: SummaryDetails;
} | ApiValuationResult;
