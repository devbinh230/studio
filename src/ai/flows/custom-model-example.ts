import { z } from 'genkit';
import { ai } from '../genkit';

// Example flow using the custom Perplexity Grok model
export const customModelExampleFlow = ai.defineFlow(
  {
    name: 'customModelExampleFlow',
    inputSchema: z.object({
      subject: z.string().describe('The subject to ask about'),
      prompt: z.string().optional().describe('Optional custom prompt'),
    }),
    outputSchema: z.object({
      response: z.string(),
      model: z.string(),
    }),
  },
  async (input) => {
    const prompt = input.prompt || `Provide detailed analysis about: ${input.subject}`;
    
    // Use the custom Perplexity Grok model
    const llmResponse = await ai.generate({
      prompt,
      model: 'openai/pplx-grok', // This uses your custom configured model
    });

    return {
      response: llmResponse.text,
      model: 'openai/pplx-grok',
    };
  }
);

// Example flow comparing responses from different models
export const compareModelsFlow = ai.defineFlow(
  {
    name: 'compareModelsFlow',
    inputSchema: z.object({
      question: z.string(),
    }),
    outputSchema: z.object({
      geminiResponse: z.string(),
      perplexityResponse: z.string(),
    }),
  },
  async (input) => {
    // Get response from Gemini
    const geminiResponse = await ai.generate({
      prompt: input.question,
      model: 'googleai/gemini-2.5-flash',
    });

    // Get response from custom Perplexity Grok model
    const perplexityResponse = await ai.generate({
      prompt: input.question,
      model: 'openai/pplx-grok',
    });

    return {
      geminiResponse: geminiResponse.text,
      perplexityResponse: perplexityResponse.text,
    };
  }
); 