const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const worldsCache = new Map<string, CacheEntry<unknown>>()
let lastUpdatedAt: number | null = null

const normalizeValue = (value: unknown): string => {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString())
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const asObjectId = record as { toHexString?: () => string }
    if (typeof asObjectId.toHexString === 'function') {
      return JSON.stringify(asObjectId.toHexString())
    }
  }

  return ''
}

const stableStringify = (value: unknown): string => {
  const normalized = normalizeValue(value)
  if (normalized) {
    return normalized
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
  return `{${entries.join(',')}}`
}

const buildCacheKey = (prefix: string, parts: unknown[]): string => {
  const serialized = parts.map((part) => stableStringify(part)).join('|')
  return `${prefix}|${serialized}`
}

export const getWorldsCache = async <T>(
  prefix: string,
  parts: unknown[],
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> => {
  const key = buildCacheKey(prefix, parts)
  const now = Date.now()
  const cached = worldsCache.get(key) as CacheEntry<T> | undefined

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const value = await fetcher()
  worldsCache.set(key, { value, expiresAt: now + ttlMs })
  lastUpdatedAt = now
  return value
}

export const clearWorldsCache = (prefix?: string) => {
  if (!prefix) {
    worldsCache.clear()
    lastUpdatedAt = null
    return
  }

  worldsCache.forEach((_, key) => {
    if (key.startsWith(`${prefix}|`)) {
      worldsCache.delete(key)
    }
  })
  lastUpdatedAt = null
}

export const getWorldsCacheInfo = () => ({
  lastUpdatedAt
})
