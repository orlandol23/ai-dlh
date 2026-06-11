import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { ModuleContentSchema, type ModuleContent } from '../ai.service.js';
import { buildPrompt } from '../prompt-builder.js';
import { logger } from '../../utils/logger.js';
import type { AIProvider, GenerateModuleInput } from './types.js';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
  }

  async generateModule(input: GenerateModuleInput): Promise<ModuleContent> {
    const prompt = buildPrompt(input);
    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    try {
      const parsed = JSON.parse(text);
      return ModuleContentSchema.parse(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        logger.error('Gemini schema validation failed', err.errors);
        throw new Error('Generated module failed validation: ' + err.errors.map((e) => e.message).join(', '));
      }
      if (err instanceof SyntaxError) {
        logger.error('Gemini returned invalid JSON', err.message);
        throw new Error('AI generated invalid JSON format');
      }
      throw err;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const r = await this.model.generateContent('Hello');
      return !!r.response.text();
    } catch (err) {
      logger.error('Gemini connection test failed', err);
      return false;
    }
  }
}
