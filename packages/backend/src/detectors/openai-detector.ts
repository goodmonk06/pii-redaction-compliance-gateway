import OpenAI from 'openai';
import { PIIType } from './types';

export interface OpenAIDetectionResult {
  containsPII: boolean;
  detectedTypes: PIIType[];
  confidence: number;
  reasoning?: string;
}

export class OpenAIDetector {
  private client: OpenAI | null = null;
  private enabled: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      this.client = new OpenAI({ apiKey });
      this.enabled = true;
      console.log('✅ OpenAI detector enabled');
    } else {
      console.log('ℹ️  OpenAI detector disabled (no API key configured)');
    }
  }

  async detectPII(text: string): Promise<OpenAIDetectionResult> {
    if (!this.enabled || !this.client) {
      return {
        containsPII: false,
        detectedTypes: [],
        confidence: 0,
        reasoning: 'OpenAI detector not enabled',
      };
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a PII detection assistant. Analyze the given text and determine if it contains Personally Identifiable Information (PII).

Respond ONLY with a JSON object in this exact format:
{
  "containsPII": boolean,
  "detectedTypes": string[], // Array of detected PII types: "email", "phone", "name", "ssn", "credit_card", "address", "ip_address"
  "confidence": number, // 0.0 to 1.0
  "reasoning": string // Brief explanation
}`,
          },
          {
            role: 'user',
            content: `Analyze this text for PII:\n\n${text}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content) as OpenAIDetectionResult;
      return result;
    } catch (error) {
      console.error('OpenAI detection error:', error);
      return {
        containsPII: false,
        detectedTypes: [],
        confidence: 0,
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Batch detection for multiple text fields
   */
  async detectBatch(texts: string[]): Promise<OpenAIDetectionResult[]> {
    if (!this.enabled || !this.client) {
      return texts.map(() => ({
        containsPII: false,
        detectedTypes: [],
        confidence: 0,
        reasoning: 'OpenAI detector not enabled',
      }));
    }

    // Process in parallel with rate limiting
    const batchSize = 5;
    const results: OpenAIDetectionResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((text) => this.detectPII(text)));
      results.push(...batchResults);
    }

    return results;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const openAIDetector = new OpenAIDetector();
