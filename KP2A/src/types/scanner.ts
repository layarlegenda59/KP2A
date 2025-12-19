/**
 * Scanner Types and Interfaces
 * Defines types for barcode/QR code scanning functionality
 */

// Scanner result interface
export interface ScanResult {
  text: string;
  format: string;
  timestamp: number;
  confidence?: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Scanner error interface
export interface ScannerError extends Error {
  code?: string;
  severity?: 'low' | 'medium' | 'high';
  recoverable?: boolean;
}

// Scanner configuration
export interface ScannerConfig {
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  videoConstraints?: MediaTrackConstraints;
  formatsToSupport?: Html5QrcodeSupportedFormats[];
}

// Scanner modes
export type ScannerMode = 'verification' | 'transaction' | 'whatsapp' | 'general';

// Scanner props
export interface ScannerProps {
  onScanSuccess: (result: ScanResult) => void;
  onScanError: (error: ScannerError) => void;
  mode?: ScannerMode;
  isActive?: boolean;
  className?: string;
  config?: ScannerConfig;
  supportedFormats?: Html5QrcodeSupportedFormats[];
}

// Camera permission state
export interface CameraPermission {
  state: 'granted' | 'denied' | 'prompt';
  canRequest: boolean;
}

// Scanner statistics
export interface ScannerStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  averageProcessingTime: number;
  lastScanTime?: number;
}

// Scan history entry
export interface ScanHistoryEntry {
  id: string;
  result: ScanResult;
  mode: ScannerMode;
  timestamp: number;
  success: boolean;
  error?: string;
  userId?: string;
  sessionId?: string;
}

// Security validation result
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// Scanner session
export interface ScannerSession {
  id: string;
  startTime: number;
  endTime?: number;
  mode: ScannerMode;
  scansCount: number;
  userId?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

// Html5QrcodeSupportedFormats enum (from html5-qrcode library)
export enum Html5QrcodeSupportedFormats {
  QR_CODE = 0,
  AZTEC = 1,
  CODABAR = 2,
  CODE_39 = 3,
  CODE_93 = 4,
  CODE_128 = 5,
  DATA_MATRIX = 6,
  MAXICODE = 7,
  ITF = 8,
  EAN_13 = 9,
  EAN_8 = 10,
  PDF_417 = 11,
  RSS_14 = 12,
  RSS_EXPANDED = 13,
  UPC_A = 14,
  UPC_E = 15,
  UPC_EAN_EXTENSION = 16
}

// Scanner event types
export type ScannerEventType = 
  | 'scan_started'
  | 'scan_success'
  | 'scan_error'
  | 'scan_stopped'
  | 'permission_granted'
  | 'permission_denied'
  | 'camera_started'
  | 'camera_stopped'
  | 'camera_error';

// Scanner event
export interface ScannerEvent {
  type: ScannerEventType;
  timestamp: number;
  data?: any;
  error?: ScannerError;
}

// Scanner state
export interface ScannerState {
  isActive: boolean;
  isScanning: boolean;
  hasPermission: boolean;
  currentMode: ScannerMode;
  lastResult?: ScanResult;
  lastError?: ScannerError;
  stats: ScannerStats;
}