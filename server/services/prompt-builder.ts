import type { GenerateModuleInput } from './providers/types.js';

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'pt-BR': 'Brazilian Portuguese',
  'es': 'Spanish',
  'fr': 'French',
  'ja': 'Japanese',
  'ar': 'Arabic',
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  beginner: 'beginner (basic concepts, simple explanations)',
  intermediate: 'intermediate (deeper dive, some advanced concepts)',
  advanced: 'advanced (complex concepts, professional techniques)',
};

/**
 * Builds the LLM prompt for module generation, parametrized by output locale.
 *
 * Prompt instructions are kept in English (LLMs respond more reliably to
 * English instructions across providers). Only the *output* is asked to be
 * in the target language.
 */
export function buildPrompt(input: GenerateModuleInput): string {
  const lang = LANGUAGE_NAMES[input.locale] ?? 'English';
  const level = LEVEL_DESCRIPTIONS[input.level];

  return `
You are an expert in education and educational content creation. Create a complete educational module about "${input.topic}" at ${level} level.

CRITICAL RULES:
1. The output MUST be in ${lang}.
2. Return ONLY a valid JSON object. NO markdown code blocks. NO text before or after.
3. JSON must start with { and end with }.
4. No trailing commas. Strings in double quotes. Escape inner quotes with \\".
5. No unescaped line breaks inside strings — use \\n.

JSON structure:

{
  "title": "Engaging module title (max 100 characters)",
  "content": "Full educational content in Markdown (500-1500 words)",
  "estimatedTime": 15,
  "quiz": [
    {
      "question": "Objective question about the content",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is the correct answer"
    }
  ]
}

Content requirements:
- Markdown formatted (##, ###, lists, inline code, code blocks)
- 500-1500 words (use word count appropriate to ${lang} — for CJK languages, scale character count accordingly)
- Structure: introduction → development with practical examples → conclusion
- Language: ${lang}, clear and objective
- Include at least 2 practical examples with code (if applicable)

Quiz requirements:
- 4-5 questions, each with exactly 4 options
- Plausible distractors, no obvious wrong answers
- correctAnswer: index 0-3
- explanation: clear reasoning

Estimated time: 10-30 minutes (reading + quiz).

Begin your response with { and end with }.
`.trim();
}
