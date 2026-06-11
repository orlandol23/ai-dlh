import type { ModuleContent } from '../ai.service.js';
import type { LearningStyle } from '../vark.js';

export type ProviderName = 'gemini' | 'claude' | 'qwen';
export type Tier = 'default' | 'premium';
export type Region = 'global' | 'cn' | 'eu-strict';

export interface GenerateModuleInput {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  locale: string; // 'en', 'pt-BR', 'es', 'fr', 'ja', 'ar'
  /**
   * User's VARK learning style (users.learning_style). When present, the
   * shared prompt builder adapts the pedagogical approach of the generated
   * content — for every provider, since they all build their prompt via
   * buildPrompt(). Null/undefined = no adaptation (user hasn't taken the
   * questionnaire).
   */
  learningStyle?: LearningStyle | null;
}

export interface RouterContext {
  tier: Tier;
  region: Region;
  locale: string;
}

export interface AIProvider {
  readonly name: ProviderName;
  generateModule(input: GenerateModuleInput): Promise<ModuleContent>;
  testConnection(): Promise<boolean>;
}
