import slugifyImport from 'slugify'

const slugifyFn: (input: string, opts?: any) => string =
  (slugifyImport as any)?.default || (slugifyImport as any)

export const makeSlug = (input: string) => {
  const s = slugifyFn(input, {
    lower: true,
    strict: true,
    trim: true,
  })
  return s.length ? s : 'post'
}
