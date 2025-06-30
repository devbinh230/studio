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
      'Comparable properties in the area have sold for between $450,000 and $550,000 in the last 3 months. The market is currently stable with a slight upward trend. Properties near public transport and good schools tend to sell for a premium.';

    const valuationPromise = propertyValuationRange({
      ...validatedFields.data,
      marketData,
    });

    const summaryDetails = {
      location: {
        score: 8,
        details:
          'Located in a quiet suburb with good access to downtown. Low crime rate and within the boundary of a well-regarded school district. Close to two parks and a community center.',
      },
      utilities: {
        score: 9,
        details:
          'Excellent access to utilities. 5-minute walk to the nearest supermarket and pharmacy. A large hospital is a 10-minute drive away. Multiple cafes and restaurants nearby.',
      },
      planning: {
        score: 7,
        details:
          'The area is zoned for residential use with no major construction planned nearby, ensuring neighborhood stability. Some commercial rezoning is expected on the main boulevard, which may increase traffic.',
      },
      legal: {
        score: 10,
        details:
          'Clear title with all legal documents (Red Book equivalent) in order. No outstanding liens or encumbrances on the property. Property taxes are fully paid up to date.',
      },
      quality: {
        score: 6,
        details:
          'The building is structurally sound but shows signs of age. The roof was replaced 5 years ago, but the HVAC system is over 15 years old and may need replacement soon. Cosmetic updates are recommended.',
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
