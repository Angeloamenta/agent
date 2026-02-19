import type { CollectionConfig } from 'payload'

import { isAuthenticated } from './access.js'

export const Sources: CollectionConfig = {
  slug: 'sources',
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sourceUrl', 'status', 'updatedAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'sourceUrl',
      type: 'text',
      unique: true,
      required: true,
    },
    {
      name: 'canonicalUrl',
      type: 'text',
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
    {
      name: 'author',
      type: 'text',
    },
    {
      name: 'excerpt',
      type: 'textarea',
    },
    {
      name: 'rawContent',
      type: 'textarea',
    },
    {
      name: 'cleanText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'topics',
      type: 'array',
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'contentHash',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Processed', value: 'processed' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'lastError',
      type: 'textarea',
    },
  ],
}
