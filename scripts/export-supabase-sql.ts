/**
 * Gera um arquivo .sql (MySQL) com todos os dados do Supabase, para importar
 * no MySQL do Easypanel pelo phpMyAdmin (aba "Importar").
 *
 * O arquivo só tem DADOS: importe depois do primeiro deploy do site,
 * quando as tabelas já foram criadas automaticamente.
 * Pode ser importado várias vezes: apaga os dados das tabelas antes de inserir.
 *
 * Lê de .env.mysql.local:
 *   SUPABASE_DB_URL=postgresql://...      (Session pooler)
 *   SUPABASE_URL=https://xxxx.supabase.co  (para importar os arquivos depois)
 *
 *   npx tsx scripts/export-supabase-sql.ts   ➜ gera supabase-dados.sql.gz
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

function convert(value: unknown, columnType: string): unknown {
  if (value === null || value === undefined) return null
  if (columnType === 'MySqlJson') return JSON.stringify(rewriteUrls(value))
  if (columnType === 'MySqlDateString') {
    return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  }
  if (typeof value === 'string') return rewriteUrls(value)
  return value
}

const sqlValue = (rows: unknown[][]) => format('?', [rows], false, 'Z')

async function main() {
  const sourceUrl = process.env.SUPABASE_DB_URL
  if (!sourceUrl) {
    console.error('Defina SUPABASE_DB_URL no .env.mysql.local')
    process.exit(1)
  }

  const pg = postgres(sourceUrl.replace(/^﻿/, ''), { prepare: false, max: 1, ssl: 'require' })
  const out: string[] = [
    '-- Dados do Supabase para o MySQL do Descomplicando OAB',
    `-- Gerado em ${new Date().toISOString()}`,
    'SET NAMES utf8mb4;',
    "SET time_zone = '+00:00';",
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ]

  // Passwords: bcrypt hashes from Supabase Auth (same format our login uses)
  const authUsers = await pg`select id::text as id, encrypted_password from auth.users`
  const passwordByAuthId = new Map(authUsers.map((u) => [u.id as string, (u.encrypted_password as string) || null]))

  const report: Array<{ tabela: string; registros: number }> = []
  let semSenha = 0

  for (const table of tables) {
    const { name, columns } = getTableConfig(table)
    out.push(`-- ${name}`, `DELETE FROM \`${name}\`;`)

    const [exists] = await pg`select to_regclass(${'public.' + name}) as t`
    if (!exists.t) {
      report.push({ tabela: name, registros: 0 })
      continue
    }

    const rows = await pg.unsafe(`select * from public."${name}"`)
    const sourceColumns = new Set(rows.columns.map((c) => c.name))
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
  await pg.end()

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
