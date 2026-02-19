import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { AutomationRuns } from './collections/AutomationRuns.js'
import { Drafts } from './collections/Drafts.js'
import { Posts } from './collections/Posts.js'
import { Sources } from './collections/Sources.js'
import { Users } from './collections/Users.js'
import { runPipelineWorkflow } from './jobs/runPipelineWorkflow.js'
import { gatePipelineTask } from './tasks/gatePipelineTask.js'
import { generateDraftTask } from './tasks/generateDraftTask.js'
import { publishPostTask } from './tasks/publishPostTask.js'
import { scrapeSourcesTask } from './tasks/scrapeSourcesTask.js'

export default buildConfig({
  admin: {
    user: 'users',
  },
  collections: [Users, Sources, Drafts, Posts, AutomationRuns],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  jobs: {
    enableConcurrencyControl: true,
    access: {
      // Prevent random callers from running jobs via `/api/payload-jobs/run`
      run: ({ req }) => {
        if (req.user) return true
        const secret = process.env.CRON_SECRET
        if (!secret) return false
        const header = req.headers.get('x-cron-secret') || req.headers.get('authorization')
        return header === secret || header === `Bearer ${secret}`
      },
    },
    jobsCollectionOverrides: ({ defaultJobsCollection }) => {
      defaultJobsCollection.admin = {
        ...defaultJobsCollection.admin,
        hidden: true,
      }
      return defaultJobsCollection
    },
    tasks: [gatePipelineTask, scrapeSourcesTask, generateDraftTask, publishPostTask],
    workflows: [runPipelineWorkflow],
  },
  typescript: {
    outputFile: 'src/payload-types.ts',
  },
})
