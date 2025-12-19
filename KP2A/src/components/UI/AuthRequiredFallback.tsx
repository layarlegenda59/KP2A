import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { FaLock, FaSignInAlt, FaExclamationTriangle } from 'react-icons/fa';

interface AuthRequiredFallbackProps {
  title?: string;
  message?: string;
  onLoginClick?: () => void;
  showLoginButton?: boolean;
}

export const AuthRequiredFallback: React.FC<AuthRequiredFallbackProps> = ({
  title = "Akses Terbatas",
  message = "Anda perlu login untuk mengakses fitur ini.",
  onLoginClick,
  showLoginButton = true
}) => {
  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      // Default behavior - redirect to login page
      window.location.href = '/login';
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
          <FaLock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
          <FaExclamationTriangle className="w-5 h-5" />
          <p className="text-sm font-medium">Autentikasi Diperlukan</p>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          {message}
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Catatan:</strong> Data simpanan dan pinjaman dilindungi oleh sistem keamanan. 
            Silakan login dengan akun yang valid untuk mengakses informasi ini.
          </p>
        </div>
        
        {showLoginButton && (
          <Button 
            onClick={handleLoginClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FaSignInAlt className="w-4 h-4 mr-2" />
            Login Sekarang
          </Button>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Jika Anda sudah login, coba refresh halaman atau hubungi administrator.
        </p>
      </CardContent>
    </Card>
  );
};

export default AuthRequiredFallback;