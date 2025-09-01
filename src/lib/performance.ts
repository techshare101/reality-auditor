// Performance configuration
export const performanceConfig = {
  // Reduce animation duration for faster perceived performance
  animationDuration: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5
  },
  
  // Lazy loading configuration
  lazyLoadDelay: 100,
  
  // Debounce timings
  debounce: {
    search: 300,
    resize: 150,
    scroll: 100
  },
  
  // Cache configuration
  cache: {
    ttl: 3600000, // 1 hour
    maxItems: 50
  }
};

// Utility to reduce motion for performance
export function reduceMotion() {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
