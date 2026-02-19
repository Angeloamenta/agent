import type { CollectionConfig } from 'payload'

import { isAuthenticated } from './access.js'

export const AutomationRuns: CollectionConfig = {
  slug: 'automationRuns',
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  admin: {
    useAsTitle: 'runId',
    defaultColumns: ['runId', 'status', 'startedAt', 'finishedAt'],
  },
  fields: [
    {
      name: 'startedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'finishedAt',
      type: 'date',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'running',
      options: [
        { label: 'Running', value: 'running' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Skipped', value: 'skipped' },
      ],
    },
    {
      name: 'reason',
      type: 'text',
    },
    {
      name: 'runId',
      type: 'text',
      unique: true,
      required: true,
      index: true,
    },
    {
      name: 'stats',
      type: 'json',
    },
  ],
}
