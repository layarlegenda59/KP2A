const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcode.controller');

// Middleware for file upload
const uploadMiddleware = barcodeController.getUploadMiddleware();

/**
 * @route POST /api/barcode/scan
 * @desc Scan barcode from uploaded image
 * @access Public
 * @param {File} image - Image file containing barcode
 * @param {String} scanType - Type of scan (general, member_verification, payment)
 * @param {Boolean} enhance - Whether to enhance image for better scanning
 */
router.post('/scan', uploadMiddleware, barcodeController.scanImage);

/**
 * @route POST /api/barcode/scan/member
 * @desc Scan barcode for member verification
 * @access Public
 * @param {File} image - Image file containing member barcode
 */
router.post('/scan/member', uploadMiddleware, barcodeController.scanMemberVerification);

/**
 * @route POST /api/barcode/scan/payment
 * @desc Scan barcode for payment
 * @access Public
 * @param {File} image - Image file containing payment barcode
 */
router.post('/scan/payment', uploadMiddleware, barcodeController.scanPayment);

/**
 * @route GET /api/barcode/formats
 * @desc Get supported barcode formats
 * @access Public
 */
router.get('/formats', barcodeController.getSupportedFormats);

/**
 * @route GET /api/barcode/health
 * @desc Health check for barcode service
 * @access Public
 */
router.get('/health', barcodeController.healthCheck);

module.exports = router;