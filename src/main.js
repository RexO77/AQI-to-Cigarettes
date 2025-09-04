// src/main.js - Application Bootstrap (Optimized)
import { AQIApp } from './App.js';
import { StateManager, DataManager, lazyImports, getSystemTheme, perfMonitor } from './bundle.js';

// Global application instance
let app = null;

// Application configuration - optimized for performance
const config = {
  debug: false,
  enablePerformanceMonitoring: false, // Disable for faster startup
  enableVoiceInterface: false, // Lazy load later
  enableOfflineMode: 'serviceWorker' in navigator,
  theme: getSystemTheme()
};

class AppBootstrap {
  constructor() {
    this.loadingScreen = document.getElementById('loading-screen');
    this.errorBoundary = document.getElementById('error-boundary');
    this.performanceMonitor = document.getElementById('performance-monitor');
    this.startTime = performance.now();
  }

  async initialize() {
    try {
      console.log('🚀 Starting AQI Application Bootstrap...');

      // Minimal loading screen
      this.showMinimalLoading();

      // Critical path only - initialize app immediately
      app = new AQIApp();

      // Setup essential features only
      this.setupEssentialFeatures();

      // Lazy load non-critical features
      this.lazyLoadFeatures();

      // Hide loading screen quickly
      this.hideLoadingScreen();

      console.log(`✅ AQI Application initialized in ${performance.now() - this.startTime}ms`);

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      this.showError(error);
    }
  }

  showMinimalLoading() {
    if (this.loadingScreen) {
      // Simple loading without heavy animations
      this.loadingScreen.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner" style="width: 32px; height: 32px; border: 2px solid #007BFF; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
          <p style="color: var(--text-secondary); font-size: 14px;">Loading...</p>
        </div>
      `;
      this.loadingScreen.style.display = 'flex';
    }
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      // Immediate hide for better perceived performance
      this.loadingScreen.style.display = 'none';
    }
  }

  showError(error) {
    this.hideLoadingScreen();

    if (this.errorBoundary) {
      const errorMessage = this.errorBoundary.querySelector('p');
      if (errorMessage) {
        errorMessage.textContent = `Error: ${error.message || 'Unknown error occurred'}`;
      }
      this.errorBoundary.style.display = 'flex';
    }
  }

  setupEssentialFeatures() {
    // Only setup critical features immediately
    this.setupThemeToggle();
    this.setupBasicKeyboardShortcuts();

    // Register service worker immediately (non-blocking)
    if (config.enableOfflineMode) {
      this.registerServiceWorker();
    }
  }

  setupThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        if (app) app.toggleTheme();
      });
    }
  }

  setupBasicKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only essential shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('#cityInput');
        if (searchInput) searchInput.focus();
      }
    });
  }

  registerServiceWorker() {
    // Non-blocking service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch(() => console.log('SW registration failed'));
    }
  }

  lazyLoadFeatures() {
    // Lazy load non-critical features after initial render
    setTimeout(() => {
      this.setupAccessibility();
      this.setupAdvancedFeatures();
    }, 100);
  }

  setupAccessibility() {
    // Basic accessibility setup
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduced-motion');
    }

    // Focus management
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('button, input, select, textarea, [tabindex]')) {
        document.documentElement.classList.add('keyboard-navigation');
      }
    });
  }

  setupAdvancedFeatures() {
    // Lazy load advanced features
    this.setupNetworkStatus();
    this.setupPWAInstall();
  }

  setupNetworkStatus() {
    window.addEventListener('online', () => {
      this.showNetworkStatus('Back online', 'success');
    });

    window.addEventListener('offline', () => {
      this.showNetworkStatus('You are offline', 'warning');
    });
  }

  setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.showInstallPrompt();
    });
  }

  showInstallPrompt() {
    // Create install prompt
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-content">
        <i class="fas fa-download"></i>
        <div>
          <h3>Install AQI Calculator</h3>
          <p>Add to your home screen for quick access</p>
        </div>
        <button class="install-btn">Install</button>
        <button class="dismiss-btn">&times;</button>
      </div>
    `;

    prompt.querySelector('.install-btn').addEventListener('click', () => {
      // Handle install
      this.hideInstallPrompt();
    });

    prompt.querySelector('.dismiss-btn').addEventListener('click', () => {
      this.hideInstallPrompt();
    });

    document.body.appendChild(prompt);
  }

  hideInstallPrompt() {
    const prompt = document.querySelector('.install-prompt');
    if (prompt) {
      prompt.remove();
    }
  }

  initializePerformanceMonitoring() {
    if (!config.enablePerformanceMonitoring) return;

    // Monitor Core Web Vitals
    if ('web-vitals' in window) {
      import('https://unpkg.com/web-vitals@3/dist/web-vitals.es5.min.js').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }

    // Custom performance monitoring
    const perfMonitor = {
      startTime: performance.now(),
      marks: new Map(),

      mark(name) {
        this.marks.set(name, performance.now());
      },

      measure(name, startMark, endMark = performance.now()) {
        const start = this.marks.get(startMark) || this.startTime;
        const duration = endMark - start;
        console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);

        if (this.performanceMonitor) {
          this.updatePerformanceDisplay(name, duration);
        }
      }
    };

    // Make performance monitor globally available for debugging
    window.perfMonitor = perfMonitor;

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        console.log(`Memory: ${Math.round(memInfo.usedJSHeapSize / 1048576)}MB used`);
      }, 10000);
    }
  }

  updatePerformanceDisplay(name, duration) {
    if (!this.performanceMonitor) return;

    this.performanceMonitor.innerHTML = `
      <div class="perf-item">
        <span class="perf-label">${name}:</span>
        <span class="perf-value">${duration.toFixed(2)}ms</span>
      </div>
    `;
  }

  showNetworkStatus(message, type) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `network-toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  closeAllOverlays() {
    // Close autocomplete dropdowns
    const dropdowns = document.querySelectorAll('.autocomplete-list');
    dropdowns.forEach(dropdown => {
      dropdown.style.display = 'none';
    });

    // Close tooltips
    const tooltips = document.querySelectorAll('.canvas-tooltip');
    tooltips.forEach(tooltip => {
      tooltip.style.display = 'none';
    });
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Optimized initialization
const bootstrap = new AppBootstrap();

// Initialize immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap.initialize());
} else {
  bootstrap.initialize();
}

// Export for debugging
window.AQIApp = app;
window.AppConfig = config;
