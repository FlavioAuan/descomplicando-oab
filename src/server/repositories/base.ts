import { db } from '@/lib/db'
import type { DB } from '@/lib/db'

export abstract class BaseRepository {
  protected readonly db: DB

  constructor() {
    this.db = db
  }
}
