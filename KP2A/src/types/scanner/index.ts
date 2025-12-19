/**
 * Scanner Types and Interfaces
 * Comprehensive type definitions for barcode/QR code scanner functionality
 */

// Barcode format types
export type BarcodeFormat = 
  | 'QR_CODE'
  | 'CODE_128'
  | 'CODE_39'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'DATA_MATRIX'
  | 'PDF_417'
  | 'AZTEC'
  | 'CODABAR'
  | 'ITF'
  | 'RSS_14'
  | 'RSS_EXPANDED';

// Scanner mode types
export type ScannerMode = 'payment' | 'member' | 'general' | 'document';

// Scanner state types
export type ScannerState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

// Camera facing mode
export type CameraFacingMode = 'user' | 'environment';

// Scan result interface
export interface ScanResult {
  text: string;
  format: BarcodeFormat;
  timestamp: string;
  confidence?: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rawBytes?: Uint8Array;
  metadata?: Record<string, any>;
}

// Scanner configuration
export interface ScannerConfig {
  formats?: BarcodeFormat[];
  facingMode?: CameraFacingMode;
  width?: number;
  height?: number;
  fps?: number;
  qrbox?: {
    width: number;
    height: number;
  };
  aspectRatio?: number;
  disableFlip?: boolean;
  verbose?: boolean;
  supportedScanTypes?: string[];
  experimentalFeatures?: {
    useBarCodeDetectorIfSupported?: boolean;
  };
}

// Scanner error interface
export interface ScannerError {
  code: string;
  message: string;
  type: 'CAMERA_ERROR' | 'PERMISSION_ERROR' | 'SCAN_ERROR' | 'VALIDATION_ERROR' | 'SECURITY_ERROR';
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

// Scanner props interface
export interface ScannerProps {
  onScanSuccess: (result: ScanResult) => void;
  onScanError: (error: ScannerError) => void;
  config?: ScannerConfig;
  mode?: ScannerMode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  autoStart?: boolean;
  showViewfinder?: boolean;
  showTorch?: boolean;
  children?: React.ReactNode;
}

// Scanner hook return type
export interface UseScannerReturn {
  isScanning: boolean;
  scanResult: ScanResult | null;
  error: ScannerError | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  resetScanner: () => void;
  toggleTorch: () => Promise<void>;
  isTorchOn: boolean;
  isTorchSupported: boolean;
  cameraPermission: PermissionState | null;
  requestCameraPermission: () => Promise<boolean>;
}

// Security validation result
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedText?: string;
}

// Payment QR data structure
export interface PaymentQRData {
  qr_type: 'payment';
  amount: number;
  currency: string;
  merchant_id: string;
  merchant_name: string;
  transaction_id: string;
  description?: string;
  timestamp: string;
}

// Member payment QR data structure
export interface MemberPaymentQRData {
  qr_type: 'member_payment';
  member_id: string;
  member_name: string;
  amount: number;
  payment_type: 'monthly_fee' | 'loan_payment' | 'savings_deposit' | 'penalty_fee' | 'other';
  description?: string;
  timestamp: string;
}

// Scan history entry
export interface ScanHistoryEntry {
  id: string;
  scanResult: ScanResult;
  mode: ScannerMode;
  timestamp: string;
  userId?: string;
  processed: boolean;
  metadata?: Record<string, any>;
}

// Scanner statistics
export interface ScannerStatistics {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  averageProcessingTime: number;
  mostUsedFormat: BarcodeFormat;
  scansByFormat: Record<BarcodeFormat, number>;
  scansByMode: Record<ScannerMode, number>;
  lastScanTime?: string;
}

// Camera capabilities
export interface CameraCapabilities {
  torch: boolean;
  zoom: boolean;
  autofocus: boolean;
  facingModes: CameraFacingMode[];
  resolutions: Array<{
    width: number;
    height: number;
  }>;
}

// Scanner context type
export interface ScannerContextType {
  config: ScannerConfig;
  updateConfig: (config: Partial<ScannerConfig>) => void;
  history: ScanHistoryEntry[];
  addToHistory: (entry: ScanHistoryEntry) => void;
  clearHistory: () => void;
  statistics: ScannerStatistics;
  updateStatistics: (stats: Partial<ScannerStatistics>) => void;
}

// Event types for scanner
export type ScannerEventType = 
  | 'scan_start'
  | 'scan_success'
  | 'scan_error'
  | 'scan_stop'
  | 'camera_permission_granted'
  | 'camera_permission_denied'
  | 'torch_toggle'
  | 'config_change';

// Scanner event interface
export interface ScannerEvent {
  type: ScannerEventType;
  timestamp: string;
  data?: any;
  error?: ScannerError;
  result?: ScanResult;
}

// Scanner analytics data
export interface ScannerAnalytics {
  sessionId: string;
  userId?: string;
  events: ScannerEvent[];
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  deviceInfo: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    hasCamera: boolean;
  };
}

// Export all types
export type {
  BarcodeFormat,
  ScannerMode,
  ScannerState,
  CameraFacingMode,
  ScanResult,
  ScannerConfig,
  ScannerError,
  ScannerProps,
  UseScannerReturn,
  SecurityValidationResult,
  PaymentQRData,
  MemberPaymentQRData,
  ScanHistoryEntry,
  ScannerStatistics,
  CameraCapabilities,
  ScannerContextType,
  ScannerEventType,
  ScannerEvent,
  ScannerAnalytics
};