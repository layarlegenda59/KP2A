import React from 'react';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { FaSpinner, FaExclamationTriangle, FaRedo } from 'react-icons/fa';

// Skeleton Loading Components
export const SkeletonCard: React.FC = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
    </CardContent>
  </Card>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="animate-pulse">
    {/* Table Header */}
    <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      ))}
    </div>
    
    {/* Table Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 dark:border-gray-800">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </CardContent>
  </Card>
);

export const SkeletonStats: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <FaSpinner className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && <span className="text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
};

// Full Page Loading
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = 'Memuat data...' 
}) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// Error Display Component
export const ErrorDisplay: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}> = ({ 
  title = 'Terjadi Kesalahan',
  message,
  onRetry,
  showRetry = true
}) => (
  <Card className="border-red-200 dark:border-red-800">
    <CardContent className="p-6">
      <div className="flex items-start space-x-3">
        <FaExclamationTriangle className="w-5 h-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="text-red-600 dark:text-red-300 mt-1">
            {message}
          </p>
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              <FaRedo className="w-3 h-3 mr-2" />
              Coba Lagi
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Empty State Component
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="text-center py-12">
    {icon && (
      <div className="flex justify-center mb-4 text-gray-400 dark:text-gray-600">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    {description && (
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
    )}
    {action && (
      <Button onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

// Retry Mechanism Hook
export const useRetry = (
  operation: () => Promise<void>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const retry = React.useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, delay * retryCount));
      await operation();
      setRetryCount(0); // Reset on success
    } catch (error) {
      console.error(`Retry attempt ${retryCount + 1} failed:`, error);
    } finally {
      setIsRetrying(false);
    }
  }, [operation, retryCount, maxRetries, delay]);

  const reset = React.useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retry,
    reset,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries
  };
};