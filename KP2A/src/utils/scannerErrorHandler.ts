/**
 * Enhanced Error Handling for Scanner System
 * Provides comprehensive error categorization, recovery strategies, and user-friendly messages
 */

export interface ScannerErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryable: boolean;
  category: 'permission' | 'hardware' | 'network' | 'processing' | 'validation' | 'system';
  suggestions: string[];
  technicalDetails?: any;
}

export class ScannerError extends Error {
  public readonly details: ScannerErrorDetails;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;

  constructor(details: ScannerErrorDetails, context: Record<string, any> = {}) {
    super(details.message);
    this.name = 'ScannerError';
    this.details = details;
    this.timestamp = new Date();
    this.context = context;
  }
}

export class ScannerErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static lastErrors = new Map<string, Date>();
  private static readonly MAX_RETRY_COUNT = 3;
  private static readonly RETRY_COOLDOWN = 5000; // 5 seconds

  /**
   * Categorize and handle different types of scanner errors
   */
  static handleError(error: any, context: Record<string, any> = {}): ScannerError {
    const errorDetails = this.categorizeError(error, context);
    const scannerError = new ScannerError(errorDetails, context);
    
    // Log error for monitoring
    this.logError(scannerError);
    
    // Track error frequency
    this.trackErrorFrequency(errorDetails.code);
    
    return scannerError;
  }

  /**
   * Categorize errors based on type and provide appropriate handling
   */
  private static categorizeError(error: any, context: Record<string, any>): ScannerErrorDetails {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorName = error?.name || 'UnknownError';

    // Camera Permission Errors
    if (errorName === 'NotAllowedError' || errorMessage.includes('permission')) {
      return {
        code: 'CAMERA_PERMISSION_DENIED',
        message: errorMessage,
        userMessage: 'Camera access is required to scan barcodes. Please allow camera permission and try again.',
        severity: 'high',
        recoverable: true,
        retryable: true,
        category: 'permission',
        suggestions: [
          'Click the camera icon in your browser\'s address bar',
          'Select "Allow" for camera access',
          'Refresh the page and try again',
          'Check your browser settings for camera permissions'
        ]
      };
    }

    // Hardware Errors
    if (errorName === 'NotFoundError' || errorMessage.includes('No camera found')) {
      return {
        code: 'CAMERA_NOT_FOUND',
        message: errorMessage,
        userMessage: 'No camera was found on this device. Please connect a camera and try again.',
        severity: 'critical',
        recoverable: false,
        retryable: false,
        category: 'hardware',
        suggestions: [
          'Connect a camera to your device',
          'Check if your camera is working in other applications',
          'Try using a different device with a camera'
        ]
      };
    }

    if (errorName === 'NotReadableError' || errorMessage.includes('camera is being used')) {
      return {
        code: 'CAMERA_IN_USE',
        message: errorMessage,
        userMessage: 'Camera is currently being used by another application. Please close other camera apps and try again.',
        severity: 'medium',
        recoverable: true,
        retryable: true,
        category: 'hardware',
        suggestions: [
          'Close other applications using the camera',
          'Restart your browser',
          'Wait a moment and try again'
        ]
      };
    }

    // Browser Support Errors
    if (errorName === 'NotSupportedError' || errorMessage.includes('not supported')) {
      return {
        code: 'BROWSER_NOT_SUPPORTED',
        message: errorMessage,
        userMessage: 'Your browser doesn\'t support camera access. Please use a modern browser like Chrome, Firefox, or Safari.',
        severity: 'critical',
        recoverable: false,
        retryable: false,
        category: 'system',
        suggestions: [
          'Update your browser to the latest version',
          'Try using Chrome, Firefox, or Safari',
          'Enable camera support in your browser settings'
        ]
      };
    }

    // Network/HTTPS Errors
    if (errorMessage.includes('https') || errorMessage.includes('secure')) {
      return {
        code: 'HTTPS_REQUIRED',
        message: errorMessage,
        userMessage: 'Camera access requires a secure HTTPS connection. Please access this site through HTTPS.',
        severity: 'high',
        recoverable: true,
        retryable: false,
        category: 'network',
        suggestions: [
          'Access the site using https:// instead of http://',
          'Contact your administrator to enable HTTPS',
          'Use the application on localhost for development'
        ]
      };
    }

    // Scanner Processing Errors
    if (errorMessage.includes('decode') || errorMessage.includes('parse')) {
      return {
        code: 'SCAN_DECODE_ERROR',
        message: errorMessage,
        userMessage: 'Unable to read the barcode. Please ensure the code is clear and well-lit.',
        severity: 'low',
        recoverable: true,
        retryable: true,
        category: 'processing',
        suggestions: [
          'Ensure the barcode is clearly visible',
          'Improve lighting conditions',
          'Hold the camera steady',
          'Move closer to or further from the barcode'
        ]
      };
    }

    // Validation Errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        code: 'SCAN_VALIDATION_ERROR',
        message: errorMessage,
        userMessage: 'The scanned code is not valid for this operation. Please scan a valid barcode.',
        severity: 'medium',
        recoverable: true,
        retryable: true,
        category: 'validation',
        suggestions: [
          'Verify you\'re scanning the correct type of barcode',
          'Check if the barcode is damaged or corrupted',
          'Contact support if you believe this is a valid code'
        ]
      };
    }

    // Generic/Unknown Errors
    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      severity: 'medium',
      recoverable: true,
      retryable: true,
      category: 'system',
      suggestions: [
        'Try refreshing the page',
        'Clear your browser cache',
        'Try again in a few moments',
        'Contact support if the problem continues'
      ],
      technicalDetails: error
    };
  }

  /**
   * Check if an error should be retried based on frequency and cooldown
   */
  static shouldRetry(errorCode: string): boolean {
    const count = this.errorCounts.get(errorCode) || 0;
    const lastError = this.lastErrors.get(errorCode);
    
    if (count >= this.MAX_RETRY_COUNT) {
      return false;
    }
    
    if (lastError && Date.now() - lastError.getTime() < this.RETRY_COOLDOWN) {
      return false;
    }
    
    return true;
  }

  /**
   * Track error frequency for monitoring and rate limiting
   */
  private static trackErrorFrequency(errorCode: string): void {
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);
    this.lastErrors.set(errorCode, new Date());
    
    // Reset counts after 1 hour
    setTimeout(() => {
      this.errorCounts.delete(errorCode);
      this.lastErrors.delete(errorCode);
    }, 3600000);
  }

  /**
   * Log error for monitoring and debugging
   */
  private static logError(error: ScannerError): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      code: error.details.code,
      message: error.message,
      severity: error.details.severity,
      category: error.details.category,
      context: error.context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Scanner Error:', logData);
    }

    // In production, you might want to send to an error tracking service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
      this.sendToErrorTracking(logData);
    }
  }

  /**
   * Send error to external error tracking service
   */
  private static sendToErrorTracking(errorData: any): void {
    // Implement your error tracking service integration here
    // Example: Sentry.captureException(errorData);
    
    // For now, we'll just store in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('scanner_errors') || '[]');
      errors.push(errorData);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('scanner_errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Clear error tracking data
   */
  static clearErrorTracking(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
    localStorage.removeItem('scanner_errors');
  }
}

/**
 * Recovery strategies for different types of errors
 */
export class ScannerRecovery {
  /**
   * Attempt to recover from camera permission errors
   */
  static async recoverFromPermissionError(): Promise<boolean> {
    try {
      // Try to request permission again
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Attempt to recover from camera hardware errors
   */
  static async recoverFromHardwareError(): Promise<boolean> {
    try {
      // Try to enumerate devices and find available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      return cameras.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Attempt to recover from scanner initialization errors
   */
  static async recoverFromScannerError(retryCallback: () => Promise<void>): Promise<boolean> {
    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      await retryCallback();
      return true;
    } catch (error) {
      return false;
    }
  }
}