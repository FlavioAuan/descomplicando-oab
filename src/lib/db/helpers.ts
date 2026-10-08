import { eq, inArray, type SQL } from 'drizzle-orm'
import type { MySqlColumn, MySqlTable } from 'drizzle-orm/mysql-core'
import { db } from './index'

// MySQL has no INSERT/UPDATE ... RETURNING. These helpers do the write and
// read the affected rows back by primary key (UUIDs are generated app-side).

type TableWithId = MySqlTable & { id: MySqlColumn }

export async function insertReturning<T extends TableWithId>(
  table: T,
  values: T['$inferInsert'] | T['$inferInsert'][]
): Promise<T['$inferSelect'][]> {
  const rows = (Array.isArray(values) ? values : [values]).map((v) => ({
    ...v,
    id: (v as { id?: string }).id ?? crypto.randomUUID(),
  }))
  if (rows.length === 0) return []

  await db.insert(table).values(rows as never)
  return selectByIds(table, rows.map((r) => r.id))
}

export async function updateReturning<T extends TableWithId>(
  table: T,
  set: Partial<T['$inferInsert']>,
  where: SQL | undefined
): Promise<T['$inferSelect'][]> {
  const matched = (await db
    .select({ id: table.id })
    .from(table as MySqlTable)
    .where(where)) as { id: string }[]
  if (matched.length === 0) return []

  const ids = matched.map((r) => r.id)
  await db.update(table).set(set as never).where(inArray(table.id, ids))
  return selectByIds(table, ids)
}

async function selectByIds<T extends TableWithId>(table: T, ids: string[]): Promise<T['$inferSelect'][]> {
  const found = (await db
    .select()
    .from(table as MySqlTable)
    .where(ids.length === 1 ? eq(table.id, ids[0]) : inArray(table.id, ids))) as (T['$inferSelect'] & { id: string })[]
  const byId = new Map(found.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter((r): r is T['$inferSelect'] & { id: string } => r !== undefined)
}
