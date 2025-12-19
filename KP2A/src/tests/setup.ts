import { beforeAll, afterAll, vi } from 'vitest'

// Ensure jsdom-like globals
if (!(globalThis as any).window) {
  ;(globalThis as any).window = { location: { origin: 'http://localhost', protocol: 'http:', hostname: 'localhost' } } as any
}

// Minimal import.meta.env for tests that access env
const env = (import.meta as any).env || {}
;(import.meta as any).env = {
  VITE_NODE_ENV: 'test',
  VITE_DISABLE_DEMO_MODE: 'false',
  DEV: true,
  ...env
}

// Silence noisy Socket.IO logs during tests
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  const msg = String(args[0] || '')
  if (msg.includes('xhr poll error') || msg.includes('Max reconnection attempts')) return
  return originalConsoleError(...args)
}

beforeAll(() => {
  vi.useRealTimers()
})

afterAll(() => {
  console.error = originalConsoleError
})
