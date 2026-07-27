import type { GenerateModuleInput } from './providers/types.js';
import type { LearningStyle } from './vark.js';

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
 * VARK learning-style adaptation (Fase 1 da fusão aprendaMais).
 *
 * Injected into the shared prompt when the user has a stored
 * learning_style, so EVERY provider (Gemini / Claude / Qwen) adapts the
 * pedagogy. These instructions shape *how* the content teaches; they must
 * never change the JSON output contract (ModuleContentSchema).
 */
const STYLE_INSTRUCTIONS: Record<LearningStyle, string> = {
  visual:
    'The learner is a VISUAL learner. Favor visual analogies and mental imagery, ' +
    'describe diagrams/flowcharts in words (e.g. "imagine a pipeline where..."), ' +
    'use tables and spatially structured Markdown (nested lists, clear hierarchy ' +
    'of ## / ### sections) so the layout itself conveys structure.',
  auditory:
    'The learner is an AUDITORY learner. Use a narrative, conversational tone as ' +
    'if explaining out loud; include rhythmic/sound-based mnemonics, memorable ' +
    'spoken-style phrases, and rhetorical questions followed by their answers.',
  reading_writing:
    'The learner is a READING/WRITING learner. Favor well-structured prose with ' +
    'precise written definitions, bullet-point summaries, glossary-style lists of ' +
    'key terms, and suggestions to rewrite/summarize concepts in their own words.',
  kinesthetic:
    'The learner is a KINESTHETIC learner. Favor learning-by-doing: practical ' +
    'real-world examples, step-by-step hands-on exercises the learner can try ' +
    'immediately, and "try it yourself" prompts after each concept.',
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

  // Optional VARK adaptation. Affects only the pedagogical approach of the
  // generated content — the JSON structure below stays identical, so the
  // ModuleContentSchema contract is preserved for every provider.
  const styleSection = input.learningStyle
    ? `\nLearner profile adaptation (VARK):\n- ${STYLE_INSTRUCTIONS[input.learningStyle]}\n- Adapt the teaching approach of "content" and the framing of quiz questions to this profile, while keeping the exact same JSON structure.\n`
    : '';

  return `
You are an expert in education and educational content creation. Create a complete educational module about "${input.topic}" at ${level} level.
${styleSection}

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
