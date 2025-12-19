/**
 * Scanner Security and Validation Utilities
 * Provides comprehensive security measures for barcode/QR code scanning
 */

import { ScanResult, ScannerError } from '../types/scanner';

// Security configuration
export const SECURITY_CONFIG = {
  MAX_SCAN_LENGTH: 2048,
  MIN_SCAN_LENGTH: 1,
  ALLOWED_PROTOCOLS: ['http:', 'https:', 'tel:', 'mailto:', 'sms:'],
  BLOCKED_PATTERNS: [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /ftp:/i,
    /<script/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ],
  RATE_LIMIT: {
    MAX_SCANS_PER_MINUTE: 30,
    MAX_SCANS_PER_HOUR: 200,
    COOLDOWN_PERIOD: 1000 // 1 second between scans
  }
};

// Rate limiting storage
const scanHistory: { timestamp: number; userId?: string }[] = [];
let lastScanTime = 0;

/**
 * Sanitizes scan result text to prevent XSS and injection attacks
 */
export function sanitizeScanText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid scan text: must be a non-empty string');
  }

  // Remove null bytes and control characters
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // HTML encode special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Validates scan result for security threats
 */
export function validateScanSecurity(scanResult: ScanResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check text length
  if (scanResult.text.length > SECURITY_CONFIG.MAX_SCAN_LENGTH) {
    errors.push(`Scan text too long (max ${SECURITY_CONFIG.MAX_SCAN_LENGTH} characters)`);
  }

  if (scanResult.text.length < SECURITY_CONFIG.MIN_SCAN_LENGTH) {
    errors.push(`Scan text too short (min ${SECURITY_CONFIG.MIN_SCAN_LENGTH} character)`);
  }

  // Check for blocked patterns
  for (const pattern of SECURITY_CONFIG.BLOCKED_PATTERNS) {
    if (pattern.test(scanResult.text)) {
      errors.push(`Potentially malicious content detected: ${pattern.source}`);
    }
  }

  // Validate URLs if applicable
  if (isUrl(scanResult.text)) {
    const urlValidation = validateUrl(scanResult.text);
    if (!urlValidation.isValid) {
      errors.push(...urlValidation.errors);
    }
    warnings.push(...urlValidation.warnings);
  }

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(scanResult.text)) {
    warnings.push('Scan contains potentially suspicious patterns');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates URL security
 */
function validateUrl(url: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
      errors.push(`Blocked protocol: ${urlObj.protocol}`);
    }

    // Check for suspicious domains
    if (isSuspiciousDomain(urlObj.hostname)) {
      warnings.push(`Potentially suspicious domain: ${urlObj.hostname}`);
    }

    // Check for IP addresses (potential security risk)
    if (isIpAddress(urlObj.hostname)) {
      warnings.push('URL contains IP address instead of domain name');
    }

    // Check for suspicious URL patterns
    if (containsSuspiciousUrlPatterns(url)) {
      warnings.push('URL contains suspicious patterns');
    }

  } catch (error) {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checks if text is a URL
 */
function isUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return text.match(/^https?:\/\//) !== null;
  }
}

/**
 * Checks for suspicious domain patterns
 */
function isSuspiciousDomain(hostname: string): boolean {
  const suspiciousPatterns = [
    /\d+\.\d+\.\d+\.\d+/, // IP addresses
    /[a-z0-9]{20,}/, // Very long random strings
    /(.)\1{4,}/, // Repeated characters
    /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/i, // URL shorteners
  ];

  return suspiciousPatterns.some(pattern => pattern.test(hostname));
}

/**
 * Checks if hostname is an IP address
 */
function isIpAddress(hostname: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
}

/**
 * Checks for suspicious patterns in scan text
 */
function containsSuspiciousPatterns(text: string): boolean {
  const suspiciousPatterns = [
    /password/i,
    /credit.?card/i,
    /ssn|social.?security/i,
    /bank.?account/i,
    /routing.?number/i,
    /api.?key/i,
    /secret/i,
    /token/i,
    /private.?key/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Checks for suspicious URL patterns
 */
function containsSuspiciousUrlPatterns(url: string): boolean {
  const suspiciousPatterns = [
    /phishing/i,
    /malware/i,
    /virus/i,
    /hack/i,
    /exploit/i,
    /\.tk$|\.ml$|\.ga$|\.cf$/i, // Suspicious TLDs
    /[0-9]{1,3}-[0-9]{1,3}-[0-9]{1,3}-[0-9]{1,3}/, // IP-like patterns in domain
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}

/**
 * Rate limiting for scan operations
 */
export function checkRateLimit(userId?: string): {
  allowed: boolean;
  remainingScans: number;
  resetTime: number;
} {
  const now = Date.now();
  
  // Check cooldown period
  if (now - lastScanTime < SECURITY_CONFIG.RATE_LIMIT.COOLDOWN_PERIOD) {
    return {
      allowed: false,
      remainingScans: 0,
      resetTime: lastScanTime + SECURITY_CONFIG.RATE_LIMIT.COOLDOWN_PERIOD
    };
  }

  // Clean old entries
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneMinuteAgo = now - (60 * 1000);
  
  // Remove entries older than 1 hour
  while (scanHistory.length > 0 && scanHistory[0].timestamp < oneHourAgo) {
    scanHistory.shift();
  }

  // Count recent scans
  const scansInLastMinute = scanHistory.filter(scan => 
    scan.timestamp > oneMinuteAgo && 
    (!userId || scan.userId === userId)
  ).length;

  const scansInLastHour = scanHistory.filter(scan => 
    (!userId || scan.userId === userId)
  ).length;

  // Check limits
  if (scansInLastMinute >= SECURITY_CONFIG.RATE_LIMIT.MAX_SCANS_PER_MINUTE) {
    return {
      allowed: false,
      remainingScans: 0,
      resetTime: oneMinuteAgo + (60 * 1000)
    };
  }

  if (scansInLastHour >= SECURITY_CONFIG.RATE_LIMIT.MAX_SCANS_PER_HOUR) {
    return {
      allowed: false,
      remainingScans: 0,
      resetTime: oneHourAgo + (60 * 60 * 1000)
    };
  }

  // Record this scan
  scanHistory.push({ timestamp: now, userId });
  lastScanTime = now;

  return {
    allowed: true,
    remainingScans: Math.min(
      SECURITY_CONFIG.RATE_LIMIT.MAX_SCANS_PER_MINUTE - scansInLastMinute - 1,
      SECURITY_CONFIG.RATE_LIMIT.MAX_SCANS_PER_HOUR - scansInLastHour - 1
    ),
    resetTime: 0
  };
}

/**
 * Validates payment QR code data
 */
export function validatePaymentQR(data: string): {
  isValid: boolean;
  errors: string[];
  parsedData?: any;
} {
  const errors: string[] = [];

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(data);

    // Required fields for payment QR
    const requiredFields = ['amount', 'currency', 'recipient'];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate amount
    if (parsed.amount !== undefined) {
      const amount = parseFloat(parsed.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Invalid amount: must be a positive number');
      }
      if (amount > 1000000000) { // 1 billion limit
        errors.push('Amount too large');
      }
    }

    // Validate currency
    if (parsed.currency && typeof parsed.currency !== 'string') {
      errors.push('Invalid currency: must be a string');
    }

    // Validate recipient
    if (parsed.recipient && typeof parsed.recipient !== 'string') {
      errors.push('Invalid recipient: must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors,
      parsedData: parsed
    };

  } catch (parseError) {
    errors.push('Invalid JSON format');
    return {
      isValid: false,
      errors
    };
  }
}

/**
 * Validates member verification QR code data
 */
export function validateMemberQR(data: string): {
  isValid: boolean;
  errors: string[];
  parsedData?: any;
} {
  const errors: string[] = [];

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(data);

    // Required fields for member verification QR
    const requiredFields = ['memberId', 'memberName'];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate member ID
    if (parsed.memberId !== undefined) {
      if (typeof parsed.memberId !== 'string' || parsed.memberId.length === 0) {
        errors.push('Invalid member ID: must be a non-empty string');
      }
    }

    // Validate member name
    if (parsed.memberName !== undefined) {
      if (typeof parsed.memberName !== 'string' || parsed.memberName.length === 0) {
        errors.push('Invalid member name: must be a non-empty string');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      parsedData: parsed
    };

  } catch (parseError) {
    errors.push('Invalid JSON format');
    return {
      isValid: false,
      errors
    };
  }
}

/**
 * Creates a secure error object for logging
 */
export function createSecureError(
  message: string,
  code: string,
  details?: any
): ScannerError {
  return {
    message: sanitizeScanText(message),
    code,
    timestamp: new Date().toISOString(),
    details: details ? sanitizeObject(details) : undefined
  };
}

/**
 * Sanitizes an object for safe logging
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeScanText(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logs security events for audit purposes
 */
export function logSecurityEvent(
  event: 'scan_success' | 'scan_error' | 'security_violation' | 'rate_limit_exceeded',
  details: {
    userId?: string;
    scanData?: string;
    error?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details: sanitizeObject(details)
  };

  // In production, this should be sent to a secure logging service
  console.log('[SECURITY]', logEntry);
  
  // Store in local storage for debugging (remove in production)
  if (typeof window !== 'undefined') {
    const logs = JSON.parse(localStorage.getItem('scanner_security_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('scanner_security_logs', JSON.stringify(logs));
  }
}