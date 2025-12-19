/**
 * Scanner WhatsApp Integration Service
 * Handles real-time scanner integration with WhatsApp Socket.IO communication
 */

import { ScanResult, ScannerError, ScannerMode } from '../types/scanner';
import whatsappSocketService from './whatsapp-socket.service';
import { validateScanSecurity, validateMemberQR, validatePaymentQR } from '../utils/scannerSecurity';
import { supabase } from '../lib/supabase';

export interface ScannerWhatsAppConfig {
  adminNumbers: string[];
  notificationEnabled: boolean;
  autoProcessPayments: boolean;
  memberVerificationEnabled: boolean;
  sessionId: string;
}

export interface ScanNotification {
  type: 'scan_success' | 'scan_error' | 'member_verified' | 'payment_processed' | 'success' | 'error' | 'warning' | 'info';
  scanResult?: ScanResult;
  error?: ScannerError;
  memberData?: any;
  paymentData?: any;
  message?: string;
  timestamp: string;
  sessionId: string;
}

export interface ScannerWhatsAppInitConfig {
  whatsappService?: any;
  onScanNotification?: (notification: ScanNotification) => void;
  onScanResult?: (result: ScanResult) => void;
}

class ScannerWhatsAppService {
  private config: ScannerWhatsAppConfig = {
    adminNumbers: [],
    notificationEnabled: true,
    autoProcessPayments: false,
    memberVerificationEnabled: true,
    sessionId: 'default'
  };

  private scanCallbacks: ((notification: ScanNotification) => void)[] = [];
  private scanResultCallbacks: ((result: ScanResult) => void)[] = [];
  private whatsappService: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.setupWhatsAppListeners();
  }

  /**
   * Initialize the scanner WhatsApp service with configuration
   */
  async initialize(config: ScannerWhatsAppInitConfig): Promise<void> {
    try {
      console.log('Initializing Scanner WhatsApp Service...', config);
      
      // Store WhatsApp service reference
      if (config.whatsappService) {
        this.whatsappService = config.whatsappService;
      }

      // Register notification callback
      if (config.onScanNotification) {
        this.onScan(config.onScanNotification);
      }

      // Register scan result callback
      if (config.onScanResult) {
        this.onScanResult(config.onScanResult);
      }

      // Mark as initialized
      this.isInitialized = true;

      console.log('Scanner WhatsApp Service initialized successfully');

      // Send initialization notification
      const notification: ScanNotification = {
        type: 'success',
        message: 'Scanner WhatsApp service initialized successfully',
        timestamp: new Date().toISOString(),
        sessionId: this.config.sessionId
      };

      this.notifyScanCallbacks(notification);

    } catch (error) {
      console.error('Error initializing Scanner WhatsApp Service:', error);
      
      const errorNotification: ScanNotification = {
        type: 'error',
        message: `Failed to initialize scanner service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        sessionId: this.config.sessionId
      };

      this.notifyScanCallbacks(errorNotification);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Configure the scanner WhatsApp integration
   */
  configure(config: Partial<ScannerWhatsAppConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Setup WhatsApp Socket.IO listeners for scanner events
   */
  private setupWhatsAppListeners(): void {
    // Listen for scanner commands from WhatsApp messages
    whatsappSocketService.onMessage((message) => {
      this.handleWhatsAppScannerCommand(message);
    });
  }

  /**
   * Handle scanner commands received via WhatsApp
   */
  private async handleWhatsAppScannerCommand(message: any): Promise<void> {
    const text = message.message?.toLowerCase() || message.content?.toLowerCase() || '';
    
    // Check for scanner-related commands
    if (text.includes('scan') || text.includes('qr') || text.includes('barcode')) {
      const response = this.generateScannerHelpMessage();
      await this.sendWhatsAppMessage(message.from, response);
    }
    
    // Check for member verification commands
    if (text.includes('verify') || text.includes('verifikasi')) {
      const response = this.generateVerificationHelpMessage();
      await this.sendWhatsAppMessage(message.from, response);
    }
  }

  /**
   * Process scan result and integrate with WhatsApp
   */
  async processScanResult(
    result: ScanResult, 
    mode: ScannerMode,
    userId?: string
  ): Promise<void> {
    try {
      // Security validation
      const securityValidation = validateScanSecurity(result);
      if (!securityValidation.isValid) {
        const error: ScannerError = {
          code: 'SECURITY_VALIDATION_FAILED',
          message: securityValidation.errors.join(', '),
          type: 'SECURITY_ERROR',
          timestamp: new Date().toISOString(),
          recoverable: false
        };
        
        await this.notifyError(error, mode);
        return;
      }

      // Process based on scanner mode
      switch (mode) {
        case 'member':
          await this.processMemberVerification(result, userId);
          break;
        case 'payment':
          await this.processPaymentScan(result, userId);
          break;
        case 'general':
          await this.processGeneralScan(result, userId);
          break;
        default:
          await this.processGeneralScan(result, userId);
      }

      // Save to database
      await this.saveScanToDatabase(result, mode, userId);

      // Notify success
      const notification: ScanNotification = {
        type: 'scan_success',
        scanResult: result,
        timestamp: new Date().toISOString(),
        sessionId: this.config.sessionId
      };

      this.notifyScanCallbacks(notification);
      
      // Also notify scan result callbacks
      this.notifyScanResultCallbacks(result);

    } catch (error) {
      console.error('Error processing scan result:', error);
      
      const scanError: ScannerError = {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        type: 'SCAN_ERROR',
        timestamp: new Date().toISOString(),
        recoverable: true
      };

      await this.notifyError(scanError, mode);
    }
  }

  /**
   * Process member verification scan
   */
  private async processMemberVerification(result: ScanResult, userId?: string): Promise<void> {
    if (!this.config.memberVerificationEnabled) {
      return;
    }

    const memberValidation = validateMemberQR(result.text);
    if (!memberValidation.isValid) {
      throw new Error(`Invalid member QR: ${memberValidation.errors.join(', ')}`);
    }

    const memberData = memberValidation.parsedData;
    
    // Save member verification to database
    const { error } = await supabase
      .from('member_verification_scans')
      .insert({
        member_id: memberData?.memberId || result.text,
        member_name: memberData?.memberName || 'Unknown',
        scan_data: result.text,
        verification_status: 'verified',
        scanned_by: userId,
        scanned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Send WhatsApp notification
    if (this.config.notificationEnabled) {
      const message = this.formatMemberVerificationMessage(memberData);
      await this.broadcastToAdmins(message);
    }

    // Notify callbacks
    const notification: ScanNotification = {
      type: 'member_verified',
      scanResult: result,
      memberData,
      timestamp: new Date().toISOString(),
      sessionId: this.config.sessionId
    };

    this.notifyScanCallbacks(notification);
  }

  /**
   * Process payment scan
   */
  private async processPaymentScan(result: ScanResult, userId?: string): Promise<void> {
    const paymentValidation = validatePaymentQR(result.text);
    if (!paymentValidation.isValid) {
      throw new Error(`Invalid payment QR: ${paymentValidation.errors.join(', ')}`);
    }

    const paymentData = paymentValidation.parsedData;

    // Save payment scan to database
    const { error } = await supabase
      .from('payment_scans')
      .insert({
        scan_data: result.text,
        amount: paymentData?.amount || 0,
        currency: paymentData?.currency || 'IDR',
        merchant_id: paymentData?.merchant_id,
        transaction_id: paymentData?.transaction_id,
        status: this.config.autoProcessPayments ? 'processed' : 'pending',
        scanned_by: userId,
        scanned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Send WhatsApp notification
    if (this.config.notificationEnabled) {
      const message = this.formatPaymentScanMessage(paymentData);
      await this.broadcastToAdmins(message);
    }

    // Auto-process payment if enabled
    if (this.config.autoProcessPayments) {
      // TODO: Integrate with payment processing system
      console.log('Auto-processing payment:', paymentData);
    }

    // Notify callbacks
    const notification: ScanNotification = {
      type: 'payment_processed',
      scanResult: result,
      paymentData,
      timestamp: new Date().toISOString(),
      sessionId: this.config.sessionId
    };

    this.notifyScanCallbacks(notification);
  }

  /**
   * Process general scan
   */
  private async processGeneralScan(result: ScanResult, userId?: string): Promise<void> {
    // Save general scan to database
    const { error } = await supabase
      .from('scan_results')
      .insert({
        scan_data: result.text,
        scan_format: result.format,
        scan_type: 'general',
        confidence_score: result.confidence || 1.0,
        metadata: JSON.stringify(result.metadata || {}),
        scanned_by: userId,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Send WhatsApp notification for important scans
    if (this.config.notificationEnabled && this.isImportantScan(result)) {
      const message = this.formatGeneralScanMessage(result);
      await this.broadcastToAdmins(message);
    }
  }

  /**
   * Save scan to database
   */
  private async saveScanToDatabase(result: ScanResult, mode: ScannerMode, userId?: string): Promise<void> {
    // Create or update scan session
    const { data: session, error: sessionError } = await supabase
      .from('scan_sessions')
      .upsert({
        session_id: this.config.sessionId,
        session_type: mode,
        status: 'active',
        user_id: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Error creating scan session:', sessionError);
    }

    // Save scan result
    const { error } = await supabase
      .from('scan_results')
      .insert({
        session_id: session?.id,
        scan_data: result.text,
        scan_format: result.format,
        scan_type: mode,
        confidence_score: result.confidence || 1.0,
        metadata: JSON.stringify(result.metadata || {}),
        scanned_by: userId,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving scan result:', error);
    }
  }

  /**
   * Notify error via WhatsApp
   */
  private async notifyError(error: ScannerError, mode: ScannerMode): Promise<void> {
    if (!this.config.notificationEnabled) {
      return;
    }

    const message = `🚨 *Scanner Error*\n\n` +
      `Mode: ${mode}\n` +
      `Error: ${error.message}\n` +
      `Code: ${error.code}\n` +
      `Time: ${new Date().toLocaleString('id-ID')}\n` +
      `Recoverable: ${error.recoverable ? 'Yes' : 'No'}`;

    await this.broadcastToAdmins(message);

    // Notify callbacks
    const notification: ScanNotification = {
      type: 'scan_error',
      error,
      timestamp: new Date().toISOString(),
      sessionId: this.config.sessionId
    };

    this.notifyScanCallbacks(notification);
  }

  /**
   * Format member verification message
   */
  private formatMemberVerificationMessage(memberData: any): string {
    return `✅ *Member Verified*\n\n` +
      `Member ID: ${memberData?.memberId || 'Unknown'}\n` +
      `Name: ${memberData?.memberName || 'Unknown'}\n` +
      `Time: ${new Date().toLocaleString('id-ID')}\n` +
      `Status: Verified`;
  }

  /**
   * Format payment scan message
   */
  private formatPaymentScanMessage(paymentData: any): string {
    const amount = paymentData?.amount ? 
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(paymentData.amount) : 
      'Unknown';

    return `💰 *Payment Scanned*\n\n` +
      `Amount: ${amount}\n` +
      `Merchant: ${paymentData?.merchant_name || 'Unknown'}\n` +
      `Transaction ID: ${paymentData?.transaction_id || 'Unknown'}\n` +
      `Time: ${new Date().toLocaleString('id-ID')}\n` +
      `Status: ${this.config.autoProcessPayments ? 'Auto-processed' : 'Pending'}`;
  }

  /**
   * Format general scan message
   */
  private formatGeneralScanMessage(result: ScanResult): string {
    return `🔍 *General Scan*\n\n` +
      `Format: ${result.format}\n` +
      `Data: ${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}\n` +
      `Time: ${new Date().toLocaleString('id-ID')}\n` +
      `Confidence: ${Math.round((result.confidence || 1) * 100)}%`;
  }

  /**
   * Generate scanner help message
   */
  private generateScannerHelpMessage(): string {
    return `📱 *Scanner Help*\n\n` +
      `Available scanner modes:\n` +
      `• Member verification\n` +
      `• Payment processing\n` +
      `• General scanning\n\n` +
      `Use the web interface to access the scanner functionality.`;
  }

  /**
   * Generate verification help message
   */
  private generateVerificationHelpMessage(): string {
    return `✅ *Member Verification*\n\n` +
      `To verify a member:\n` +
      `1. Use the scanner in member verification mode\n` +
      `2. Scan the member's QR code\n` +
      `3. Verification will be processed automatically\n\n` +
      `Contact admin for assistance.`;
  }

  /**
   * Check if scan is important enough to notify
   */
  private isImportantScan(result: ScanResult): boolean {
    // Consider scans important if they contain URLs, phone numbers, or structured data
    const text = result.text.toLowerCase();
    return text.includes('http') || 
           text.includes('tel:') || 
           text.includes('mailto:') ||
           text.includes('{') || 
           text.includes('BEGIN:');
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(to: string, message: string): Promise<void> {
    try {
      await whatsappSocketService.sendMessage(to, message, this.config.sessionId);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }
  }

  /**
   * Broadcast message to all admin numbers
   */
  private async broadcastToAdmins(message: string): Promise<void> {
    const promises = this.config.adminNumbers.map(number => 
      this.sendWhatsAppMessage(number, message)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Add scan callback
   */
  onScan(callback: (notification: ScanNotification) => void): void {
    this.scanCallbacks.push(callback);
  }

  /**
   * Add scan result callback
   */
  onScanResult(callback: (result: ScanResult) => void): void {
    this.scanResultCallbacks.push(callback);
  }

  /**
   * Remove scan callback
   */
  removeScanCallback(callback: (notification: ScanNotification) => void): void {
    const index = this.scanCallbacks.indexOf(callback);
    if (index > -1) {
      this.scanCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove scan result callback
   */
  removeScanResultCallback(callback: (result: ScanResult) => void): void {
    const index = this.scanResultCallbacks.indexOf(callback);
    if (index > -1) {
      this.scanResultCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify scan callbacks
   */
  private notifyScanCallbacks(notification: ScanNotification): void {
    this.scanCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in scan callback:', error);
      }
    });
  }

  /**
   * Notify scan result callbacks
   */
  private notifyScanResultCallbacks(result: ScanResult): void {
    this.scanResultCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in scan result callback:', error);
      }
    });
  }

  /**
   * Get scan statistics
   */
  async getScanStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const startDate = new Date();
    switch (timeRange) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('scan_results')
      .select('scan_type, scan_format, created_at')
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw new Error(`Error fetching scan statistics: ${error.message}`);
    }

    // Process statistics
    const stats = {
      totalScans: data.length,
      scansByType: {} as Record<string, number>,
      scansByFormat: {} as Record<string, number>,
      scansPerDay: {} as Record<string, number>
    };

    data.forEach(scan => {
      // Count by type
      stats.scansByType[scan.scan_type] = (stats.scansByType[scan.scan_type] || 0) + 1;
      
      // Count by format
      stats.scansByFormat[scan.scan_format] = (stats.scansByFormat[scan.scan_format] || 0) + 1;
      
      // Count by day
      const day = new Date(scan.created_at).toDateString();
      stats.scansPerDay[day] = (stats.scansPerDay[day] || 0) + 1;
    });

    return stats;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.scanCallbacks = [];
    this.scanResultCallbacks = [];
    this.whatsappService = null;
    this.isInitialized = false;
  }
}

// Create and export singleton instance
const scannerWhatsAppService = new ScannerWhatsAppService();
export default scannerWhatsAppService;