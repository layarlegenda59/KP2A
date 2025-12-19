/**
 * Font Loading Utility
 * Handles Google Fonts loading with fallback mechanisms
 */

export interface FontLoadingOptions {
  fontFamily: string;
  timeout?: number;
  fallbackFonts?: string[];
}

export class FontLoader {
  private static loadedFonts = new Set<string>();
  private static failedFonts = new Set<string>();

  /**
   * Load a font with timeout and fallback handling
   */
  static async loadFont(options: FontLoadingOptions): Promise<boolean> {
    const { fontFamily, timeout = 3000, fallbackFonts = [] } = options;

    // Check if already loaded or failed
    if (this.loadedFonts.has(fontFamily)) {
      return true;
    }
    if (this.failedFonts.has(fontFamily)) {
      return false;
    }

    try {
      // Use Font Loading API if available
      if ('fonts' in document) {
        const font = new FontFace(fontFamily, `url(https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap)`);
        
        // Set timeout for font loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Font loading timeout')), timeout);
        });

        await Promise.race([font.load(), timeoutPromise]);
        document.fonts.add(font);
        
        this.loadedFonts.add(fontFamily);
        console.log(`✅ Font loaded successfully: ${fontFamily}`);
        return true;
      } else {
        // Fallback for browsers without Font Loading API
        return await this.loadFontFallback(fontFamily, timeout);
      }
    } catch (error) {
      console.warn(`❌ Failed to load font: ${fontFamily}`, error);
      this.failedFonts.add(fontFamily);
      
      // Apply fallback fonts
      this.applyFallbackFonts(fallbackFonts);
      return false;
    }
  }

  /**
   * Fallback font loading method for older browsers
   */
  private static async loadFontFallback(fontFamily: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const testSize = '72px';
      const fallbackFont = 'monospace';

      // Create test elements
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.visibility = 'hidden';

      const fallbackElement = document.createElement('span');
      fallbackElement.style.fontFamily = fallbackFont;
      fallbackElement.style.fontSize = testSize;
      fallbackElement.textContent = testString;

      const testElement = document.createElement('span');
      testElement.style.fontFamily = `${fontFamily}, ${fallbackFont}`;
      testElement.style.fontSize = testSize;
      testElement.textContent = testString;

      container.appendChild(fallbackElement);
      container.appendChild(testElement);
      document.body.appendChild(container);

      // Get initial dimensions
      const fallbackWidth = fallbackElement.offsetWidth;
      const fallbackHeight = fallbackElement.offsetHeight;

      let attempts = 0;
      const maxAttempts = timeout / 100;

      const checkFont = () => {
        attempts++;
        const testWidth = testElement.offsetWidth;
        const testHeight = testElement.offsetHeight;

        // Font loaded if dimensions changed
        if (testWidth !== fallbackWidth || testHeight !== fallbackHeight) {
          document.body.removeChild(container);
          this.loadedFonts.add(fontFamily);
          resolve(true);
          return;
        }

        // Timeout reached
        if (attempts >= maxAttempts) {
          document.body.removeChild(container);
          this.failedFonts.add(fontFamily);
          resolve(false);
          return;
        }

        // Continue checking
        setTimeout(checkFont, 100);
      };

      checkFont();
    });
  }

  /**
   * Apply fallback fonts to the document
   */
  private static applyFallbackFonts(fallbackFonts: string[]) {
    if (fallbackFonts.length === 0) return;

    const style = document.createElement('style');
    style.textContent = `
      * {
        font-family: ${fallbackFonts.join(', ')}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Initialize font loading for the application
   */
  static async initializeFonts(): Promise<void> {
    try {
      await this.loadFont({
        fontFamily: 'Inter',
        timeout: 5000,
        fallbackFonts: ['Inter-Fallback', 'system-ui']
      });
    } catch (error) {
      console.warn('Font initialization failed:', error);
    }
  }

  /**
   * Check if a font is loaded
   */
  static isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily);
  }

  /**
   * Check if a font failed to load
   */
  static isFontFailed(fontFamily: string): boolean {
    return this.failedFonts.has(fontFamily);
  }
}

// Auto-initialize fonts when module is imported
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    FontLoader.initializeFonts();
  });
}