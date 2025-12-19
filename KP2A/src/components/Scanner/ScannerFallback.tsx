import React, { useState, useCallback, useRef } from 'react';
import { FaUpload, FaKeyboard, FaCamera, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { ScanResult, BarcodeFormat } from '../../types/scanner';
import BrowserCompatibility from '../../utils/browserCompatibility';

interface ScannerFallbackProps {
  onScanSuccess: (result: ScanResult) => void;
  onScanError?: (error: Error) => void;
  supportedFormats?: BarcodeFormat[];
  className?: string;
  reason?: string;
}

interface FallbackOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  component: React.ReactNode;
}

export const ScannerFallback: React.FC<ScannerFallbackProps> = ({
  onScanSuccess,
  onScanError,
  supportedFormats = ['QR_CODE', 'CODE_128', 'CODE_39', 'EAN_13'],
  className = '',
  reason = 'Scanner is not available'
}) => {
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry component
  const ManualEntry: React.FC = () => {
    const [manualInput, setManualInput] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<BarcodeFormat>('QR_CODE');

    const handleManualSubmit = useCallback(() => {
      if (!manualInput.trim()) {
        onScanError?.(new Error('Please enter a barcode value'));
        return;
      }

      const result: ScanResult = {
        text: manualInput.trim(),
        format: selectedFormat,
        timestamp: new Date(),
        confidence: 1.0,
        rawData: { manual: true }
      };

      onScanSuccess(result);
      setManualInput('');
    }, [manualInput, selectedFormat]);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barcode Format
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as BarcodeFormat)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {supportedFormats.map(format => (
              <option key={format} value={format}>
                {format.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barcode Value
          </label>
          <textarea
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter the barcode or QR code content..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
          />
        </div>

        <button
          onClick={handleManualSubmit}
          disabled={!manualInput.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Submit Barcode
        </button>
      </div>
    );
  };

  // File upload component
  const FileUpload: React.FC = () => {
    const [dragOver, setDragOver] = useState(false);

    const processImageFile = useCallback(async (file: File) => {
      if (!file.type.startsWith('image/')) {
        onScanError?.(new Error('Please select an image file'));
        return;
      }

      setIsProcessing(true);

      try {
        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);

          try {
            // Try to use BarcodeDetector if available
            if ('BarcodeDetector' in window) {
              const barcodeDetector = new (window as any).BarcodeDetector({
                formats: supportedFormats.map(f => f.toLowerCase())
              });

              const barcodes = await barcodeDetector.detect(canvas);
              
              if (barcodes.length > 0) {
                const barcode = barcodes[0];
                const result: ScanResult = {
                  text: barcode.rawValue,
                  format: barcode.format.toUpperCase() as BarcodeFormat,
                  timestamp: new Date(),
                  confidence: 0.9,
                  rawData: barcode
                };

                onScanSuccess(result);
              } else {
                onScanError?.(new Error('No barcode found in the image'));
              }
            } else {
              // Fallback: suggest manual entry
              onScanError?.(new Error('Automatic barcode detection is not supported. Please try manual entry.'));
            }
          } catch (error) {
            onScanError?.(error as Error);
          } finally {
            setIsProcessing(false);
          }
        };

        img.onerror = () => {
          setIsProcessing(false);
          onScanError?.(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
      } catch (error) {
        setIsProcessing(false);
        onScanError?.(error as Error);
      }
    }, [supportedFormats, onScanSuccess, onScanError]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processImageFile(file);
      }
    }, [processImageFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      
      const file = e.dataTransfer.files[0];
      if (file) {
        processImageFile(file);
      }
    }, [processImageFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    }, []);

    return (
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600">Processing image...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <FaUpload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drop an image here or click to select
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports JPG, PNG, GIF, and other image formats
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Select Image
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Take a clear photo of the barcode with good lighting</p>
          <p>• Ensure the barcode is fully visible and not blurry</p>
          <p>• Avoid shadows or reflections on the barcode</p>
        </div>
      </div>
    );
  };

  // Native camera component (for mobile)
  const NativeCamera: React.FC = () => {
    const handleNativeCameraClick = useCallback(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, []);

    return (
      <div className="space-y-4">
        <div className="text-center p-8 border border-gray-300 rounded-lg">
          <FaCamera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Use Device Camera
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Take a photo of the barcode using your device's camera app
          </p>
          <button
            onClick={handleNativeCameraClick}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Open Camera
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Process the captured image
              const fileUpload = new FileUpload();
              // This would need to be refactored to share the processing logic
            }
          }}
          className="hidden"
        />

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Position the barcode within the camera frame</p>
          <p>• Ensure good lighting and focus</p>
          <p>• Hold the device steady when capturing</p>
        </div>
      </div>
    );
  };

  // Get available fallback options
  const getFallbackOptions = useCallback((): FallbackOption[] => {
    const capabilities = BrowserCompatibility.detectCapabilities();
    
    return [
      {
        id: 'manual',
        title: 'Manual Entry',
        description: 'Type the barcode content manually',
        icon: <FaKeyboard className="h-6 w-6" />,
        available: true,
        component: <ManualEntry />
      },
      {
        id: 'upload',
        title: 'Upload Image',
        description: 'Upload a photo of the barcode',
        icon: <FaUpload className="h-6 w-6" />,
        available: true,
        component: <FileUpload />
      },
      {
        id: 'camera',
        title: 'Device Camera',
        description: 'Use your device\'s native camera',
        icon: <FaCamera className="h-6 w-6" />,
        available: capabilities.isMobile,
        component: <NativeCamera />
      }
    ];
  }, []);

  const fallbackOptions = getFallbackOptions();
  const availableOptions = fallbackOptions.filter(option => option.available);

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-4">
        <div className="flex items-center space-x-3">
          <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">
              Scanner Unavailable
            </h3>
            <p className="text-sm text-yellow-700">{reason}</p>
          </div>
        </div>
      </div>

      {/* Fallback Options */}
      <div className="p-6">
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-700 mb-2">
            Alternative Methods
          </h4>
          <p className="text-sm text-gray-500">
            Choose an alternative way to input your barcode:
          </p>
        </div>

        {/* Option Selector */}
        {!activeOption && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveOption(option.id)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="text-blue-500">{option.icon}</div>
                  <h5 className="font-medium text-gray-700">{option.title}</h5>
                </div>
                <p className="text-sm text-gray-500">{option.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Active Option */}
        {activeOption && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-blue-500">
                  {availableOptions.find(opt => opt.id === activeOption)?.icon}
                </div>
                <h5 className="font-medium text-gray-700">
                  {availableOptions.find(opt => opt.id === activeOption)?.title}
                </h5>
              </div>
              <button
                onClick={() => setActiveOption(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to options
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              {availableOptions.find(opt => opt.id === activeOption)?.component}
            </div>
          </div>
        )}

        {/* Browser Compatibility Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <FaInfoCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 mb-1">
                Browser Compatibility
              </p>
              <div className="text-blue-700 space-y-1">
                {BrowserCompatibility.getFallbackOptions().map((fallback, index) => (
                  <p key={index}>• {fallback}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Success Tips */}
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <FaCheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-800 mb-1">
                Tips for Best Results
              </p>
              <div className="text-green-700 space-y-1">
                <p>• Ensure barcodes are clear and well-lit</p>
                <p>• Double-check manually entered data</p>
                <p>• Use the highest quality images possible</p>
                <p>• Try different angles if scanning fails</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerFallback;