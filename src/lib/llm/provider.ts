import { envStr } from '../env.js'
import type { GeneratedDraft } from './types.js'
import { generateDraftWithGemini } from './gemini.js'
import { generateDraftWithOpenAI } from './openai.js'

export const generateDraft = async (args: {
  sourceTitle: string
  sourceUrl: string
  canonicalUrl?: string
  cleanText: string
  agencyTone: string
}): Promise<GeneratedDraft> => {
  const provider = envStr('LLM_PROVIDER', 'gemini')
  if (provider === 'openai') return generateDraftWithOpenAI(args)
  return generateDraftWithGemini(args)
}
