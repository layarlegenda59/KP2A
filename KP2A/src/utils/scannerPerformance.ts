/**
 * Performance Optimization Utilities for Scanner System
 * Provides performance monitoring, optimization strategies, and adaptive configurations
 */

export interface PerformanceMetrics {
  scanDuration: number;
  processingTime: number;
  cameraInitTime: number;
  decodeAttempts: number;
  successRate: number;
  averageLatency: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface AdaptiveConfig {
  fps: number;
  qrboxSize: { width: number; height: number };
  videoConstraints: MediaTrackConstraints;
  processingInterval: number;
  retryDelay: number;
}

export class ScannerPerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 100;
  private static performanceObserver?: PerformanceObserver;

  /**
   * Start performance monitoring
   */
  static startMonitoring(): void {
    // Monitor performance entries
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('scanner')) {
            this.recordPerformanceEntry(entry);
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });
    }

    // Monitor memory usage if available
    this.startMemoryMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  static stopMonitoring(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
  }

  /**
   * Record a scan performance metric
   */
  static recordScanMetric(metric: PerformanceMetrics): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    } as any);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    // Log performance issues
    this.detectPerformanceIssues(metric);
  }

  /**
   * Get current performance statistics
   */
  static getPerformanceStats(): {
    averageScanDuration: number;
    averageProcessingTime: number;
    successRate: number;
    totalScans: number;
    performanceGrade: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    if (this.metrics.length === 0) {
      return {
        averageScanDuration: 0,
        averageProcessingTime: 0,
        successRate: 0,
        totalScans: 0,
        performanceGrade: 'excellent'
      };
    }

    const totalScans = this.metrics.length;
    const averageScanDuration = this.metrics.reduce((sum, m) => sum + m.scanDuration, 0) / totalScans;
    const averageProcessingTime = this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / totalScans;
    const successRate = this.metrics.reduce((sum, m) => sum + m.successRate, 0) / totalScans;

    let performanceGrade: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (averageScanDuration > 3000 || successRate < 0.8) {
      performanceGrade = 'poor';
    } else if (averageScanDuration > 2000 || successRate < 0.9) {
      performanceGrade = 'fair';
    } else if (averageScanDuration > 1000 || successRate < 0.95) {
      performanceGrade = 'good';
    }

    return {
      averageScanDuration,
      averageProcessingTime,
      successRate,
      totalScans,
      performanceGrade
    };
  }

  /**
   * Detect performance issues and suggest optimizations
   */
  private static detectPerformanceIssues(metric: PerformanceMetrics): void {
    const issues: string[] = [];

    if (metric.scanDuration > 5000) {
      issues.push('Slow scan duration detected');
    }

    if (metric.processingTime > 1000) {
      issues.push('High processing time detected');
    }

    if (metric.decodeAttempts > 10) {
      issues.push('Multiple decode attempts required');
    }

    if (metric.successRate < 0.8) {
      issues.push('Low success rate detected');
    }

    if (issues.length > 0) {
      console.warn('Scanner performance issues detected:', issues);
      this.suggestOptimizations(metric);
    }
  }

  /**
   * Suggest optimizations based on performance metrics
   */
  private static suggestOptimizations(metric: PerformanceMetrics): void {
    const suggestions: string[] = [];

    if (metric.scanDuration > 3000) {
      suggestions.push('Consider reducing FPS or QR box size');
    }

    if (metric.processingTime > 500) {
      suggestions.push('Consider using web workers for processing');
    }

    if (metric.decodeAttempts > 5) {
      suggestions.push('Improve lighting or camera positioning');
    }

    console.info('Performance optimization suggestions:', suggestions);
  }

  /**
   * Record performance entry from PerformanceObserver
   */
  private static recordPerformanceEntry(entry: PerformanceEntry): void {
    // Process performance entries related to scanner operations
    if (entry.entryType === 'measure') {
      console.debug('Scanner performance measure:', {
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime
      });
    }
  }

  /**
   * Start monitoring memory usage
   */
  private static startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          const memoryUsage = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          };

          // Warn if memory usage is high
          const usagePercent = (memoryUsage.used / memoryUsage.limit) * 100;
          if (usagePercent > 80) {
            console.warn('High memory usage detected:', usagePercent.toFixed(2) + '%');
          }
        }
      }, 10000); // Check every 10 seconds
    }
  }
}

export class ScannerOptimizer {
  private static deviceCapabilities?: MediaTrackCapabilities;
  private static currentConfig?: AdaptiveConfig;

  /**
   * Get optimal configuration based on device capabilities
   */
  static async getOptimalConfig(): Promise<AdaptiveConfig> {
    if (this.currentConfig) {
      return this.currentConfig;
    }

    const capabilities = await this.getDeviceCapabilities();
    const deviceType = this.detectDeviceType();
    const networkSpeed = await this.detectNetworkSpeed();

    let config: AdaptiveConfig = {
      fps: 10,
      qrboxSize: { width: 250, height: 250 },
      videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      processingInterval: 100,
      retryDelay: 1000
    };

    // Optimize based on device type
    if (deviceType === 'mobile') {
      config = this.optimizeForMobile(config, capabilities);
    } else if (deviceType === 'tablet') {
      config = this.optimizeForTablet(config, capabilities);
    } else {
      config = this.optimizeForDesktop(config, capabilities);
    }

    // Optimize based on network speed
    if (networkSpeed === 'slow') {
      config = this.optimizeForSlowNetwork(config);
    }

    this.currentConfig = config;
    return config;
  }

  /**
   * Get device camera capabilities
   */
  private static async getDeviceCapabilities(): Promise<MediaTrackCapabilities | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      // Stop the stream
      stream.getTracks().forEach(t => t.stop());
      
      this.deviceCapabilities = capabilities;
      return capabilities;
    } catch (error) {
      console.warn('Could not get device capabilities:', error);
      return null;
    }
  }

  /**
   * Detect device type for optimization
   */
  private static detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);

    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';
    return 'desktop';
  }

  /**
   * Detect network speed for optimization
   */
  private static async detectNetworkSpeed(): Promise<'fast' | 'medium' | 'slow'> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === '4g') return 'fast';
      if (effectiveType === '3g') return 'medium';
      return 'slow';
    }

    // Fallback: simple speed test
    try {
      const startTime = Date.now();
      await fetch('/favicon.ico', { cache: 'no-cache' });
      const duration = Date.now() - startTime;
      
      if (duration < 100) return 'fast';
      if (duration < 300) return 'medium';
      return 'slow';
    } catch (error) {
      return 'medium'; // Default assumption
    }
  }

  /**
   * Optimize configuration for mobile devices
   */
  private static optimizeForMobile(config: AdaptiveConfig, capabilities: MediaTrackCapabilities | null): AdaptiveConfig {
    return {
      ...config,
      fps: 8, // Lower FPS for battery life
      qrboxSize: { width: 200, height: 200 }, // Smaller QR box
      videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 720 },
        height: { ideal: 480 }
      },
      processingInterval: 150,
      retryDelay: 1500
    };
  }

  /**
   * Optimize configuration for tablet devices
   */
  private static optimizeForTablet(config: AdaptiveConfig, capabilities: MediaTrackCapabilities | null): AdaptiveConfig {
    return {
      ...config,
      fps: 10,
      qrboxSize: { width: 300, height: 300 },
      videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1024 },
        height: { ideal: 768 }
      },
      processingInterval: 120,
      retryDelay: 1200
    };
  }

  /**
   * Optimize configuration for desktop devices
   */
  private static optimizeForDesktop(config: AdaptiveConfig, capabilities: MediaTrackCapabilities | null): AdaptiveConfig {
    return {
      ...config,
      fps: 15, // Higher FPS for better performance
      qrboxSize: { width: 350, height: 350 },
      videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      processingInterval: 80,
      retryDelay: 800
    };
  }

  /**
   * Optimize configuration for slow networks
   */
  private static optimizeForSlowNetwork(config: AdaptiveConfig): AdaptiveConfig {
    return {
      ...config,
      fps: Math.max(5, config.fps - 3), // Reduce FPS
      videoConstraints: {
        ...config.videoConstraints,
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      processingInterval: config.processingInterval + 50,
      retryDelay: config.retryDelay + 500
    };
  }

  /**
   * Adapt configuration based on real-time performance
   */
  static adaptConfigBasedOnPerformance(currentMetrics: PerformanceMetrics): AdaptiveConfig | null {
    if (!this.currentConfig) return null;

    let newConfig = { ...this.currentConfig };
    let configChanged = false;

    // If scan duration is too high, reduce quality
    if (currentMetrics.scanDuration > 3000) {
      newConfig.fps = Math.max(5, newConfig.fps - 2);
      newConfig.qrboxSize = {
        width: Math.max(150, newConfig.qrboxSize.width - 50),
        height: Math.max(150, newConfig.qrboxSize.height - 50)
      };
      configChanged = true;
    }

    // If success rate is low, increase quality
    if (currentMetrics.successRate < 0.8 && newConfig.fps < 15) {
      newConfig.fps = Math.min(15, newConfig.fps + 1);
      newConfig.qrboxSize = {
        width: Math.min(400, newConfig.qrboxSize.width + 25),
        height: Math.min(400, newConfig.qrboxSize.height + 25)
      };
      configChanged = true;
    }

    if (configChanged) {
      this.currentConfig = newConfig;
      console.info('Scanner configuration adapted based on performance:', newConfig);
      return newConfig;
    }

    return null;
  }

  /**
   * Reset configuration to optimal defaults
   */
  static resetToOptimalConfig(): void {
    this.currentConfig = undefined;
  }
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memory cleanup utility
 */
export class MemoryManager {
  private static cleanupTasks: (() => void)[] = [];
  private static resources: Map<string, any> = new Map();

  /**
   * Register a cleanup task
   */
  static registerCleanup(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Add a resource to track
   */
  static addResource(id: string, resource: any): void {
    this.resources.set(id, resource);
  }

  /**
   * Remove and cleanup a resource
   */
  static removeResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource && typeof resource.cleanup === 'function') {
      resource.cleanup();
    }
    this.resources.delete(id);
  }

  /**
   * Get the number of tracked resources
   */
  static getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Execute all cleanup tasks
   */
  static cleanup(): void {
    // Cleanup all tracked resources
    this.resources.forEach((resource, id) => {
      if (typeof resource.cleanup === 'function') {
        try {
          resource.cleanup();
        } catch (error) {
          console.warn(`Failed to cleanup resource ${id}:`, error);
        }
      }
    });
    this.resources.clear();

    // Execute registered cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
  }

  /**
   * Force garbage collection if available
   */
  static forceGC(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
}