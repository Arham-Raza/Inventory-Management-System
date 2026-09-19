# Database Backups

`npm run backup` dumps the full MySQL database (`ecs_pos_db`) to a
timestamped `.sql` file under `backups/` (git-ignored — these contain real
customer and financial data). Old dumps beyond the retention count are
pruned automatically (default: keep the last 30; override with
`BACKUP_RETENTION=n npm run backup`).

It finds `mysqldump` on PATH, or falls back to checking common install
locations (WAMP, XAMPP, a standalone MySQL Server install). If it can't find
it, set `MYSQLDUMP_PATH` to the full path of `mysqldump.exe`.

## Restoring from a backup

```
mysql -u root ecs_pos_db < backups\ecs_pos_db-2026-09-19_161625.sql
```

(Use the actual mysql client, not mysqldump, and point it at the right
backup file. This overwrites the current database — back up the current
state first if you're not sure.)

## Running it automatically (Windows Task Scheduler)

The script itself doesn't register anything — running it on a schedule is a
standing change to this machine, so it's a manual step:

1. Open **Task Scheduler** → **Create Basic Task**
2. Name it e.g. "TechRevalo POS — Daily DB Backup"
3. Trigger: **Daily**, pick a time (e.g. 3:00 AM, when the shop is closed)
4. Action: **Start a program**
   - Program/script: `npm.cmd`
   - Add arguments: `run backup`
   - Start in: `E:\Clients\Muhammad Numair\Development\ECS_POS`
5. Finish, then right-click the task → **Run** once to confirm it works

Backups only protect you if they're also *off this machine* — periodically
copy the `backups/` folder to an external drive or a cloud-synced folder
(e.g. OneDrive) as well.
