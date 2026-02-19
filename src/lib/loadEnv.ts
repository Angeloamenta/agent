import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

export const loadEnv = () => {
  const root = process.cwd()
  const candidates = ['.env.local', '.env']

  for (const file of candidates) {
    const full = path.join(root, file)
    if (fs.existsSync(full)) {
      dotenv.config({ path: full })
    }
  }
}
