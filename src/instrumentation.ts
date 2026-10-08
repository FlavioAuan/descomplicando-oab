// Runs once when the Next.js server starts: applies pending database migrations,
// so a new deploy on Easypanel updates the MySQL schema automatically.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./lib/db/migrate-on-start')
    await runMigrations()
  }
}
