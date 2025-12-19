import React from 'react';
import { motion } from 'framer-motion';
import { FaSync, FaStop, FaBolt, FaCameraRetro, FaTimes } from 'react-icons/fa';

interface ScannerControlsProps {
  isScanning: boolean;
  onRestart: () => void;
  onStop: () => void;
  onClose?: () => void;
  mode: 'whatsapp' | 'transaction' | 'verification';
  torchEnabled?: boolean;
  onToggleTorch?: () => void;
  cameraFacing?: 'front' | 'back';
  onSwitchCamera?: () => void;
}

const ScannerControls: React.FC<ScannerControlsProps> = ({
  isScanning,
  onRestart,
  onStop,
  onClose,
  mode,
  torchEnabled = false,
  onToggleTorch,
  cameraFacing = 'back',
  onSwitchCamera
}) => {
  const getContextLabel = () => {
    switch (mode) {
      case 'whatsapp':
        return 'WhatsApp Scanner';
      case 'transaction':
        return 'Payment Scanner';
      case 'verification':
        return 'Member Verification';
      default:
        return 'Barcode Scanner';
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-30">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 backdrop-blur-sm rounded-lg p-4"
      >
        {/* Context Label */}
        <div className="text-center mb-4">
          <p className="text-white text-sm font-medium">
            {getContextLabel()}
          </p>
          <p className="text-white/70 text-xs">
            {isScanning ? 'Scanning aktif...' : 'Scanner siap'}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4">
          {/* Restart Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRestart}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
            title="Restart Scanner"
          >
            <FaSync className="h-5 w-5" />
          </motion.button>

          {/* Stop Button */}
          {isScanning && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onStop}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
              title="Stop Scanner"
            >
              <FaStop className="h-5 w-5" />
            </motion.button>
          )}

          {/* Torch Toggle (if supported) */}
          {onToggleTorch && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleTorch}
              className={`p-3 rounded-full shadow-lg transition-colors ${
                torchEnabled 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
              title={torchEnabled ? 'Turn Off Flash' : 'Turn On Flash'}
            >
              <FaBolt className="h-5 w-5" />
            </motion.button>
          )}

          {/* Camera Switch (if supported) */}
          {onSwitchCamera && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSwitchCamera}
              className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg transition-colors"
              title={`Switch to ${cameraFacing === 'back' ? 'Front' : 'Back'} Camera`}
            >
              <FaCameraRetro className="h-5 w-5" />
            </motion.button>
          )}

          {/* Close Button */}
          {onClose && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-3 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-lg transition-colors"
              title="Close Scanner"
            >
              <FaTimes className="h-5 w-5" />
            </motion.button>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          {/* Scanning Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`}></div>
            <span className="text-white/70 text-xs">
              {isScanning ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Camera Status */}
          <div className="flex items-center space-x-2">
            <FaCameraRetro className="h-3 w-3 text-white/70" />
            <span className="text-white/70 text-xs capitalize">
              {cameraFacing}
            </span>
          </div>

          {/* Flash Status */}
          {onToggleTorch && (
            <div className="flex items-center space-x-2">
              <FaBolt className={`h-3 w-3 ${
                torchEnabled ? 'text-yellow-400' : 'text-white/70'
              }`} />
              <span className="text-white/70 text-xs">
                {torchEnabled ? 'On' : 'Off'}
              </span>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-xs">
            {mode === 'whatsapp' && 'Scan QR code atau barcode untuk WhatsApp Bot'}
            {mode === 'transaction' && 'Arahkan kamera ke QR code pembayaran'}
            {mode === 'verification' && 'Scan barcode anggota untuk verifikasi'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ScannerControls;