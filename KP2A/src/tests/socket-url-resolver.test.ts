import { describe, it, expect } from 'vitest'
import { resolveSocketBaseUrl, sanitize, normalizeSidarsih } from '../utils/socketUrl'

// Mock import.meta.env
const originalImportMeta: any = (globalThis as any).importMeta

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev = (import.meta as any).env
  ;(import.meta as any).env = env as any
  try { fn() } finally { (import.meta as any).env = prev }
}

describe('socketUrl resolver', () => {
  it('sanitize removes trailing slash', () => {
    expect(sanitize('https://sidarsih.site/')).toBe('https://sidarsih.site')
  })

  it('normalizeSidarsih maps subdomains to root domain', () => {
    expect(normalizeSidarsih('https://api.sidarsih.site')).toBe('https://sidarsih.site')
    expect(normalizeSidarsih('https://whatsapp.sidarsih.site')).toBe('https://sidarsih.site')
    expect(normalizeSidarsih('https://backend.sidarsih.site/foo')).toBe('https://sidarsih.site/foo')
  })

  it('prefers same-origin for sidarsih.site', () => {
    const oldWindow = global.window
    ;(global as any).window = { location: { origin: 'https://sidarsih.site' } }
    withEnv({}, () => {
      const res = resolveSocketBaseUrl()
      expect(res.baseUrl).toBe('https://sidarsih.site')
      expect(res.reason).toContain('same-origin')
    })
    ;(global as any).window = oldWindow
  })

  it('falls back to env values in order', () => {
    withEnv({ VITE_WHATSAPP_SOCKET_URL: 'https://whatsapp.sidarsih.site' }, () => {
      const res = resolveSocketBaseUrl()
      expect(res.baseUrl).toBe('https://sidarsih.site') // normalized
      expect(res.reason).toContain('env:VITE_WHATSAPP_SOCKET_URL')
    })
    withEnv({ VITE_SOCKET_URL: 'https://backend.sidarsih.site' }, () => {
      const res = resolveSocketBaseUrl()
      expect(res.baseUrl).toBe('https://sidarsih.site') // normalized
      expect(res.reason).toContain('env:VITE_SOCKET_URL')
    })
    withEnv({ VITE_WHATSAPP_API_URL: 'https://api.sidarsih.site' }, () => {
      const res = resolveSocketBaseUrl()
      expect(res.baseUrl).toBe('https://sidarsih.site') // normalized
      expect(res.reason).toContain('env:VITE_WHATSAPP_API_URL')
    })
  })

  it('final fallback is https://sidarsih.site', () => {
    withEnv({}, () => {
      const res = resolveSocketBaseUrl()
      expect(res.baseUrl).toBe('https://sidarsih.site')
      expect(res.reason).toBe('fallback')
    })
  })
})