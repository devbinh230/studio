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
  address: z.string().describe('Địa chỉ của bất động sản.'),
  size: z.number().describe('Diện tích của bất động sản tính bằng mét vuông.'),
  bedrooms: z.number().describe('Số lượng phòng ngủ của bất động sản.'),
  bathrooms: z.number().describe('Số lượng phòng tắm của bất động sản.'),
  lotSize: z.number().describe('Diện tích lô đất tính bằng mét vuông.'),
  marketData: z.string().describe('Dữ liệu thị trường hiện tại cho các bất động sản tương đương trong khu vực.'),
});
export type PropertyValuationRangeInput = z.infer<typeof PropertyValuationRangeInputSchema>;

const PropertyValuationRangeOutputSchema = z.object({
  lowValue: z.number().describe('Giá thấp nhất có thể cho bất động sản.'),
  reasonableValue: z.number().describe('Giá hợp lý nhất cho bất động sản.'),
  highValue: z.number().describe('Giá cao nhất có thể đạt được cho bất động sản.'),
});
export type PropertyValuationRangeOutput = z.infer<typeof PropertyValuationRangeOutputSchema>;

export async function propertyValuationRange(input: PropertyValuationRangeInput): Promise<PropertyValuationRangeOutput> {
  return propertyValuationRangeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertyValuationRangePrompt',
  input: {schema: PropertyValuationRangeInputSchema},
  output: {schema: PropertyValuationRangeOutputSchema},
  prompt: `Bạn là một chuyên gia thẩm định giá bất động sản. Dựa trên thông tin chi tiết về bất động sản và dữ liệu thị trường được cung cấp, hãy ước tính một khoảng giá trị cho bất động sản.

Thông tin chi tiết bất động sản:
Địa chỉ: {{{address}}}
Diện tích: {{{size}}} m2
Số phòng ngủ: {{{bedrooms}}}
Số phòng tắm: {{{bathrooms}}}
Diện tích lô đất: {{{lotSize}}} m2

Dữ liệu thị trường:
{{{marketData}}}

Hãy ước tính và cung cấp giá trị thấp, giá trị hợp lý và giá trị cao cho bất động sản.`,
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
