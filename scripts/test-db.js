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

console.log('DB URL starts:', process.env.DATABASE_URL.slice(0, 50) + '...')

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 })

client`SELECT 1 as ok`.then(r => {
  console.log('Connected! Result:', r)
  client.end()
}).catch(e => {
  console.error('Error:', e.message)
  client.end()
})
