// src/bundle.js - Essential modules bundle for faster loading
// This combines critical modules to reduce HTTP requests

// Core utilities and StateManager (essential)
export { StateManager } from './core/StateManager.js';
export { DataManager } from './modules/DataManager.js';

// Lazy imports for heavy components (non-blocking)
export const lazyImports = {
  EventBus: () => import('./core/EventBus.js'),
  AQICalculator: () => import('./modules/AQICalculator.js'),
  SmartSearch: () => import('./modules/SmartSearch.js'),
  CanvasRenderer: () => import('./modules/CanvasRenderer.js'),
  SearchComponent: () => import('./components/SearchComponent.js'),
  ResultsComponent: () => import('./components/ResultsComponent.js'),
  VisualizationComponent: () => import('./components/VisualizationComponent.js')
};

// Preload critical resources
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Theme detection utility
export const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Simple debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Performance monitoring (lightweight)
export const perfMonitor = {
  startTime: performance.now(),
  marks: new Map(),

  mark(name) {
    this.marks.set(name, performance.now());
  },

  measure(name) {
    const duration = performance.now() - this.startTime;
    console.log(`🚀 ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }
};

