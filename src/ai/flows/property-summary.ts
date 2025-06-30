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
  locationScore: z.number().describe('Điểm vị trí của bất động sản.'),
  utilitiesScore: z.number().describe('Điểm tiện ích của bất động sản.'),
  planningScore: z.number().describe('Điểm quy hoạch của bất động sản.'),
  legalScore: z.number().describe('Điểm pháp lý của bất động sản.'),
  qualityScore: z.number().describe('Điểm chất lượng của bất động sản.'),
  locationDetails: z.string().describe('Thông tin chi tiết về vị trí bất động sản.'),
  utilitiesDetails: z.string().describe('Thông tin chi tiết về tiện ích bất động sản.'),
  planningDetails: z.string().describe('Thông tin chi tiết về quy hoạch bất động sản.'),
  legalDetails: z.string().describe('Thông tin chi tiết về tình trạng pháp lý bất động sản.'),
  qualityDetails: z.string().describe('Thông tin chi tiết về chất lượng bất động sản.'),
});
export type PropertySummaryInput = z.infer<typeof PropertySummaryInputSchema>;

const PropertySummaryOutputSchema = z.object({
  summary: z.string().describe('Một bản tóm tắt ngắn gọn về điểm mạnh và điểm yếu của bất động sản dựa trên điểm số và chi tiết được cung cấp.'),
});
export type PropertySummaryOutput = z.infer<typeof PropertySummaryOutputSchema>;

export async function propertySummary(input: PropertySummaryInput): Promise<PropertySummaryOutput> {
  return propertySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertySummaryPrompt',
  input: {schema: PropertySummaryInputSchema},
  output: {schema: PropertySummaryOutputSchema},
  prompt: `Bạn là một nhà phân tích bất động sản chuyên nghiệp. Hãy tạo một bản tóm tắt ngắn gọn về các điểm mạnh và điểm yếu của một bất động sản dựa trên điểm số đa tiêu chí sau đây:

Điểm Vị trí: {{{locationScore}}}
Chi tiết Vị trí: {{{locationDetails}}}
Điểm Tiện ích: {{{utilitiesScore}}}
Chi tiết Tiện ích: {{{utilitiesDetails}}}
Điểm Quy hoạch: {{{planningScore}}}
Chi tiết Quy hoạch: {{{planningDetails}}}
Điểm Pháp lý: {{{legalScore}}}
Chi tiết Pháp lý: {{{legalDetails}}}
Điểm Chất lượng: {{{qualityScore}}}
Chi tiết Chất lượng: {{{qualityDetails}}}

Hãy tập trung vào các điểm mạnh và điểm yếu chính, và đưa ra một cái nhìn cân bằng. Bản tóm tắt phải dễ hiểu cho mọi đối tượng và được viết bằng tiếng Việt.`,
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
