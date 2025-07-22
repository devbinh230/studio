import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Utility, UtilityType } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert utilities data from API to amenities list for AI flows
 * @param utilities - Utilities data from utilities API
 * @returns Array of amenity descriptions for AI processing
 */
export function convertUtilitiesToAmenities(utilities?: {
  total: number;
  data: Utility[];
  groupedData: Record<UtilityType, Utility[]>;
}): string[] {
  if (!utilities || !utilities.data || utilities.data.length === 0) {
    return [];
  }

  const amenities: string[] = [];
  const { groupedData } = utilities;

  // Map utility types to Vietnamese descriptions with counts
  const typeMap: Record<UtilityType, string> = {
    hospital: "bệnh viện",
    market: "chợ/siêu thị",
    restaurant: "nhà hàng",
    cafe: "quán cafe",
    supermarket: "siêu thị",
    commercial_center: "trung tâm thương mại"
  };

  // Convert each utility type to amenity description
  Object.entries(groupedData).forEach(([type, utilitiesList]) => {
    if (utilitiesList && utilitiesList.length > 0) {
      const typeName = typeMap[type as UtilityType];
      const count = utilitiesList.length;
      const closestDistance = Math.min(...utilitiesList.map(u => u.distance));
      
      // Create descriptive amenity text
      if (count === 1) {
        amenities.push(`${typeName} (cách ${closestDistance.toFixed(1)}km)`);
      } else {
        amenities.push(`${count} ${typeName} (gần nhất cách ${closestDistance.toFixed(1)}km)`);
      }
    }
  });

  // Add general convenience descriptions based on total utilities count
  const totalCount = utilities.total;
  if (totalCount >= 10) {
    amenities.push("khu vực có nhiều tiện ích xung quanh");
  } else if (totalCount >= 5) {
    amenities.push("khu vực có đầy đủ tiện ích cơ bản");
  } else if (totalCount >= 1) {
    amenities.push("khu vực có một số tiện ích");
  }

  return amenities;
}

/**
 * Enhanced mergeDetails function with utilities integration
 * @param originalDetails - Original property details
 * @param utilitiesData - Utilities data from API
 * @returns Enhanced merged details with amenities from utilities
 */
export function mergeDetailsWithUtilities(
  originalDetails: any,
  utilitiesData?: {
    total: number;
    data: Utility[];
    groupedData: Record<UtilityType, Utility[]>;
  }
) {
  const amenities = convertUtilitiesToAmenities(utilitiesData);
  
  return {
    ...originalDetails,
    amenities,
    utilities: utilitiesData || null,
    // Keep existing amenities if they exist, merge with new ones
    combinedAmenities: [
      ...(originalDetails.amenities || []),
      ...amenities
    ].filter((item, index, self) => self.indexOf(item) === index) // Remove duplicates
  };
}

// Helper function to extract AI data and transform it to match component expectations
export function extractAIData(rawData: any) {
  const result: any = {
    success: true,
    error: null,
    // Copy original data structure for compatibility
    ...rawData
  };

  // Transform ai_valuation data structure to match component expectations
  if (rawData.ai_valuation?.success && rawData.ai_valuation.result?.valuation) {
    result.ai_valuation = {
      success: true,
      data: {
        lowValue: rawData.ai_valuation.result.valuation.lowValue || 0,
        reasonableValue: rawData.ai_valuation.result.valuation.reasonableValue || 0,
        highValue: rawData.ai_valuation.result.valuation.highValue || 0,
        price_house: rawData.ai_valuation.result.valuation.price_house || 0,
        // Additional property info
        property_info: rawData.ai_valuation.result.property_info || {},
        market_context: rawData.ai_valuation.result.market_context || {}
      }
    };
  }

  // Transform ai_analysis data structure to match component expectations  
  if (rawData.ai_analysis?.success && rawData.ai_analysis.result?.radarScore) {
    result.ai_analysis = {
      success: true,
      data: {
        radarScore: {
          locationScore: rawData.ai_analysis.result.radarScore.locationScore || 0,
          legalityScore: rawData.ai_analysis.result.radarScore.legalityScore || 0,
          liquidityScore: rawData.ai_analysis.result.radarScore.liquidityScore || 0,
          evaluationScore: rawData.ai_analysis.result.radarScore.evaluationScore || 0,
          dividendScore: rawData.ai_analysis.result.radarScore.dividendScore || 0,
          descriptions: rawData.ai_analysis.result.radarScore.descriptions || []
        }
      }
    };
  }

  return result;
}

// Helper function to safely format currency
export function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return '0 đ';
  
  if (value >= 1000000000) {
    const billions = (value / 1000000000).toFixed(1);
    return `${billions} Tỷ`;
  } else if (value >= 1000000) {
    const millions = (value / 1000000).toFixed(0);
    return `${millions} Triệu`;
  } else if (value >= 1000) {
    const thousands = (value / 1000).toFixed(0);
    return `${thousands}K`;
  }
  return `${Math.round(value)} đ`;
}

// Helper function to extract key insights from AI analysis
export function extractKeyInsights(aiData: any) {
  const insights = {
    valuation: {
      lowValue: 0,
      reasonableValue: 0,
      highValue: 0,
      price_house: 0,
      formattedLow: '0 đ',
      formattedReasonable: '0 đ', 
      formattedHigh: '0 đ',
      formattedPriceHouse: '0 đ'
    },
    analysis: {
      locationScore: 0,
      legalityScore: 0,
      liquidityScore: 0,
      evaluationScore: 0,
      dividendScore: 0,
      overallScore: 0,
      descriptions: []
    },
    propertyInfo: {},
    marketContext: {}
  };

  // Extract valuation data
  if (aiData.ai_valuation?.success && aiData.ai_valuation.result?.valuation) {
    const valuation = aiData.ai_valuation.result.valuation;
    insights.valuation = {
      lowValue: valuation.lowValue || 0,
      reasonableValue: valuation.reasonableValue || 0,
      highValue: valuation.highValue || 0,
      price_house: valuation.price_house || 0,
      formattedLow: formatCurrency(valuation.lowValue || 0),
      formattedReasonable: formatCurrency(valuation.reasonableValue || 0),
      formattedHigh: formatCurrency(valuation.highValue || 0),
      formattedPriceHouse: formatCurrency(valuation.price_house || 0)
    };

    insights.propertyInfo = aiData.ai_valuation.result.property_info || {};
    insights.marketContext = aiData.ai_valuation.result.market_context || {};
  }

  // Extract analysis data
  if (aiData.ai_analysis?.success && aiData.ai_analysis.result?.radarScore) {
    const radar = aiData.ai_analysis.result.radarScore;
    insights.analysis = {
      locationScore: radar.locationScore || 0,
      legalityScore: radar.legalityScore || 0,
      liquidityScore: radar.liquidityScore || 0,
      evaluationScore: radar.evaluationScore || 0,
      dividendScore: radar.dividendScore || 0,
      overallScore: (
        (radar.locationScore || 0) +
        (radar.legalityScore || 0) +
        (radar.liquidityScore || 0) +
        (radar.evaluationScore || 0) +
        (radar.dividendScore || 0)
      ) / 5,
      descriptions: radar.descriptions || []
    };
  }

  return insights;
}

/**
 * Calculate tile X and Y coordinates from latitude and longitude at a specific zoom level
 */
export function latLngToTileXY(lat: number, lng: number, zoom = 20) {
  const n = 2 ** zoom;
  const xtile = Math.floor(((lng + 180) / 360) * n);
  const ytile = Math.floor(
    (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * n
  );
  return { x: xtile, y: ytile };
}

/**
 * Generate planning map image URLs from latitude and longitude
 */
export function generatePlanningMapUrls(lat: number, lng: number, zoom = 20) {
  const { x, y } = latLngToTileXY(lat, lng, zoom);
  
  // Default planning map URLs without cache parameter
  return {
    qh2030: `https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/${zoom}/${x}/${y}.png`,
    qh500: `https://s3-han02.fptcloud.com/guland/hn-qhxd-2/${zoom}/${x}/${y}.png`,
    qhPK: `https://s3-hn-2.cloud.cmctelecom.vn/guland4/hanoi-qhpk2/${zoom}/${x}/${y}.png`
  };
}

/**
 * Generate a mosaic of planning map tiles (3x3)
 */
export function generatePlanningMapMosaicUrls(lat: number, lng: number, zoom = 20) {
  const { x, y } = latLngToTileXY(lat, lng, zoom);
  const delta = [-1, 0, 1];
  
  // Create URLs for each template without cache parameter
  return {
    qh2030: delta.flatMap(dx => 
      delta.map(dy => 
        `https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/${zoom}/${x + dx}/${y + dy}.png`
      )
    ),
    qh500: delta.flatMap(dx => 
      delta.map(dy => 
        `https://s3-han02.fptcloud.com/guland/hn-qhxd-2/${zoom}/${x + dx}/${y + dy}.png`
      )
    ),
    qhPK: delta.flatMap(dx => 
      delta.map(dy => 
        `https://s3-hn-2.cloud.cmctelecom.vn/guland4/hanoi-qhpk2/${zoom}/${x + dx}/${y + dy}.png`
      )
    )
  };
}

/**
 * Extract plain text from HTML string
 */
export function extractTextFromHtml(html: string): string {
  // If in browser environment
  if (typeof document !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }
  
  // Server-side fallback - simple regex to remove HTML tags
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}
