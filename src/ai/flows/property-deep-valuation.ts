import 'dotenv/config';import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [googleAI()],
});

async function main() {
  const response = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    prompt: [
      { text: 'Analyze a property valuation scenario for a 100 square meter apartment in District 1, Ho Chi Minh City. Consider location, amenities, and market trends.' },
    ],
  });
  console.log(response.text);
}

main();