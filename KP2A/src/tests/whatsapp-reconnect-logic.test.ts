import { describe, it, expect, vi } from 'vitest'

// Create a simple event emitter stub
class Emitter {
  listeners: Record<string, Function[]> = {}
  on(evt: string, fn: Function) { (this.listeners[evt] ||= []).push(fn); return this }
  once(evt: string, fn: Function) { const once = (...a: any[]) => { this.off(evt, once); (fn as any)(...a) }; this.on(evt, once); return this }
  off(evt: string, fn: Function) { this.listeners[evt] = (this.listeners[evt]||[]).filter(f => f !== fn); return this }
  emit(evt: string, ...args: any[]) { (this.listeners[evt]||[]).forEach(fn => fn(...args)) }
  removeAllListeners() { this.listeners = {} }
}

// Mock socket.io-client
const createFakeSocket = () => {
  const emitter = new Emitter() as any
  // Minimal io opts shape used by service
  emitter.io = { opts: { transports: ['websocket','polling'] } }
  emitter.connect = vi.fn(() => {
    // Immediately emit connect_error to trigger transport flip
    setTimeout(() => emitter.emit('connect_error', new Error('Simulated WS error')), 0)
  })
  emitter.disconnect = vi.fn(() => {})
  return emitter
}

vi.mock('socket.io-client', () => {
  const socket = createFakeSocket()
  return {
    io: vi.fn(() => socket),
    Socket: vi.fn()
  }
})

// Ensure env for resolver
;(import.meta as any).env = { VITE_NODE_ENV: 'test', DEV: true }

describe('WhatsAppSocketService reconnect logic', () => {
  it('flips transport order to polling after websocket connect_error', async () => {
    const serviceModule: any = await import('../services/whatsapp-socket.service')
    const svc: any = serviceModule.default
    // Wait a tick for attemptConnectionWithFallback to run
    await new Promise(r => setTimeout(r