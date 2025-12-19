import { useState, useEffect, useCallback, useRef } from 'react';
import { ScanResult, ScannerConfig, BarcodeFormat, ScannerError } from '../../../types/scanner';
import { ScannerErrorHandler, ScannerRecovery } from '../../../utils/scannerErrorHandler';
import { 
  ScannerPerformanceMonitor, 
  ScannerOptimizer, 
  debounce, 
  throttle,
  MemoryManager 
} from '../../../utils/scannerPerformance';
import BrowserCompatibility from '../../../utils/browserCompatibility';
import { 
  validateScanSecurity, 
  sanitizeScanText, 
  checkRateLimit, 
  logSecurityEvent 
} from '../../../utils/scannerSecurity';

// Import html5-qrcode with proper typing
declare global {
  interface Window {
    Html5QrcodeScanner: any;
    Html5Qrcode: any;
  }
}

interface UseScannerProps {
  onScanSuccess: (result: ScanResult) => void;
  onScanError: (error: ScannerError) => void;
  config: ScannerConfig;
  supportedFormats: BarcodeFormat[];
  isActive: boolean;
}

export const useScanner = ({
  onScanSuccess,
  onScanError,
  config,
  supportedFormats,
  isActive
}: UseScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<ScannerError | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  
  const scannerRef = useRef<any>(null);
  const html5QrCodeRef = useRef<any>(null);
  const scanStartTime = useRef<number>(0);
  const processingStartTime = useRef<number>(0);
  const decodeAttempts = useRef<number>(0);
  const successfulScans = useRef<number>(0);
  const totalScans = useRef<number>(0);

  // Initialize performance monitoring
  useEffect(() => {
    ScannerPerformanceMonitor.startMonitoring();
    return () => {
      ScannerPerformanceMonitor.stopMonitoring();
      MemoryManager.cleanup();
    };
  }, []);

  // Convert our format types to html5-qrcode format
  const getHtml5QrcodeFormats = useCallback(() => {
    const formatMap: Record<BarcodeFormat, number> = {
      'QR_CODE': 0,
      'CODE_128': 1,
      'CODE_39': 2,
      'EAN_13': 3,
      'EAN_8': 4,
      'UPC_A': 5,
      'UPC_E': 6
    };
    
    return supportedFormats.map(format => formatMap[format]).filter(f => f !== undefined);
  }, [supportedFormats]);

  // Throttled error handler to prevent spam
  const throttledErrorHandler = useCallback(
    throttle((errorMessage: string) => {
      // Only log actual errors, not "No QR code found" messages
      if (!errorMessage.includes('No QR code found') && 
          !errorMessage.includes('QR code parse error') &&
          !errorMessage.includes('No MultiFormat Readers')) {
        
        const scannerError = ScannerErrorHandler.handleError(new Error(errorMessage), {
          scannerConfig: config,
          supportedFormats,
          retryCount,
          isActive
        });
        
        // Log security event for scan errors
        logSecurityEvent('scan_error', {
          error: errorMessage,
          retryCount,
          scannerConfig: JSON.stringify(config)
        });
        
        setError(scannerError);
        onScanError(scannerError);
      } else {
        // Increment decode attempts for performance tracking
        decodeAttempts.current++;
      }
    }, 1000),
    [config, supportedFormats, retryCount, isActive, onScanError]
  );

  // Handle successful scan with performance tracking and security validation
  const handleScanSuccess = useCallback((decodedText: string, decodedResult: any) => {
    const scanEndTime = Date.now();
    const scanDuration = scanEndTime - scanStartTime.current;
    const processingTime = scanEndTime - processingStartTime.current;
    
    // Check rate limiting first
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const rateLimitError = ScannerErrorHandler.handleError(
        new Error('Rate limit exceeded. Please wait before scanning again.'),
        { scannerConfig: config, supportedFormats, retryCount, isActive }
      );
      
      logSecurityEvent('rate_limit_exceeded', {
        scanData: decodedText.substring(0, 50) + '...',
        remainingScans: rateLimitCheck.remainingScans,
        resetTime: rateLimitCheck.resetTime
      });
      
      setError(rateLimitError);
      onScanError(rateLimitError);
      return;
    }
    
    successfulScans.current++;
    totalScans.current++;
    
    const result: ScanResult = {
      text: decodedText,
      format: decodedResult.result?.format?.formatName || 'QR_CODE',
      timestamp: new Date(),
      confidence: decodedResult.result?.confidence,
      rawData: decodedResult
    };

    // Perform security validation
    const securityValidation = validateScanSecurity(result);
    if (!securityValidation.isValid) {
      const securityError = ScannerErrorHandler.handleError(
        new Error(`Security validation failed: ${securityValidation.errors.join(', ')}`),
        { scannerConfig: config, supportedFormats, retryCount, isActive }
      );
      
      logSecurityEvent('security_violation', {
        scanData: decodedText.substring(0, 50) + '...',
        error: securityValidation.errors.join(', '),
        warnings: securityValidation.warnings.join(', ')
      });
      
      setError(securityError);
      onScanError(securityError);
      return;
    }

    // Sanitize the scan text
    result.text = sanitizeScanText(result.text);

    // Log successful scan
    logSecurityEvent('scan_success', {
      scanData: result.text.substring(0, 50) + '...',
      format: result.format,
      confidence: result.confidence
    });

    // Record performance metrics
    const metrics = {
      scanDuration,
      processingTime,
      cameraInitTime: 0, // Will be set during initialization
      decodeAttempts: decodeAttempts.current,
      successRate: successfulScans.current / totalScans.current,
      averageLatency: scanDuration
    };

    ScannerPerformanceMonitor.recordScanMetric(metrics);
    setPerformanceMetrics(ScannerPerformanceMonitor.getPerformanceStats());

    // Reset counters
    decodeAttempts.current = 0;
    setRetryCount(0);
    setError(null);

    onScanSuccess(result);
  }, [onScanSuccess, config, supportedFormats, retryCount, isActive, onScanError]);

  // Debounced scan error handler
  const debouncedScanError = useCallback(
    debounce((errorMessage: string) => {
      throttledErrorHandler(errorMessage);
    }, 300),
    [throttledErrorHandler]
  );

  // Get optimal scanner configuration with browser compatibility
  const getOptimalConfig = useCallback(async () => {
    try {
      const optimalConfig = await ScannerOptimizer.getOptimalConfig();
      const browserConfig = BrowserCompatibility.getOptimizedScannerConfig();
      
      return {
        fps: Math.min(optimalConfig.fps, browserConfig.fps),
        qrbox: optimalConfig.qrboxSize,
        aspectRatio: config.aspectRatio || 1.0,
        disableFlip: false,
        videoConstraints: {
          ...optimalConfig.videoConstraints,
          ...browserConfig.videoConstraints
        },
        formatsToSupport: getHtml5QrcodeFormats()
      };
    } catch (error) {
      console.warn('Failed to get optimal config, using browser-compatible defaults:', error);
      const browserConfig = BrowserCompatibility.getOptimizedScannerConfig();
      
      return {
        fps: browserConfig.fps,
        qrbox: config.qrbox || { width: 250, height: 250 },
        aspectRatio: config.aspectRatio || 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: config.facingMode,
          width: config.width,
          height: config.height,
          ...browserConfig.videoConstraints
        },
        formatsToSupport: getHtml5QrcodeFormats()
      };
    }
  }, [config, getHtml5QrcodeFormats]);

  // Start scanner with enhanced error handling and performance tracking
  const startScanner = useCallback(async (elementId: string) => {
    if (isInitializing || isScanning) {
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      scanStartTime.current = Date.now();
      const cameraInitStart = Date.now();

      // Dynamic import of html5-qrcode
      const { Html5QrcodeScanner } = await import('html5-qrcode');

      const scannerConfig = await getOptimalConfig();
      
      scannerRef.current = new Html5QrcodeScanner(
        elementId,
        scannerConfig,
        false // verbose logging
      );

      // Track camera initialization time
      const cameraInitTime = Date.now() - cameraInitStart;
      
      processingStartTime.current = Date.now();
      
      await scannerRef.current.render(handleScanSuccess, debouncedScanError);
      
      setIsScanning(true);
      setIsInitializing(false);
      
      // Record successful initialization
      ScannerPerformanceMonitor.recordScanMetric({
        scanDuration: 0,
        processingTime: 0,
        cameraInitTime,
        decodeAttempts: 0,
        successRate: 1,
        averageLatency: cameraInitTime
      });

    } catch (error: any) {
      console.error('Error starting scanner:', error);
      
      const scannerError = ScannerErrorHandler.handleError(error, {
        elementId,
        config,
        retryCount,
        isActive
      });
      
      setError(scannerError);
      setIsScanning(false);
      setIsInitializing(false);
      
      // Attempt recovery if possible
      if (scannerError.details.recoverable && ScannerErrorHandler.shouldRetry(scannerError.details.code)) {
        setRetryCount(prev => prev + 1);
        
        // Attempt automatic recovery
        setTimeout(async () => {
          const recovered = await attemptRecovery(scannerError);
          if (recovered) {
            startScanner(elementId);
          }
        }, scannerError.details.retryable ? 2000 : 0);
      }
      
      onScanError(scannerError);
    }
  }, [isInitializing, isScanning, getOptimalConfig, handleScanSuccess, debouncedScanError, config, retryCount, isActive, onScanError]);

  // Attempt recovery from errors
  const attemptRecovery = useCallback(async (scannerError: ScannerError): Promise<boolean> => {
    try {
      switch (scannerError.details.category) {
        case 'permission':
          return await ScannerRecovery.recoverFromPermissionError();
        case 'hardware':
          return await ScannerRecovery.recoverFromHardwareError();
        case 'system':
        case 'processing':
          return await ScannerRecovery.recoverFromScannerError(async () => {
            // Reset scanner state
            await stopScanner();
          });
        default:
          return false;
      }
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return false;
    }
  }, []);

  // Stop scanner with proper cleanup
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
      
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
      
      setIsScanning(false);
      setIsInitializing(false);
      setError(null);
      
      // Cleanup memory
      MemoryManager.cleanup();
      
    } catch (error: any) {
      console.error('Error stopping scanner:', error);
      const scannerError = ScannerErrorHandler.handleError(error, {
        operation: 'stop'
      });
      setError(scannerError);
    }
  }, []);

  // Restart scanner with performance optimization
  const restartScanner = useCallback(async (elementId: string) => {
    await stopScanner();
    
    // Wait a bit before restarting to ensure cleanup
    setTimeout(() => {
      startScanner(elementId);
    }, 500);
  }, [stopScanner, startScanner]);

  // Auto start/stop based on isActive prop
  useEffect(() => {
    if (!isActive && isScanning) {
      stopScanner();
    }
  }, [isActive, isScanning, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      MemoryManager.cleanup();
    };
  }, [stopScanner]);

  // Adaptive configuration based on performance
  useEffect(() => {
    if (performanceMetrics && performanceMetrics.performanceGrade === 'poor') {
      const adaptedConfig = ScannerOptimizer.adaptConfigBasedOnPerformance({
        scanDuration: performanceMetrics.averageScanDuration,
        processingTime: performanceMetrics.averageProcessingTime,
        cameraInitTime: 0,
        decodeAttempts: 0,
        successRate: performanceMetrics.successRate,
        averageLatency: performanceMetrics.averageScanDuration
      });
      
      if (adaptedConfig && isScanning) {
        console.info('Adapting scanner configuration for better performance');
        // Restart with new configuration
        restartScanner('barcode-scanner-video');
      }
    }
  }, [performanceMetrics, isScanning, restartScanner]);

  return {
    isScanning,
    isInitializing,
    error,
    retryCount,
    performanceMetrics,
    startScanner,
    stopScanner,
    restartScanner
  };
};