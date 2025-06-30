'use server';

/**
 * @fileOverview Estimates a property's value range (low, reasonable, high) based on its details and market data.
 *
 * - propertyValuationRange - A function that handles the property valuation process.
 * - PropertyValuationRangeInput - The input type for the propertyValuationRange function.
 * - PropertyValuationRangeOutput - The return type for the propertyValuationRange function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PropertyValuationRangeInputSchema = z.object({
  address: z.string().describe('The address of the property.'),
  size: z.number().describe('The size of the property in square feet.'),
  bedrooms: z.number().describe('The number of bedrooms in the property.'),
  bathrooms: z.number().describe('The number of bathrooms in the property.'),
  lotSize: z.number().describe('The size of the lot in square feet.'),
  marketData: z.string().describe('Current market data for comparable properties in the area.'),
});
export type PropertyValuationRangeInput = z.infer<typeof PropertyValuationRangeInputSchema>;

const PropertyValuationRangeOutputSchema = z.object({
  lowValue: z.number().describe('The minimum possible price for the property.'),
  reasonableValue: z.number().describe('The most likely price for the property.'),
  highValue: z.number().describe('The maximum achievable price for the property.'),
});
export type PropertyValuationRangeOutput = z.infer<typeof PropertyValuationRangeOutputSchema>;

export async function propertyValuationRange(input: PropertyValuationRangeInput): Promise<PropertyValuationRangeOutput> {
  return propertyValuationRangeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertyValuationRangePrompt',
  input: {schema: PropertyValuationRangeInputSchema},
  output: {schema: PropertyValuationRangeOutputSchema},
  prompt: `You are an expert real estate appraiser. Based on the property details and market data provided, estimate a value range for the property.

Property Details:
Address: {{{address}}}
Size: {{{size}}} sq ft
Bedrooms: {{{bedrooms}}}
Bathrooms: {{{bathrooms}}}
Lot Size: {{{lotSize}}} sq ft

Market Data:
{{{marketData}}}

Provide the estimated value range in the following format:
Low Value: [minimum possible price]
Reasonable Value: [most likely price]
High Value: [maximum achievable price]`,
});

const propertyValuationRangeFlow = ai.defineFlow(
  {
    name: 'propertyValuationRangeFlow',
    inputSchema: PropertyValuationRangeInputSchema,
    outputSchema: PropertyValuationRangeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
