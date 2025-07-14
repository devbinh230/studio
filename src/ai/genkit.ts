import { genkit, GenerationCommonConfigSchema } from 'genkit';
import { ModelInfo } from 'genkit/model';
import { googleAI } from '@genkit-ai/googleai';
// import openAI from 'genkitx-openai';

// Custom model info for Perplexity Grok
const perplexityGrokModelInfo: ModelInfo = {
  versions: ['pplx-grok'],
  label: 'Perplexity - Grok',
  supports: {
    multiturn: true,
    tools: true,
    media: false,
    systemRole: true,
    output: ['json', 'text'],
  },
};

const customModelSchema = GenerationCommonConfigSchema.extend({});

// Create plugins array conditionally
const plugins = [googleAI()];

// Only add openAI plugin if API key is available
const proxyApiKey = process.env.AI_SERVER_PROXY_API_KEY || process.env.PROXY_SERVER_API_KEY;
const proxyUrl = process.env.AI_SERVER_PROXY_URL || process.env.PROXY_SERVER_URL;

if (proxyApiKey && proxyUrl) {
  console.log('🔗 Adding custom OpenAI-compatible models');
  plugins.push(
    openAI({
      apiKey: proxyApiKey,
      baseURL: proxyUrl,
      models: [
        { name: 'pplx-grok', info: perplexityGrokModelInfo, configSchema: customModelSchema },
      ],
    })
  );
} else {
  console.log('⚠️ AI_SERVER_PROXY_API_KEY or AI_SERVER_PROXY_URL not found. Custom models will not be available.');
  console.log('💡 To use custom models, please set these environment variables in your .env.local file:');
  console.log('   AI_SERVER_PROXY_API_KEY=your_api_key');
  console.log('   AI_SERVER_PROXY_URL=your_proxy_url');
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-2.5-flash', // Default model
});


