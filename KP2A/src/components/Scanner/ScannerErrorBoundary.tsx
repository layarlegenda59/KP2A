import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import { logSecurityEvent } from '../../utils/scannerSecurity';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ScannerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error securely
    console.error('Scanner Error Boundary caught an error:', error, errorInfo);
    
    // Log security event
    logSecurityEvent('scan_error', {
      error: error.message,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      componentStack: errorInfo.componentStack?.substring(0, 500),
      errorBoundary: true
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FaExclamationTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Scanner Error
          </h3>
          <p className="text-gray-600 text-center mb-4 max-w-md">
            An error occurred while loading the scanner. This might be due to camera permissions, 
            browser compatibility, or network issues.
          </p>
          
          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
              <summary className="cursor-pointer font-medium text-red-800">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 text-red-700">
                <p><strong>Error:</strong> {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaRedo className="h-4 w-4 mr-2" />
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-500 text-center">
            <p className="mb-2">Troubleshooting tips:</p>
            <ul className="text-left space-y-1">
              <li>• Ensure camera permissions are granted</li>
              <li>• Use HTTPS connection for camera access</li>
              <li>• Try a different browser or device</li>
              <li>• Check if camera is being used by another application</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ScannerErrorBoundary;