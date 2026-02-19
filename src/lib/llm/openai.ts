import OpenAI from 'openai'

import { envStr } from '../env.js'
import type { GeneratedDraft } from './types.js'
import { extractJSON, GeneratedDraftSchema } from './schema.js'

export const generateDraftWithOpenAI = async (args: {
  sourceTitle: string
  sourceUrl: string
  canonicalUrl?: string
  cleanText: string
  agencyTone: string
}): Promise<GeneratedDraft> => {
  const model = envStr('OPENAI_MODEL', 'gpt-4.1-mini')
  const apiKey = process.env.OPENAI_API_KEY
  // Important: do not crash Next.js / Admin on import when key is missing.
  // Only require it at runtime when the writer task is invoked.
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  const client = new OpenAI({ apiKey })

  const system =
    'Sei un editor e copywriter SEO. Produci contenuti originali in italiano. ' +
    'Non copiare: devi sintetizzare e rielaborare. ' +
    'Output: JSON valido (solo JSON, niente markdown fuori dal campo markdown).'

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

  const res = await client.responses.create({
    model: model || 'gpt-4.1-mini',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  })

  const text = res.output_text
  const json = JSON.parse(extractJSON(text))
  const parsed = GeneratedDraftSchema.parse(json)
  return parsed
}
