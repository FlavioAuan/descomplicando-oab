/**
 * Gera um arquivo .sql (MySQL) com todos os dados do Supabase, para importar
 * no MySQL do Easypanel pelo phpMyAdmin (aba "Importar").
 *
 * O arquivo só tem DADOS: importe depois do primeiro deploy do site,
 * quando as tabelas já foram criadas automaticamente.
 * Pode ser importado várias vezes: apaga os dados das tabelas antes de inserir.
 *
 * Origem dos dados (uma das duas):
 *   a) Conexão direta — .env.mysql.local: SUPABASE_DB_URL=postgresql://... (Session pooler)
 *        npx tsx scripts/export-supabase-sql.ts
 *   b) CSV exportado do SQL Editor do Supabase (consulta em scripts/export-supabase-query.sql)
 *        npx tsx scripts/export-supabase-sql.ts --csv "caminho/do/arquivo.csv"
 *
 * SUPABASE_URL=https://xxxx.supabase.co (em .env.mysql.local) habilita a importação
 * dos arquivos depois. Gera supabase-dados.sql.gz na pasta do projeto.
 */

process.env.TZ = 'UTC' // Supabase timestamps are UTC; keep them unchanged

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import postgres from 'postgres'
import { format } from 'mysql2'
import { is } from 'drizzle-orm'
import { getTableConfig, MySqlTable } from 'drizzle-orm/mysql-core'
import * as schema from '../src/lib/db/schema'

for (const file of ['.env.mysql.local', '.env.local']) {
  const envPath = path.join(process.cwd(), file)
  if (!fs.existsSync(envPath)) continue
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const OUTPUT = path.join(process.cwd(), 'supabase-dados.sql.gz')
const STORAGE_URL_RE = /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//g
const BATCH = 200

const tables = (Object.values(schema) as unknown[]).filter((v): v is MySqlTable => is(v, MySqlTable))

function rewriteUrls<T>(value: T): T {
  if (typeof value === 'string') return value.replace(STORAGE_URL_RE, '/api/files/') as T
  if (Array.isArray(value)) return value.map(rewriteUrls) as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteUrls(v)])) as T
  }
  return value
}

type Row = Record<string, unknown>
interface Source {
  tables: Map<string, Row[]>
  authUsers: Array<{ id: string; encrypted_password: string | null }>
}

// Postgres timestamps come as Date (direct connection) or ISO strings (CSV/JSON)
function toUtcDate(value: unknown): Date {
  if (value instanceof Date) return value
  const s = String(value)
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z')
}

function convert(value: unknown, columnType: string): unknown {
  if (value === null || value === undefined) return null
  if (columnType === 'MySqlTimestamp') return toUtcDate(value)
  if (columnType === 'MySqlJson') return JSON.stringify(rewriteUrls(value))
  if (columnType === 'MySqlDateString') {
    return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  }
  if (typeof value === 'string') return rewriteUrls(value)
  return value
}

const sqlValue = (rows: unknown[][]) => format('?', [rows], false, 'Z')

async function loadFromPostgres(url: string): Promise<Source> {
  const pg = postgres(url.replace(/^﻿/, ''), { prepare: false, max: 1, ssl: 'require' })
  const result: Source = { tables: new Map(), authUsers: [] }
  for (const table of tables) {
    const { name } = getTableConfig(table)
    const [exists] = await pg`select to_regclass(${'public.' + name}) as t`
    if (exists.t) result.tables.set(name, [...(await pg.unsafe(`select * from public."${name}"`))])
  }
  result.authUsers = [...(await pg`select id::text as id, encrypted_password from auth.users`)] as Source['authUsers']
  await pg.end()
  return result
}

// RFC 4180 CSV parser (fields may contain quotes, commas and newlines)
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

function loadFromCsv(file: string): Source {
  const [header, ...lines] = parseCsv(fs.readFileSync(file, 'utf-8').replace(/^﻿/, ''))
  const [ti, ji] = [header.indexOf('t'), header.indexOf('j')]
  if (ti < 0 || ji < 0) throw new Error('CSV inesperado: precisa das colunas t, c, j')
  const result: Source = { tables: new Map(), authUsers: [] }
  for (const line of lines) {
    if (line.length < header.length) continue
    const rows = JSON.parse(line[ji]) as Row[]
    if (line[ti] === 'auth_users') result.authUsers.push(...(rows as Source['authUsers']))
    else result.tables.set(line[ti], [...(result.tables.get(line[ti]) ?? []), ...rows])
  }
  return result
}

async function main() {
  const csvArg = process.argv.indexOf('--csv')
  const sourceUrl = process.env.SUPABASE_DB_URL
  if (csvArg < 0 && !sourceUrl) {
    console.error('Use --csv <arquivo> ou defina SUPABASE_DB_URL no .env.mysql.local')
    process.exit(1)
  }
  const source = csvArg >= 0 ? loadFromCsv(process.argv[csvArg + 1]) : await loadFromPostgres(sourceUrl!)

  const out: string[] = [
    '-- Dados do Supabase para o MySQL do Descomplicando OAB',
    `-- Gerado em ${new Date().toISOString()}`,
    'SET NAMES utf8mb4;',
    "SET time_zone = '+00:00';",
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ]

  // Passwords: bcrypt hashes from Supabase Auth (same format our login uses)
  const passwordByAuthId = new Map(source.authUsers.map((u) => [u.id, u.encrypted_password || null]))

  const report: Array<{ tabela: string; registros: number }> = []
  let semSenha = 0

  for (const table of tables) {
    const { name, columns } = getTableConfig(table)
    out.push(`-- ${name}`, `DELETE FROM \`${name}\`;`)

    const rows = source.tables.get(name) ?? []
    if (rows.length === 0) {
      report.push({ tabela: name, registros: 0 })
      continue
    }

    const sourceColumns = new Set(rows.flatMap((row) => Object.keys(row)))
    const cols = columns.filter((c) => sourceColumns.has(c.name) || (name === 'users' && c.name === 'password_hash'))
    const colList = cols.map((c) => `\`${c.name}\``).join(', ')

    for (let i = 0; i < rows.length; i += BATCH) {
      const values = rows.slice(i, i + BATCH).map((row) =>
        cols.map((c) => {
          if (name === 'users' && c.name === 'password_hash') {
            const hash = row.password_hash || passwordByAuthId.get(String(row.auth_id)) || null
            if (!hash) semSenha++
            return hash
          }
          return convert(row[c.name], c.columnType)
        })
      )
      out.push(`INSERT INTO \`${name}\` (${colList}) VALUES ${sqlValue(values)};`)
    }
    report.push({ tabela: name, registros: rows.length })
    out.push('')
  }

  // Where the old files live, for "Importar arquivos do Supabase" in the admin
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  if (supabaseUrl) {
    out.push(
      format(
        'INSERT INTO `system_settings` (`key`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);',
        ['legacy_storage_url', `${supabaseUrl}/storage/v1/object/public/`]
      )
    )
  }

  out.push('', 'SET FOREIGN_KEY_CHECKS = 1;', '')

  fs.writeFileSync(OUTPUT, zlib.gzipSync(out.join('\n')))

  console.table(report)
  console.log(`Total de registros: ${report.reduce((s, r) => s + r.registros, 0)}`)
  console.log(`Usuários sem senha: ${semSenha}`)
  console.log(`Arquivo gerado: ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2)} MB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
