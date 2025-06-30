'use server';

import { z } from 'zod';
import { propertyValuationRange } from '@/ai/flows/property-valuation';
import { propertySummary } from '@/ai/flows/property-summary';
import type { CombinedResult, PropertyInputSchema } from '@/lib/types';

const propertyInputSchema = z.object({
  address: z.string().min(5, 'Please enter a valid address.'),
  size: z.coerce.number().min(100, 'Size must be at least 100 sq ft.'),
  bedrooms: z.coerce.number().min(1, 'Must have at least 1 bedroom.'),
  bathrooms: z.coerce.number().min(1, 'Must have at least 1 bathroom.'),
  lotSize: z.coerce.number().min(100, 'Lot size must be at least 100 sq ft.'),
});

export async function getValuationAndSummary(
  data: PropertyInputSchema
): Promise<{ success: true; data: CombinedResult } | { success: false; error: string }> {
  const validatedFields = propertyInputSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid input. Please check the form fields.',
    };
  }

  try {
    const marketData =
      'The local market is currently experiencing high demand, with properties selling 5-10% above asking price. Recent infrastructure projects, including a new light rail station, have increased property values in the last 6 months. Average price per square foot is $285.';

    const valuationPromise = propertyValuationRange({
      ...validatedFields.data,
      marketData,
    });

    const summaryDetails = {
      location: {
        score: 9,
        details:
          'Prime downtown location, walking distance to financial district and entertainment venues. High walkability score. Some street noise is expected.',
      },
      utilities: {
        score: 7,
        details:
          'Well-served by public transport. Grocery stores are plentiful, but specialized shops require a short drive. A new clinic opened nearby recently.',
      },
      planning: {
        score: 8,
        details:
          'Area is part of a city revitalization plan, with new parks and public spaces planned. No major disruptive construction is scheduled in the immediate vicinity.',
      },
      legal: {
        score: 10,
        details:
          'Flawless legal status with all documents verified. No history of disputes or liens. Title is clear.',
      },
      quality: {
        score: 7,
        details:
          'Modern construction (built 2018). High-quality finishes. The shared building amenities (gym, pool) are well-maintained. Some minor cosmetic wear in common areas.',
      },
    };

    const summaryPromise = propertySummary({
      locationScore: summaryDetails.location.score,
      locationDetails: summaryDetails.location.details,
      utilitiesScore: summaryDetails.utilities.score,
      utilitiesDetails: summaryDetails.utilities.details,
      planningScore: summaryDetails.planning.score,
      planningDetails: summaryDetails.planning.details,
      legalScore: summaryDetails.legal.score,
      legalDetails: summaryDetails.legal.details,
      qualityScore: summaryDetails.quality.score,
      qualityDetails: summaryDetails.quality.details,
    });

    const [valuation, summary] = await Promise.all([
      valuationPromise,
      summaryPromise,
    ]);

    return { success: true, data: { valuation, summary, summaryDetails } };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: 'An unexpected error occurred while generating the valuation. Please try again later.',
    };
  }
}
