import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  window.global = window
}

// Polyfill for global
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis
}

// Polyfill for process
if (typeof process === 'undefined') {
  (globalThis as any).process = { env: {} }
}

export {}