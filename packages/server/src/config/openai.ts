import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (openaiClient) return openaiClient;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

