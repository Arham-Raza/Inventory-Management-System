type RateLimitRecord = {
  count: number
  expiresAt: number
}

// In-memory store: suitable for single-process deployments (e.g. VPS with PM2)
// For serverless/Vercel, a Redis store (like Upstash) would be required instead.
const rateLimitStore = new Map<string, RateLimitRecord>()

export function isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || record.expiresAt < now) {
    rateLimitStore.set(identifier, { count: 1, expiresAt: now + windowMs })
    return false
  }

  if (record.count >= limit) {
    return true
  }

  record.count += 1
  return false
}

// Optional cleanup interval to prevent memory leaks in a long-running process
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.expiresAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Cleanup every minute
