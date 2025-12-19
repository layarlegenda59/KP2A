import React from 'react';
import { motion } from 'framer-motion';
import { FaCamera, FaExclamationTriangle, FaShieldAlt, FaInfoCircle, FaLock } from 'react-icons/fa';
import { CameraPermission as CameraPermissionType } from '../../types/scanner';

interface CameraPermissionProps {
  permission: CameraPermissionType;
  isLoading?: boolean;
  onRequestPermission: () => void;
  mode: 'whatsapp' | 'transaction' | 'verification';
  className?: string;
}

const CameraPermission: React.FC<CameraPermissionProps> = ({
  permission,
  isLoading = false,
  onRequestPermission,
  mode,
  className
}) => {
  const getContextMessage = () => {
    switch (mode) {
      case 'whatsapp':
        return 'untuk menggunakan fitur scanner di WhatsApp Bot';
      case 'transaction':
        return 'untuk memindai QR code pembayaran';
      case 'verification':
        return 'untuk verifikasi anggota melalui barcode';
      default:
        return 'untuk menggunakan fitur scanner';
    }
  };

  const getPermissionIcon = () => {
    switch (permission.state) {
      case 'denied':
        return <FaExclamationTriangle className="h-16 w-16 text-red-500" />;
      case 'granted':
        return <FaCamera className="h-16 w-16 text-green-500" />;
      default:
        return <FaShieldAlt className="h-16 w-16 text-blue-500" />;
    }
  };

  const getPermissionTitle = () => {
    switch (permission.state) {
      case 'denied':
        return 'Akses Kamera Ditolak';
      case 'granted':
        return 'Akses Kamera Diberikan';
      default:
        return 'Izin Akses Kamera Diperlukan';
    }
  };

  const getPermissionMessage = () => {
    switch (permission.state) {
      case 'denied':
        return `Akses kamera diperlukan ${getContextMessage()}. Silakan aktifkan kamera di pengaturan browser Anda.`;
      case 'granted':
        return 'Akses kamera telah diberikan. Scanner akan dimulai secara otomatis.';
      default:
        return `KP2A Cimahi memerlukan akses kamera ${getContextMessage()}. Data kamera tidak akan disimpan atau dibagikan.`;
    }
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) {
      return 'Chrome: Klik ikon kamera di address bar → Pilih "Allow"';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox: Klik ikon kamera di address bar → Pilih "Allow"';
    } else if (userAgent.includes('Safari')) {
      return 'Safari: Safari → Preferences → Websites → Camera → Allow';
    } else if (userAgent.includes('Edge')) {
      return 'Edge: Klik ikon kamera di address bar → Pilih "Allow"';
    }
    return 'Aktifkan akses kamera di pengaturan browser Anda';
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto p-8 text-center"
      >
        {/* Permission Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex justify-center mb-6"
        >
          {getPermissionIcon()}
        </motion.div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {getPermissionTitle()}
        </h3>

        {/* Message */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {getPermissionMessage()}
        </p>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <FaInfoCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Keamanan & Privasi
              </p>
              <p className="text-sm text-blue-700">
                • Kamera hanya digunakan untuk scanning<br/>
                • Data tidak disimpan atau dikirim ke server<br/>
                • Akses kamera dapat dicabut kapan saja<br/>
                • Sesuai standar keamanan KP2A Cimahi
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {permission.state !== 'granted' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRequestPermission}
            disabled={isLoading || !permission.canRequest}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
              isLoading || !permission.canRequest
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Meminta Izin...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <FaCamera className="h-4 w-4" />
                <span>
                  {permission.state === 'denied' ? 'Coba Lagi' : 'Berikan Akses Kamera'}
                </span>
              </div>
            )}
          </motion.button>
        )}

        {/* Browser Instructions for Denied State */}
        {permission.state === 'denied' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <FaLock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Cara Mengaktifkan Kamera:
                </p>
                <p className="text-sm text-yellow-700">
                  {getBrowserInstructions()}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Setelah mengaktifkan, refresh halaman ini
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {permission.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {permission.error}
            </p>
          </div>
        )}

        {/* HTTPS Warning */}
        {location.protocol !== 'https:' && location.hostname !== 'localhost' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <FaExclamationTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-red-800 mb-1">
                  HTTPS Diperlukan
                </p>
                <p className="text-sm text-red-700">
                  Akses kamera memerlukan koneksi HTTPS yang aman. 
                  Silakan akses aplikasi melalui HTTPS untuk menggunakan fitur scanner.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Context-specific Help */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            Butuh bantuan? Hubungi admin KP2A Cimahi atau 
            <br/>
            lihat panduan penggunaan di menu Help
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CameraPermission;