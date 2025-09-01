'use client';

// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Mark the start of a performance measurement
  mark(name: string) {
    if (typeof window === 'undefined') return;
    this.marks.set(name, performance.now());
  }

  // Measure the time between mark and now
  measure(name: string, logResult = true): number | null {
    if (typeof window === 'undefined') return null;
    
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No mark found for: ${name}`);
      return null;
    }

    const duration = performance.now() - startTime;
    
    if (logResult && process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }

    this.marks.delete(name);
    return duration;
  }

  // Log Core Web Vitals
  logWebVitals() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      console.log(`🎨 ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
    });

    // Largest Contentful Paint
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log(`📏 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        console.log(`👆 FID: ${entry.processingStart - entry.startTime}ms`);
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }

  // Check if running on slow device
  isSlowDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }

    // Check device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory && deviceMemory < 4) {
      return true;
    }

    // Check connection speed
    const connection = (navigator as any).connection;
    if (connection) {
      const slowConnections = ['slow-2g', '2g', '3g'];
      if (slowConnections.includes(connection.effectiveType)) {
        return true;
      }
    }

    return false;
  }
}

// Export singleton instance
export const perfMonitor = PerformanceMonitor.getInstance();
