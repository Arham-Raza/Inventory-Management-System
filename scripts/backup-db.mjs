// Dumps the full MySQL database to a timestamped .sql file under backups/,
// then prunes old dumps beyond the retention count. Run manually with
// `npm run backup`, or wire it into Windows Task Scheduler to run daily —
// see BACKUPS.md for the scheduling steps (not done automatically here,
// since that's a standing change to the machine, not just this repo).
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const BACKUP_DIR = join(ROOT, "backups")
const RETENTION = Number(process.env.BACKUP_RETENTION ?? 30)

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = join(ROOT, ".env")
  if (!existsSync(envPath)) {
    throw new Error(".env not found and DATABASE_URL is not set in the environment.")
  }
  const match = readFileSync(envPath, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)
  if (!match) throw new Error("DATABASE_URL not found in .env")
  return match[1]
}

function parseDatabaseUrl(url) {
  // mysql://user:password@host:port/dbname
  const m = url.match(/^mysql:\/\/([^:@]*):?([^@]*)@([^:/]+):(\d+)\/([^?]+)/)
  if (!m) throw new Error(`Could not parse DATABASE_URL: ${url}`)
  const [, user, password, host, port, database] = m
  return { user, password, host, port, database }
}

function findMysqldump() {
  if (process.env.MYSQLDUMP_PATH && existsSync(process.env.MYSQLDUMP_PATH)) {
    return process.env.MYSQLDUMP_PATH
  }
  const probe = spawnSync("mysqldump", ["--version"])
  if (probe.status === 0) return "mysqldump"

  // Common local install locations (WAMP/XAMPP/standalone MySQL Server) —
  // checked as a fallback since mysqldump usually isn't on PATH on Windows.
  const candidates = [
    "C:\\wamp64\\bin\\mysql",
    "C:\\xampp\\mysql\\bin",
    "C:\\Program Files\\MySQL",
  ]
  for (const base of candidates) {
    if (!existsSync(base)) continue
    const found = findExeUnder(base, "mysqldump.exe")
    if (found) return found
  }
  throw new Error(
    "Could not find mysqldump. Set MYSQLDUMP_PATH to its full path (e.g. the bin folder of your MySQL/WAMP install)."
  )
}

function findExeUnder(dir, filename, depth = 3) {
  if (depth < 0) return null
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return null
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) return full
    if (entry.isDirectory()) {
      const nested = findExeUnder(full, filename, depth - 1)
      if (nested) return nested
    }
  }
  return null
}

function timestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function pruneOldBackups() {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const file of files.slice(RETENTION)) {
    unlinkSync(join(BACKUP_DIR, file.name))
    console.log(`Pruned old backup: ${file.name}`)
  }
}

function main() {
  const dbUrl = loadDatabaseUrl()
  const { user, password, host, port, database } = parseDatabaseUrl(dbUrl)
  const mysqldump = findMysqldump()

  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })

  const outFile = join(BACKUP_DIR, `${database}-${timestamp()}.sql`)

  const args = [
    `-h${host}`,
    `-P${port}`,
    `-u${user}`,
    ...(password ? [`-p${password}`] : []),
    "--single-transaction",
    "--routines",
    "--triggers",
    `--result-file=${outFile}`,
    database,
  ]

  console.log(`Backing up "${database}" to ${outFile} ...`)
  // No `shell: true` here — the backup dir/repo path has spaces, and an
  // argv array is passed to the child process correctly without it on
  // Windows; wrapping in a shell would require manual re-quoting.
  const result = spawnSync(mysqldump, args)

  if (result.status !== 0) {
    console.error(result.stderr?.toString() ?? "mysqldump failed")
    process.exit(1)
  }

  const sizeKB = (statSync(outFile).size / 1024).toFixed(1)
  console.log(`Backup complete (${sizeKB} KB).`)

  pruneOldBackups()
}

main()
