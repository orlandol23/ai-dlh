import type { ModuleContent } from '../ai.service.js';

export type ProviderName = 'gemini' | 'claude' | 'qwen';
export type Tier = 'default' | 'premium';
export type Region = 'global' | 'cn' | 'eu-strict';

export interface GenerateModuleInput {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  locale: string; // 'en', 'pt-BR', 'es', 'fr', 'ja', 'ar'
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
