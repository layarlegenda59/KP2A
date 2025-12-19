/**
 * Browser Compatibility Utility for Scanner System
 * Handles cross-browser differences and provides fallbacks
 */

export interface BrowserCapabilities {
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasImageCapture: boolean;
  hasWebRTC: boolean;
  hasWebAssembly: boolean;
  hasWorkers: boolean;
  hasOffscreenCanvas: boolean;
  supportsTorch: boolean;
  supportsConstraints: boolean;
  supportsVideoTracks: boolean;
  browserName: string;
  browserVersion: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
}

export interface CompatibilityFixes {
  needsPolyfill: boolean;
  requiresUserGesture: boolean;
  hasConstraintLimitations: boolean;
  needsVideoElementWorkaround: boolean;
  supportsAdvancedConstraints: boolean;
  maxResolution: { width: number; height: number };
  recommendedFPS: number;
}

export class BrowserCompatibility {
  private static capabilities: BrowserCapabilities | null = null;
  private static fixes: CompatibilityFixes | null = null;

  /**
   * Detect browser capabilities
   */
  static detectBrowserCapabilities(): BrowserCapabilities {
    return this.detectCapabilities();
  }

  /**
   * Internal method to detect browser capabilities
   */
  private static detectCapabilities(): BrowserCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobile/.test(userAgent);
    
    // Browser detection
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isEdge = /Edge/.test(userAgent) || /Edg\//.test(userAgent);

    // Extract browser version
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (isChrome) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (isFirefox) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (isSafari) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (isEdge) {
      browserName = 'Edge';
      const match = userAgent.match(/Edg?\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    this.capabilities = {
      hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasGetUserMedia: !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia),
      hasImageCapture: 'ImageCapture' in window,
      hasWebRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection),
      hasWebAssembly: 'WebAssembly' in window,
      hasWorkers: 'Worker' in window,
      hasOffscreenCanvas: 'OffscreenCanvas' in window,
      supportsTorch: this.checkTorchSupport(),
      supportsConstraints: this.checkConstraintSupport(),
      supportsVideoTracks: this.checkVideoTrackSupport(),
      browserName,
      browserVersion,
      isMobile,
      isIOS,
      isAndroid,
      isChrome,
      isFirefox,
      isSafari,
      isEdge
    };

    return this.capabilities;
  }

  /**
   * Get compatibility fixes for current browser
   */
  static getCompatibilityFixes(): CompatibilityFixes {
    if (this.fixes) {
      return this.fixes;
    }

    const capabilities = this.detectCapabilities();

    this.fixes = {
      needsPolyfill: !capabilities.hasMediaDevices,
      requiresUserGesture: capabilities.isIOS || capabilities.isSafari,
      hasConstraintLimitations: capabilities.isIOS || capabilities.isSafari,
      needsVideoElementWorkaround: capabilities.isFirefox,
      supportsAdvancedConstraints: capabilities.isChrome || capabilities.isEdge,
      maxResolution: this.getMaxResolution(capabilities),
      recommendedFPS: this.getRecommendedFPS(capabilities)
    };

    return this.fixes;
  }

  /**
   * Check if torch/flashlight is supported
   */
  private static checkTorchSupport(): boolean {
    try {
      // Check if ImageCapture API supports torch
      if ('ImageCapture' in window) {
        return true;
      }
      
      // Check for experimental torch support
      const video = document.createElement('video');
      const track = video.captureStream?.()?.getVideoTracks?.()?.[0];
      
      if (track && 'getCapabilities' in track) {
        const capabilities = (track as any).getCapabilities();
        return 'torch' in capabilities;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check constraint support
   */
  private static checkConstraintSupport(): boolean {
    try {
      return !!(navigator.mediaDevices && 
               navigator.mediaDevices.getSupportedConstraints &&
               navigator.mediaDevices.getSupportedConstraints().facingMode);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check video track support
   */
  private static checkVideoTrackSupport(): boolean {
    try {
      const video = document.createElement('video');
      return !!(video.captureStream && 
               typeof video.captureStream === 'function');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get maximum supported resolution
   */
  private static getMaxResolution(capabilities: BrowserCapabilities): { width: number; height: number } {
    if (capabilities.isMobile) {
      if (capabilities.isIOS) {
        return { width: 1280, height: 720 }; // iOS limitations
      } else if (capabilities.isAndroid) {
        return { width: 1920, height: 1080 }; // Most Android devices
      }
      return { width: 1280, height: 720 }; // Conservative mobile default
    }
    
    // Desktop browsers
    if (capabilities.isChrome || capabilities.isEdge) {
      return { width: 1920, height: 1080 };
    } else if (capabilities.isFirefox) {
      return { width: 1920, height: 1080 };
    } else if (capabilities.isSafari) {
      return { width: 1280, height: 720 }; // Safari has some limitations
    }
    
    return { width: 1280, height: 720 }; // Conservative default
  }

  /**
   * Get recommended FPS for browser
   */
  private static getRecommendedFPS(capabilities: BrowserCapabilities): number {
    if (capabilities.isMobile) {
      return capabilities.isIOS ? 15 : 10; // iOS can handle slightly higher FPS
    }
    
    // Desktop browsers
    if (capabilities.isChrome || capabilities.isEdge) {
      return 30;
    } else if (capabilities.isFirefox) {
      return 25;
    } else if (capabilities.isSafari) {
      return 20;
    }
    
    return 15; // Conservative default
  }

  /**
   * Apply browser-specific polyfills
   */
  static applyPolyfills(): void {
    const capabilities = this.detectCapabilities();

    // getUserMedia polyfill
    if (!capabilities.hasMediaDevices && capabilities.hasGetUserMedia) {
      navigator.mediaDevices = navigator.mediaDevices || {};
      
      navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia || 
        function(constraints) {
          const getUserMedia = navigator.getUserMedia || 
                              (navigator as any).webkitGetUserMedia || 
                              (navigator as any).mozGetUserMedia;
          
          if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
          }
          
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
    }

    // Constraint polyfills for older browsers
    if (!navigator.mediaDevices?.getSupportedConstraints) {
      navigator.mediaDevices = navigator.mediaDevices || {};
      navigator.mediaDevices.getSupportedConstraints = () => ({
        width: true,
        height: true,
        aspectRatio: true,
        frameRate: true,
        facingMode: true,
        deviceId: true
      });
    }
  }

  /**
   * Get optimized scanner configuration for current browser
   */
  static getOptimizedScannerConfig(baseConfig?: any): any {
    const defaultConfig = {
      fps: 10,
      width: 640,
      height: 480,
      qrbox: { width: 250, height: 250 },
      videoConstraints: {}
    };
    
    return this.getOptimizedConfig(baseConfig || defaultConfig);
  }

  /**
   * Internal method to get optimized configuration
   */
  private static getOptimizedConfig(baseConfig: any): any {
    const capabilities = this.detectCapabilities();
    const fixes = this.getCompatibilityFixes();

    const optimizedConfig = { ...baseConfig };

    // Adjust FPS based on browser capabilities
    optimizedConfig.fps = Math.min(baseConfig.fps || 10, fixes.recommendedFPS);

    // Adjust resolution for mobile devices
    if (capabilities.isMobile) {
      const maxRes = fixes.maxResolution;
      optimizedConfig.width = Math.min(baseConfig.width || 640, maxRes.width);
      optimizedConfig.height = Math.min(baseConfig.height || 480, maxRes.height);
    }

    // Browser-specific adjustments
    if (capabilities.isIOS || capabilities.isSafari) {
      // iOS/Safari specific optimizations
      optimizedConfig.disableFlip = true;
      optimizedConfig.aspectRatio = 1.0; // Square aspect ratio works better
      
      // Reduce quality for better performance
      if (optimizedConfig.qrbox) {
        optimizedConfig.qrbox = {
          width: Math.min(optimizedConfig.qrbox.width, 200),
          height: Math.min(optimizedConfig.qrbox.height, 200)
        };
      }
    }

    if (capabilities.isFirefox) {
      // Firefox specific optimizations
      optimizedConfig.fps = Math.min(optimizedConfig.fps, 15);
      optimizedConfig.experimentalFeatures = {
        useBarCodeDetectorIfSupported: false // Firefox has issues with this
      };
    }

    if (capabilities.isAndroid) {
      // Android specific optimizations
      optimizedConfig.videoConstraints = {
        ...optimizedConfig.videoConstraints,
        facingMode: { ideal: 'environment' }, // Prefer back camera
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      };
    }

    return optimizedConfig;
  }

  /**
   * Check if current environment supports scanner
   */
  static isScannerSupported(): { supported: boolean; reason?: string } {
    const capabilities = this.detectCapabilities();

    if (!capabilities.hasMediaDevices && !capabilities.hasGetUserMedia) {
      return {
        supported: false,
        reason: 'Camera access is not supported in this browser'
      };
    }

    if (window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
      return {
        supported: false,
        reason: 'HTTPS is required for camera access'
      };
    }

    // Check for minimum browser versions
    const minVersions = {
      Chrome: 53,
      Firefox: 36,
      Safari: 11,
      Edge: 12
    };

    const browserVersion = parseInt(capabilities.browserVersion);
    const minVersion = minVersions[capabilities.browserName as keyof typeof minVersions];

    if (minVersion && browserVersion < minVersion) {
      return {
        supported: false,
        reason: `${capabilities.browserName} version ${minVersion} or higher is required`
      };
    }

    return { supported: true };
  }

  /**
   * Get fallback options for unsupported browsers
   */
  static getFallbackOptions(): string[] {
    const capabilities = this.detectCapabilities();
    const fallbacks: string[] = [];

    if (!capabilities.hasMediaDevices) {
      fallbacks.push('File upload for barcode images');
      fallbacks.push('Manual barcode entry');
    }

    if (capabilities.isMobile && !capabilities.hasImageCapture) {
      fallbacks.push('Use native camera app and upload image');
    }

    if (!capabilities.hasWebAssembly) {
      fallbacks.push('Reduced scanning performance (JavaScript fallback)');
    }

    return fallbacks;
  }

  /**
   * Log browser compatibility information (for development only)
   */
  static logCompatibilityInfo(): void {
    if (process.env.NODE_ENV === 'development') {
      const capabilities = this.detectCapabilities();
      const fixes = this.getCompatibilityFixes();
      const support = this.isScannerSupported();

      console.group('🔍 Scanner Browser Compatibility');
      console.log('Browser:', capabilities.browserName, capabilities.browserVersion);
      console.log('Platform:', capabilities.isMobile ? 'Mobile' : 'Desktop');
      console.log('Scanner Supported:', support.supported);
      
      if (!support.supported) {
        console.warn('Reason:', support.reason);
      }

      console.log('Capabilities:', {
        mediaDevices: capabilities.hasMediaDevices,
        torch: capabilities.supportsTorch,
        constraints: capabilities.supportsConstraints,
        webAssembly: capabilities.hasWebAssembly
      });

      console.log('Recommended Settings:', {
        maxFPS: fixes.recommendedFPS,
        maxResolution: fixes.maxResolution,
        needsPolyfill: fixes.needsPolyfill
      });

      if (fixes.needsPolyfill) {
        console.info('Applying compatibility polyfills...');
      }

      console.groupEnd();
    }
  }
}

// Auto-apply polyfills when module loads
BrowserCompatibility.applyPolyfills();

export default BrowserCompatibility;