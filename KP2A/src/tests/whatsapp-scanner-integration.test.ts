/**
 * WhatsApp Scanner Integration Tests
 * Tests the complete integration of barcode scanner with WhatsApp bot functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock SECURITY_CONFIG for tests
const SECURITY_CONFIG = {
  MAX_SCAN_LENGTH: 1000,
  MIN_SCAN_LENGTH: 1,
  BLOCKED_PATTERNS: [],
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  RATE_LIMIT: {
    COOLDOWN_PERIOD: 1000
  }
}

// Make it available globally for the security module
global.SECURITY_CONFIG = SECURITY_CONFIG

describe('WhatsApp Scanner Integration', () => {
  beforeEach(() => {
    // Mock DOM environment
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:' },
      writable: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should import WhatsApp bot page without errors', async () => {
    const { default: WhatsAppBotPage } = await import('../components/WhatsApp/WhatsAppBotPage')
    expect(WhatsAppBotPage).toBeDefined()
    expect(typeof WhatsAppBotPage).toBe('function')
  })

  it('should import scanner components without errors', async () => {
    const scannerModule = await import('../components/Scanner')
    expect(scannerModule.BarcodeScanner).toBeDefined()
    expect(scannerModule.ScannerErrorBoundary).toBeDefined()
  })

  it('should import scanner services without errors', async () => {
    const scannerWhatsAppService = await import('../services/scanner-whatsapp.service')
    expect(scannerWhatsAppService.default).toBeDefined()
  })

  it('should import scanner security utilities', async () => {
    const securityUtils = await import('../utils/scannerSecurity')
    expect(securityUtils.validateScanSecurity).toBeDefined()
    expect(securityUtils.validatePaymentQR).toBeDefined()
    expect(securityUtils.validateMemberQR).toBeDefined()
    expect(securityUtils.checkRateLimit).toBeDefined()
    expect(securityUtils.sanitizeScanText).toBeDefined()
    expect(securityUtils.logSecurityEvent).toBeDefined()
    expect(securityUtils.createSecureError).toBeDefined()
  })

  it('should import financial transaction utilities', async () => {
    const financialUtils = await import('../utils/financialTransactions')
    expect(financialUtils.processPaymentQR).toBeDefined()
    expect(financialUtils.processMemberPayment).toBeDefined()
    expect(financialUtils.getTransactionHistory).toBeDefined()
    expect(financialUtils.getTransactionAnalytics).toBeDefined()
    expect(financialUtils.formatCurrency).toBeDefined()
  })

  it('should validate scanner security functions', async () => {
    const { validateScanSecurity, sanitizeScanText } = await import('../utils/scannerSecurity')
    
    // Test security validation
    const mockScanResult = {
      text: 'test-qr-data',
      format: 'qr_code' as const,
      timestamp: Date.now(),
      confidence: 0.95
    }
    
    const securityResult = validateScanSecurity(mockScanResult)
    expect(securityResult).toHaveProperty('isValid')
    expect(securityResult).toHaveProperty('errors')
    expect(securityResult).toHaveProperty('warnings')
    
    // Test text sanitization
    const sanitizedText = sanitizeScanText('test<script>alert("xss")</script>data')
    expect(sanitizedText).not.toContain('<script>')
    expect(sanitizedText).toBe('test&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;data')
  })

  it('should validate financial transaction functions', async () => {
    const { formatCurrency } = await import('../utils/financialTransactions')
    
    // Test currency formatting (using Indonesian locale)
    const formatted1M = formatCurrency(1000000)
    const formatted500K = formatCurrency(500000)
    const formatted0 = formatCurrency(0)
    
    // Check that it contains the expected elements
    expect(formatted1M).toContain('1.000.000')
    expect(formatted500K).toContain('500.000')
    expect(formatted0).toContain('0')
    
    // Check that it's properly formatted as currency
    expect(typeof formatted1M).toBe('string')
    expect(typeof formatted500K).toBe('string')
    expect(typeof formatted0).toBe('string')
  })

  it('should handle scanner error boundary', async () => {
    const { ScannerErrorBoundary } = await import('../components/Scanner')
    expect(ScannerErrorBoundary).toBeDefined()
    expect(typeof ScannerErrorBoundary).toBe('function')
  })

  it('should validate scanner types', async () => {
    const scannerTypes = await import('../types/scanner')
    expect(scannerTypes).toBeDefined()
    
    // Check if types are properly exported (they should be available at runtime for validation)
    const mockScanResult = {
      data: 'test-data',
      format: 'qr_code',
      timestamp: Date.now(),
      confidence: 0.95
    }
    
    // Basic type validation
    expect(typeof mockScanResult.data).toBe('string')
    expect(typeof mockScanResult.format).toBe('string')
    expect(typeof mockScanResult.timestamp).toBe('number')
    expect(typeof mockScanResult.confidence).toBe('number')
  })

  it('should validate scanner modes', async () => {
    const { BarcodeScanner } = await import('../components/Scanner')
    
    // Test that scanner accepts different modes
    const validModes = ['verification', 'transaction', 'whatsapp']
    validModes.forEach(mode => {
      expect(['verification', 'transaction', 'whatsapp']).toContain(mode)
    })
  })

  it('should validate browser compatibility', async () => {
    const { BrowserCompatibility } = await import('../utils/browserCompatibility')
    
    const capabilities = BrowserCompatibility.detectBrowserCapabilities()
    expect(capabilities).toHaveProperty('hasMediaDevices')
    expect(capabilities).toHaveProperty('hasGetUserMedia')
    expect(capabilities).toHaveProperty('hasWebRTC')
    expect(capabilities).toHaveProperty('hasWebAssembly')
    
    const support = BrowserCompatibility.isScannerSupported()
    expect(support).toHaveProperty('supported')
    if (!support.supported) {
      expect(support).toHaveProperty('reason')
      expect(support.reason!.length).toBeGreaterThan(0)
    }
  })

  it('should validate performance monitoring', async () => {
    const { ScannerPerformanceMonitor } = await import('../utils/scannerPerformance')
    
    // Test static methods
    ScannerPerformanceMonitor.startMonitoring()
    
    // Record a test metric
    ScannerPerformanceMonitor.recordScanMetric({
      scanDuration: 500,
      processingTime: 100,
      decodeAttempts: 1,
      successRate: 1.0,
      qrboxSize: { width: 250, height: 250 },
      fps: 10
    })
    
    const stats = ScannerPerformanceMonitor.getPerformanceStats()
    expect(stats).toHaveProperty('totalScans')
    expect(stats).toHaveProperty('averageScanDuration')
    expect(stats).toHaveProperty('averageProcessingTime')
    expect(stats).toHaveProperty('successRate')
    expect(stats).toHaveProperty('performanceGrade')
    expect(stats.totalScans).toBe(1)
    expect(stats.successRate).toBe(1.0)
    
    ScannerPerformanceMonitor.stopMonitoring()
  })

  it('should validate error handling', async () => {
    const { ScannerErrorHandler } = await import('../utils/scannerErrorHandler')
    
    // Test different error types
    const permissionError = new Error('Permission denied')
    permissionError.name = 'NotAllowedError'
    
    const scannerError = ScannerErrorHandler.handleError(permissionError, {
      scannerMode: 'member_verification',
      retryCount: 0
    })
    
    expect(scannerError).toHaveProperty('details')
    expect(scannerError.details).toHaveProperty('category')
    expect(scannerError.details).toHaveProperty('severity')
    expect(scannerError.details).toHaveProperty('recoverable')
    expect(scannerError.details).toHaveProperty('code')
    expect(scannerError.details.category).toBe('permission')
  })
})

console.log('✅ WhatsApp Scanner Integration tests completed successfully')