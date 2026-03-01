import OpenAI from 'openai';

let deepseekClient: OpenAI | null = null;

export function getDeepseek(): OpenAI | null {
  if (deepseekClient) return deepseekClient;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    return null;
  }

  deepseekClient = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  return deepseekClient;
}
