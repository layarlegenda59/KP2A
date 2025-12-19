import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaCamera } from 'react-icons/fa';
import { useCamera } from './hooks/useCamera';
import { useScanner } from './hooks/useScanner';
import CameraPermission from './CameraPermission';
import ScannerControls from './ScannerControls';
import ScannerFallback from './ScannerFallback';
import { ScannerProps, ScanResult, ScannerError } from '../../types/scanner';
import { ScannerErrorHandler } from '../../utils/scannerErrorHandler';
import { ScannerPerformanceMonitor } from '../../utils/scannerPerformance';
import BrowserCompatibility from '../../utils/browserCompatibility';

const BarcodeScanner: React.FC<ScannerProps> = ({
  onScanSuccess,
  onScanError,
  config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,
    supportedScanTypes: ['qr_code', 'code_128', 'ean_13', 'ean_8']
  },
  mode = 'general',
  className = '',
  disabled = false,
  autoStart = true,
  showViewfinder = true,
  showTorch = true,
  children
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<ScannerError | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string>('');

  // Camera permission hook
  const {
    permission,
    devices,
    requestPermission,
    checkPermission,
    isHttpsRequired
  } = useCamera();

  // Scanner hook
  const {
    isScanning,
    error: scannerError,
    startScanner,
    stopScanner,
    restartScanner
  } = useScanner({
    onScanSuccess: handleScanSuccess,
    onScanError: handleScanError,
    config,
    supportedFormats: config.supportedScanTypes || ['QR_CODE'],
    isActive: !disabled && permission.state === 'granted'
  });

  // Handle successful scan
  function handleScanSuccess(result: ScanResult) {
    setScanResult(result);
    setError(null);
    
    // Call parent callback
    onScanSuccess?.(result);
    
    // Auto-hide result after 3 seconds
    setTimeout(() => {
          setScanResult(null);
        }, 3000);
  }

  // Handle scan error
  function handleScanError(error: ScannerError) {
    setError(error);
    setScanResult(null);
    
    // Call parent callback
    onScanError?.(error);
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
          setError(null);
        }, 5000);
  }

  // Check browser compatibility on mount
  useEffect(() => {
    const support = BrowserCompatibility.isScannerSupported();
    if (!support.supported) {
      setShowFallback(true);
      setFallbackReason(support.reason || 'Scanner not supported');
      return;
    }

    // Log compatibility info in development
    if (process.env.NODE_ENV === 'development') {
      BrowserCompatibility.logCompatibilityInfo();
    }
  }, []);

  // Initialize scanner when permission is granted
  useEffect(() => {
    if (permission.state === 'granted' && autoStart && videoRef.current && !showFallback) {
      startScanner('barcode-scanner-video');
    }
  }, [permission.state, autoStart, startScanner, showFallback]);

  // Handle torch toggle (if supported)
  const handleToggleTorch = useCallback(async () => {
    try {
      // Note: Torch control is limited in web browsers
      // This is a placeholder for future implementation
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.warn('Torch control not supported:', err);
    }
  }, [torchEnabled]);

  // Handle camera switch
  const handleSwitchCamera = useCallback(async () => {
    try {
      await stopScanner();
      setCameraFacing(prev => prev === 'back' ? 'front' : 'back');
      
      // Restart scanner with new camera
      setTimeout(() => {
        startScanner('barcode-scanner-video');
      }, 500);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  }, [stopScanner, startScanner]);

  // Handle close
  const handleClose = useCallback(() => {
    stopScanner();
    setIsVisible(false);
  }, [stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Show fallback if scanner is not supported or HTTPS is required
  if (showFallback || isHttpsRequired) {
    const reason = isHttpsRequired 
      ? 'HTTPS connection required for camera access'
      : fallbackReason;
    
    return (
      <ScannerFallback
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        supportedFormats={config.supportedScanTypes || ['QR_CODE']}
        className={className}
        reason={reason}
      />
    );
  }

  // Show permission component if not granted
  if (permission.state !== 'granted') {
    return (
      <CameraPermission
        permission={permission}
        onRequestPermission={requestPermission}
        mode={mode}
        className={className}
      />
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`relative bg-black rounded-lg overflow-hidden ${className}`}
        >
          {/* Scanner Video Container */}
          <div className="relative aspect-square">
            <div
              ref={videoRef}
              id="barcode-scanner-video"
              className="w-full h-full"
            />
            
            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Scanning Animation */}
                <motion.div
                  className="absolute inset-4 border-2 border-blue-500 rounded-lg"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(59, 130, 246, 0.7)',
                      '0 0 0 10px rgba(59, 130, 246, 0)',
                      '0 0 0 0 rgba(59, 130, 246, 0)'
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut'
                  }}
                >
                  {/* Corner Markers */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500" />
                </motion.div>

                {/* Scanning Line */}
                <motion.div
                  className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                  animate={{
                    top: ['16px', 'calc(100% - 16px)', '16px']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                />
              </div>
            )}

            {/* Loading State */}
            {!isScanning && permission.state === 'granted' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <FaCamera className="h-12 w-12 text-white/70 mx-auto mb-2 animate-pulse" />
                  <p className="text-white/70 text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Success Result Overlay */}
           <AnimatePresence>
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute top-4 left-4 right-4 z-20"
              >
                <div className="bg-green-600 text-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Scan Successful!</p>
                      <p className="text-xs opacity-90 truncate">
                        {scanResult.format}: {scanResult.text}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
             )}
           </AnimatePresence>

          {/* Error Overlay */}
           <AnimatePresence>
            {(error || scannerError) && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute top-4 left-4 right-4 z-20"
              >
                <div className="bg-red-600 text-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center space-x-2">
                    <FaExclamationTriangle className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Scanner Error</p>
                      <p className="text-xs opacity-90">
                        {error?.message || scannerError?.message || 'Unknown error occurred'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
             )}
           </AnimatePresence>

          {/* Scanner Controls */}
          {showTorch && (
            <ScannerControls
              isScanning={isScanning}
              onRestart={restartScanner}
              onStop={stopScanner}
              onClose={handleClose}
              mode={mode}
              torchEnabled={torchEnabled}
              onToggleTorch={devices.length > 0 ? handleToggleTorch : undefined}
              cameraFacing={cameraFacing}
              onSwitchCamera={devices.length > 1 ? handleSwitchCamera : undefined}
            />
          )}
        </motion.div>
       )}
     </AnimatePresence>
  );
};

export default BarcodeScanner;