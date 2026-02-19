import { GoogleGenerativeAI } from '@google/generative-ai'

import { envStr } from '../env.js'
import type { GeneratedDraft } from './types.js'
import { extractJSON, GeneratedDraftSchema } from './schema.js'

export const generateDraftWithGemini = async (args: {
  sourceTitle: string
  sourceUrl: string
  canonicalUrl?: string
  cleanText: string
  agencyTone: string
}): Promise<GeneratedDraft> => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY')

  // Default to a model that is available on the v1beta generateContent endpoint.
  const model = envStr('GEMINI_MODEL', 'gemini-2.0-flash')
  const genAI = new GoogleGenerativeAI(apiKey)

  const systemInstruction =
    'Sei un editor e copywriter SEO. Produci contenuti originali in italiano. ' +
    'Non copiare: devi sintetizzare e rielaborare. ' +
    'Output: JSON valido (solo JSON, niente testo extra).'

  const prompt = `
Tone of voice:
${args.agencyTone}

Fonte:
- title: ${args.sourceTitle}
- url: ${args.sourceUrl}
- canonicalUrl: ${args.canonicalUrl || ''}

Testo pulito (estratto):
"""
${args.cleanText.slice(0, 12000)}
"""

Requisiti:
- Scrivi un articolo originale e utile (900-1400 parole), tecnico ma chiaro, senza fuffa.
- Struttura SEO con H2/H3, frasi brevi, punti elenco quando serve.
- Meta description ~155 caratteri.
- Slug breve e parlante (kebab-case), senza date.
- Aggiungi sezione finale: "## Fonti" con link (usa reference URLs).
- Il campo markdown deve contenere SOLO markdown (H2/H3, liste, paragrafi, link).

Restituisci ESATTAMENTE questo JSON:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": ["..."],
  "outline": "...",
  "markdown": "...",
  "references": ["https://..."]
}
`.trim()

  const m = genAI.getGenerativeModel({
    model: model || 'gemini-1.5-flash',
    systemInstruction,
  })

  const res = await m.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  })

  const text = res.response.text()
  const json = JSON.parse(extractJSON(text))
  return GeneratedDraftSchema.parse(json)
}
