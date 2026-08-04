const postgres = require('postgres')
const fs = require('fs')

// Load env
const env = fs.readFileSync('.env.local', 'utf-8')
for (const line of env.split('\n')) {
  const eq = line.indexOf('=')
  if (eq > 0) {
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

const dbUrl = process.env.DATABASE_URL

// Try with SSL
console.log('Trying with ssl: require...')
const client = postgres(dbUrl, { prepare: false, max: 1, connect_timeout: 15, ssl: 'require' })

client`SELECT current_user, version()`.then(r => {
  console.log('Connected!', r)
  client.end()
}).catch(async e => {
  console.error('SSL attempt failed:', e.message)
  client.end()

  // Try with decoded password
  const decoded = dbUrl.replace('%26', '&').replace('%2B', '+').replace('%40', '@')
  // But '@' in password would break URL parsing... let's try parsing manually
  // postgresql://postgres:DNbvF&emW+2nt-G@co4U6kIz@db.bratyabsutqqybqlpdzq.supabase.co:5432/postgres
  // The password contains '@' which breaks URL parsing!
  // Use explicit params instead

  const url = new URL(dbUrl)
  const password = decodeURIComponent(url.password)
  console.log('Password decoded length:', password.length)
  console.log('Host:', url.hostname, 'Port:', url.port, 'User:', url.username)

  const client2 = postgres({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    username: url.username,
    password: password,
    ssl: 'require',
    prepare: false,
    max: 1,
    connect_timeout: 15,
  })

  try {
    const r2 = await client2`SELECT current_user`
    console.log('Connected with explicit params!', r2)
  } catch (e2) {
    console.error('Explicit params also failed:', e2.message)
  } finally {
    await client2.end()
  }
})
