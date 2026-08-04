import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Lazy singleton — avoids URL parsing at module import time during Next.js build
let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!_db) {
    const raw = process.env.DATABASE_URL
    if (!raw) throw new Error('DATABASE_URL env var is not set')
    const connectionString = raw.replace(/^﻿/, '').trim()
    _client = postgres(connectionString, { prepare: false })
    _db = drizzle(_client, { schema })
  }
  return _db
}

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  { get: (_, prop) => Reflect.get(getDb(), prop) }
)

export type DB = typeof db
export * from './schema'
