import { z } from 'zod'

export const GeneratedDraftSchema = z.object({
  title: z.string().min(5),
  slug: z.string().min(1),
  excerpt: z.string().min(20),
  metaTitle: z.string().min(5),
  metaDescription: z.string().min(50).max(200),
  keywords: z.array(z.string().min(2)).min(3).max(12),
  outline: z.string().min(20),
  markdown: z.string().min(200),
  references: z.array(z.string().url()).min(1).max(10),
})

export const extractJSON = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('LLM did not return JSON')
  return text.slice(start, end + 1)
}
