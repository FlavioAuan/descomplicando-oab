import path from 'path'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { db } from './index'

export async function runMigrations() {
  if (process.env.RUN_MIGRATIONS === 'false' || !process.env.DATABASE_URL) return

  const migrationsFolder = path.join(process.cwd(), 'src/lib/db/migrations')
  try {
    await migrate(db, { migrationsFolder })
    console.log('[db] migrations up to date')
  } catch (err) {
    console.error('[db] migration failed', err)
    throw err
  }
}
