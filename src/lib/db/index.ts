import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2'
import * as schema from './schema'

// Lazy singleton — avoids URL parsing at module import time during Next.js build
let _pool: ReturnType<typeof mysql.createPool> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!_db) {
    const raw = process.env.DATABASE_URL
    if (!raw) throw new Error('DATABASE_URL env var is not set')
    const connectionString = raw.replace(/^﻿/, '').trim()
    _pool = mysql.createPool({
      uri: connectionString,
      connectionLimit: 10,
      timezone: 'Z', // store and read timestamps as UTC
      charset: 'utf8mb4',
    })
    // Keep NOW()/CURRENT_TIMESTAMP in UTC, matching how mysql2 sends dates
    _pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"))
    _db = drizzle(_pool, { schema, mode: 'default' })
  }
  return _db
}

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  { get: (_, prop) => Reflect.get(getDb(), prop) }
)

export type DB = typeof db
export * from './schema'
