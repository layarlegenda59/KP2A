const { BrowserMultiFormatReader, NotFoundException } = require('@zxing/library');
const Jimp = require('jimp');
const fs = require('fs').promises;
const path = require('path');

class BarcodeService {
  constructor() {
    this.reader = new BrowserMultiFormatReader();
    this.supportedFormats = [
      'QR_CODE',
      'CODE_128',
      'CODE_39',
      'EAN_13',
      'EAN_8',
      'UPC_A',
      'UPC_E',
      'DATA_MATRIX',
      'PDF_417',
      'AZTEC'
    ];
  }

  /**
   * Scan barcode from image buffer
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Scanning options
   * @returns {Promise<Object>} Scan result
   */
  async scanFromBuffer(imageBuffer, options = {}) {
    try {
      // Process image with Jimp for better compatibility
      const image = await Jimp.read(imageBuffer);
      
      // Enhance image for better scanning
      if (options.enhance !== false) {
        image
          .greyscale()
          .contrast(0.3)
          .brightness(0.1);
      }

      // Convert to canvas-like format for ZXing
      const { width, height } = image.bitmap;
      const imageData = {
        data: new Uint8ClampedArray(image.bitmap.data),
        width,
        height
      };

      // Attempt to decode
      const result = await this.reader.decodeFromImageData(imageData);
      
      return {
        success: true,
        data: {
          text: result.getText(),
          format: result.getBarcodeFormat().toString(),
          timestamp: new Date().toISOString(),
          confidence: 1.0 // ZXing doesn't provide confidence, assume high if decoded
        },
        metadata: {
          imageWidth: width,
          imageHeight: height,
          processingTime: Date.now()
        }
      };

    } catch (error) {
      console.error('Barcode scanning error:', error);
      
      if (error instanceof NotFoundException) {
        return {
          success: false,
          error: 'NO_BARCODE_FOUND',
          message: 'No barcode or QR code found in the image'
        };
      }

      return {
        success: false,
        error: 'SCAN_ERROR',
        message: error.message || 'Failed to scan barcode'
      };
    }
  }

  /**
   * Scan barcode from file path
   * @param {string} filePath - Path to image file
   * @param {Object} options - Scanning options
   * @returns {Promise<Object>} Scan result
   */
  async scanFromFile(filePath, options = {}) {
    try {
      const imageBuffer = await fs.readFile(filePath);
      return await this.scanFromBuffer(imageBuffer, options);
    } catch (error) {
      console.error('File reading error:', error);
      return {
        success: false,
        error: 'FILE_ERROR',
        message: 'Failed to read image file'
      };
    }
  }

  /**
   * Validate image format
   * @param {string} mimetype - MIME type of the image
   * @returns {boolean} Is valid format
   */
  isValidImageFormat(mimetype) {
    const validFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ];
    return validFormats.includes(mimetype.toLowerCase());
  }

  /**
   * Get supported barcode formats
   * @returns {Array<string>} Supported formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Process scan result for specific use cases
   * @param {Object} scanResult - Raw scan result
   * @param {string} scanType - Type of scan (member_verification, payment, general)
   * @returns {Object} Processed result
   */
  processScanResult(scanResult, scanType = 'general') {
    if (!scanResult.success) {
      return scanResult;
    }

    const { text, format } = scanResult.data;
    let processedData = { ...scanResult.data };

    switch (scanType) {
      case 'member_verification':
        processedData = this.processMemberVerification(text, format);
        break;
      case 'payment':
        processedData = this.processPayment(text, format);
        break;
      case 'general':
      default:
        processedData = this.processGeneral(text, format);
        break;
    }

    return {
      ...scanResult,
      data: processedData,
      scanType
    };
  }

  /**
   * Process member verification barcode
   * @param {string} text - Barcode text
   * @param {string} format - Barcode format
   * @returns {Object} Processed data
   */
  processMemberVerification(text, format) {
    // Check if it's a member ID format
    const memberIdPattern = /^(KP2A|MEMBER)[-_]?(\d+)$/i;
    const match = text.match(memberIdPattern);

    if (match) {
      return {
        type: 'member_id',
        memberId: match[2],
        text,
        format,
        isValid: true,
        timestamp: new Date().toISOString()
      };
    }

    // Check if it's a verification code
    const verificationPattern = /^VERIFY[-_]?([A-Z0-9]{6,})$/i;
    const verifyMatch = text.match(verificationPattern);

    if (verifyMatch) {
      return {
        type: 'verification_code',
        code: verifyMatch[1],
        text,
        format,
        isValid: true,
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: 'unknown',
      text,
      format,
      isValid: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process payment barcode
   * @param {string} text - Barcode text
   * @param {string} format - Barcode format
   * @returns {Object} Processed data
   */
  processPayment(text, format) {
    // Check for QRIS format
    if (text.startsWith('00020101') || text.includes('ID.CO.QRIS')) {
      return {
        type: 'qris',
        text,
        format,
        isValid: true,
        timestamp: new Date().toISOString()
      };
    }

    // Check for payment reference
    const paymentPattern = /^(PAY|PAYMENT)[-_]?([A-Z0-9]+)$/i;
    const match = text.match(paymentPattern);

    if (match) {
      return {
        type: 'payment_reference',
        reference: match[2],
        text,
        format,
        isValid: true,
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: 'unknown',
      text,
      format,
      isValid: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process general barcode
   * @param {string} text - Barcode text
   * @param {string} format - Barcode format
   * @returns {Object} Processed data
   */
  processGeneral(text, format) {
    let type = 'text';

    // Detect URL
    if (text.match(/^https?:\/\//i)) {
      type = 'url';
    }
    // Detect email
    else if (text.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      type = 'email';
    }
    // Detect phone number
    else if (text.match(/^[\+]?[1-9][\d]{3,14}$/)) {
      type = 'phone';
    }
    // Detect WiFi QR
    else if (text.startsWith('WIFI:')) {
      type = 'wifi';
    }

    return {
      type,
      text,
      format,
      isValid: true,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new BarcodeService();