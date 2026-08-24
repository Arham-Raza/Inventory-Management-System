# Hostinger Deployment Guide

## Prerequisites
- Hostinger Business Web Hosting (or VPS)
- Domain: pos.easyconnect.my (pointed to Hostinger nameservers)
- Node.js 20.x enabled in hPanel

---

## Step 1 — Create MySQL database in hPanel

hPanel → Databases → MySQL Databases:
1. Database name: `ecs_pos_db`
2. Create a DB user with a strong password
3. Assign user to database → All Privileges
4. Note the host (usually `localhost` on shared, or the IP on VPS)

---

## Step 2 — Upload the code via Git (recommended) or FTP

### Option A: Git (easiest)
SSH into your Hostinger server:
```
ssh u123456789@pos.easyconnect.my
```
Then:
```bash
cd ~/public_html  # or wherever you want to deploy
git clone https://github.com/YOUR_REPO/ecs-pos.git .
```

### Option B: FTP
- Zip the project (exclude: node_modules, .next, .env)
- Upload and extract via hPanel File Manager or FileZilla

---

## Step 3 — Create .env on the server

SSH into server, in the project root:
```bash
cp .env.production.example .env
nano .env
```

Fill in:
```
DATABASE_URL="mysql://DB_USER:DB_PASS@localhost:3306/ecs_pos_db"
NEXTAUTH_SECRET="<generate below>"
NEXTAUTH_URL="https://pos.easyconnect.my"
AUTH_TRUST_HOST="true"
NODE_ENV="production"
```

Generate NEXTAUTH_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 4 — Install, migrate, build

Run these in order on the server via SSH:

```bash
npm install
npx prisma migrate deploy     # runs pending migrations on the production DB
npx prisma generate           # generates Prisma client for Linux
npm run build                 # Next.js production build
```

> If the DB is brand new (no migrations yet), use:
> `npx prisma db push` instead of `migrate deploy`

---

## Step 5 — Seed the first admin user

```bash
npx tsx src/scripts/seed.ts
```

This creates: admin@ecs.com / admin123
**Change the password immediately after first login.**

---

## Step 6 — Configure Node.js in hPanel

hPanel → Advanced → Node.js:
1. Node.js version: **20.x**
2. Application root: `/home/u123456789/public_html` (your project folder)
3. Application startup file: `start.js`
4. Click **Create** / **Restart**

---

## Step 7 — Point the domain

hPanel → Domains → pos.easyconnect.my:
- Make sure it points to your hosting (should be automatic if on Hostinger)
- Enable SSL: hPanel → SSL → Let's Encrypt → Install for pos.easyconnect.my

---

## Step 8 — Verify

Visit https://pos.easyconnect.my/login

Log in as admin@ecs.com / admin123 → you should see the dashboard.

---

## About api-pos.easyconnect.my

This Next.js app does not have a separate API server — the backend logic runs
inside the same Next.js process via Server Actions. You do not need to deploy
anything to api-pos.easyconnect.my.

If you later want to expose REST endpoints (e.g. for a mobile app), add
Next.js Route Handlers in `src/app/api/...` and point api-pos.easyconnect.my
as a reverse proxy to the same server on the same port.

---

## Future deployments (updating the app)

```bash
# SSH into server
git pull
npm install
npx prisma migrate deploy   # only if schema changed
npm run build
# Restart Node.js in hPanel → Node.js → Restart
```

---

## VPS note (recommended for production load)

If you upgrade to Hostinger VPS, the setup is the same but you also install PM2
to keep the process alive:

```bash
npm install -g pm2
pm2 start start.js --name ecs-pos
pm2 save
pm2 startup
```

PM2 restarts the app automatically after crashes or server reboots.
