import type { SanitizedConfig } from 'payload'
import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'

export const markdownToLexical = async (args: { config: SanitizedConfig; markdown: string }) => {
  const editorConfig = await editorConfigFactory.default({
    config: args.config,
  })
  return convertMarkdownToLexical({
    editorConfig,
    markdown: args.markdown,
  })
}
