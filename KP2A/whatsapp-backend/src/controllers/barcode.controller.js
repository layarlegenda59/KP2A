const barcodeService = require('../services/barcode.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (barcodeService.isValidImageFormat(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload an image file.'), false);
    }
  }
});

class BarcodeController {
  /**
   * Scan barcode from uploaded image
   */
  async scanImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE',
          message: 'No image file provided'
        });
      }

      const { scanType = 'general', enhance = true } = req.body;
      
      // Validate scan type
      const validScanTypes = ['member_verification', 'payment', 'general'];
      if (!validScanTypes.includes(scanType)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_SCAN_TYPE',
          message: 'Invalid scan type. Must be one of: ' + validScanTypes.join(', ')
        });
      }

      console.log(`🔍 Scanning ${scanType} barcode from uploaded image...`);

      // Scan the image
      const scanResult = await barcodeService.scanFromBuffer(req.file.buffer, {
        enhance: enhance === 'true' || enhance === true
      });

      if (!scanResult.success) {
        return res.status(422).json(scanResult);
      }

      // Process the result based on scan type
      const processedResult = barcodeService.processScanResult(scanResult, scanType);

      console.log(`✅ Barcode scan successful:`, {
        type: processedResult.data.type,
        format: processedResult.data.format,
        scanType: processedResult.scanType
      });

      res.json(processedResult);

    } catch (error) {
      console.error('❌ Barcode scan error:', error);
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        });
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error during barcode scanning'
      });
    }
  }

  /**
   * Get supported barcode formats
   */
  async getSupportedFormats(req, res) {
    try {
      const formats = barcodeService.getSupportedFormats();
      
      res.json({
        success: true,
        data: {
          formats,
          count: formats.length
        }
      });
    } catch (error) {
      console.error('❌ Error getting supported formats:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get supported formats'
      });
    }
  }

  /**
   * Health check for barcode service
   */
  async healthCheck(req, res) {
    try {
      res.json({
        success: true,
        data: {
          service: 'barcode-scanner',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          supportedFormats: barcodeService.getSupportedFormats().length
        }
      });
    } catch (error) {
      console.error('❌ Barcode service health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'SERVICE_UNHEALTHY',
        message: 'Barcode service is not healthy'
      });
    }
  }

  /**
   * Scan barcode for member verification
   */
  async scanMemberVerification(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE',
          message: 'No image file provided'
        });
      }

      console.log('🔍 Scanning member verification barcode...');

      const scanResult = await barcodeService.scanFromBuffer(req.file.buffer);
      
      if (!scanResult.success) {
        return res.status(422).json(scanResult);
      }

      const processedResult = barcodeService.processScanResult(scanResult, 'member_verification');

      // Additional validation for member verification
      if (!processedResult.data.isValid) {
        return res.status(422).json({
          success: false,
          error: 'INVALID_MEMBER_CODE',
          message: 'Barcode does not contain valid member verification data'
        });
      }

      console.log(`✅ Member verification scan successful:`, {
        type: processedResult.data.type,
        memberId: processedResult.data.memberId || processedResult.data.code
      });

      res.json(processedResult);

    } catch (error) {
      console.error('❌ Member verification scan error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error during member verification scan'
      });
    }
  }

  /**
   * Scan barcode for payment
   */
  async scanPayment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE',
          message: 'No image file provided'
        });
      }

      console.log('🔍 Scanning payment barcode...');

      const scanResult = await barcodeService.scanFromBuffer(req.file.buffer);
      
      if (!scanResult.success) {
        return res.status(422).json(scanResult);
      }

      const processedResult = barcodeService.processScanResult(scanResult, 'payment');

      console.log(`✅ Payment scan successful:`, {
        type: processedResult.data.type,
        format: processedResult.data.format
      });

      res.json(processedResult);

    } catch (error) {
      console.error('❌ Payment scan error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error during payment scan'
      });
    }
  }

  /**
   * Get multer middleware for file upload
   */
  getUploadMiddleware() {
    return upload.single('image');
  }
}

module.exports = new BarcodeController();