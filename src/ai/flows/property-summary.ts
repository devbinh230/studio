'use server';
/**
 * @fileOverview Generates a concise summary of a property's strengths and weaknesses based on multi-criteria scoring.
 *
 * - propertySummary - A function that generates the property summary.
 * - PropertySummaryInput - The input type for the propertySummary function.
 * - PropertySummaryOutput - The return type for the propertySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PropertySummaryInputSchema = z.object({
  locationScore: z.number().describe('The location score of the property.'),
  utilitiesScore: z.number().describe('The utilities score of the property.'),
  planningScore: z.number().describe('The planning score of the property.'),
  legalScore: z.number().describe('The legal score of the property.'),
  qualityScore: z.number().describe('The quality score of the property.'),
  locationDetails: z.string().describe('Detailed information about the property location.'),
  utilitiesDetails: z.string().describe('Detailed information about the property utilities.'),
  planningDetails: z.string().describe('Detailed information about the property planning.'),
  legalDetails: z.string().describe('Detailed information about the property legal status.'),
  qualityDetails: z.string().describe('Detailed information about the property quality.'),
});
export type PropertySummaryInput = z.infer<typeof PropertySummaryInputSchema>;

const PropertySummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the property’s strengths and weaknesses based on the provided scores and details.'),
});
export type PropertySummaryOutput = z.infer<typeof PropertySummaryOutputSchema>;

export async function propertySummary(input: PropertySummaryInput): Promise<PropertySummaryOutput> {
  return propertySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertySummaryPrompt',
  input: {schema: PropertySummaryInputSchema},
  output: {schema: PropertySummaryOutputSchema},
  prompt: `You are an expert real estate analyst. Generate a concise summary of a property's strengths and weaknesses based on the following multi-criteria scoring:

Location Score: {{{locationScore}}}
Location Details: {{{locationDetails}}}
Utilities Score: {{{utilitiesScore}}}
Utilities Details: {{{utilitiesDetails}}}
Planning Score: {{{planningScore}}}
Planning Details: {{{planningDetails}}}
Legal Score: {{{legalScore}}}
Legal Details: {{{legalDetails}}}
Quality Score: {{{qualityScore}}}
Quality Details: {{{qualityDetails}}}

Focus on the key strengths and weaknesses, and provide a balanced perspective. The summary should be easy to understand for a general audience.`,
});

const propertySummaryFlow = ai.defineFlow(
  {
    name: 'propertySummaryFlow',
    inputSchema: PropertySummaryInputSchema,
    outputSchema: PropertySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
