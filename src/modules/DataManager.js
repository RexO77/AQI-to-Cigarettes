// src/modules/DataManager.js - Advanced Data Management with Caching
import { EventBus } from '../core/EventBus.js';

export class DataManager {
  constructor() {
    this.cache = new Map();
    this.workers = new Map();
    this.offline = 'serviceWorker' in navigator;
    this.apiKey = '7f74765aaa2a9fb00ac8e6262e582771'; // Should be moved to config
    this.eventBus = new EventBus();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    console.log('🔧 Initializing DataManager...');

    // Load cached data from localStorage
    this.loadFromStorage();

    // Setup offline detection
    this.setupOfflineDetection();

    // Initialize service worker if available
    if (this.offline) {
      await this.registerServiceWorker();
    }

    console.log('✅ DataManager initialized');
  }

  async fetchWithFallback(urls, options = {}) {
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await this.cachedFetch(urls[i], options);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch from ${urls[i]}:`, error);
        if (i === urls.length - 1) {
          throw new Error('All data sources failed');
        }
      }
    }
  }

  async cachedFetch(url, options = {}) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    // Check if cached data is still valid
    if (cached && this.isCacheValid(cached, options.ttl || 300000)) { // 5 minutes default
      console.log(`📋 Using cached data for ${url}`);
      return Promise.resolve(cached.data);
    }

    // Fetch fresh data
    try {
      const response = await this.fetchWithRetry(url, options);
      const data = await response.json();

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        url,
        options
      });

      // Save to localStorage for persistence
      this.saveToStorage();

      console.log(`📥 Fresh data fetched for ${url}`);
      return data;

    } catch (error) {
      // Try to return stale cache if available
      if (cached && options.allowStale) {
        console.warn(`⚠️ Using stale cache for ${url}`);
        return cached.data;
      }
      throw error;
    }
  }

  async fetchWithRetry(url, options = {}, attempt = 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.warn(`Retry ${attempt}/${this.retryAttempts} for ${url}`);
        await this.delay(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  isCacheValid(cached, ttl) {
    return Date.now() - cached.timestamp < ttl;
  }

  // City data methods
  async fetchCityData(query) {
    const urls = [
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`,
      // Add fallback APIs here if needed
    ];

    const data = await this.fetchWithFallback(urls, { ttl: 3600000 }); // 1 hour cache

    if (!data || data.length === 0) {
      throw new Error('City not found');
    }

    return {
      name: data[0].name,
      country: data[0].country,
      state: data[0].state,
      lat: data[0].lat,
      lon: data[0].lon
    };
  }

  async fetchAQIData(lat, lon) {
    const urls = [
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`,
      // Add fallback APIs here if needed
    ];

    const data = await this.fetchWithFallback(urls, { ttl: 600000 }); // 10 minutes cache

    if (!data || !data.list || data.list.length === 0) {
      throw new Error('No AQI data available');
    }

    const components = data.list[0].components;
    return {
      pm25: components.pm2_5 || 0,
      pm10: components.pm10 || 0,
      no2: components.no2 || 0,
      so2: components.so2 || 0,
      o3: components.o3 || 0,
      co: components.co || 0,
      timestamp: data.list[0].dt * 1000, // Convert to milliseconds
      aqi: data.list[0].main.aqi
    };
  }

  async fetchWeatherData(lat, lon) {
    const urls = [
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`,
    ];

    const data = await this.fetchWithFallback(urls, { ttl: 1800000 }); // 30 minutes cache

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      description: data.weather[0].description,
      icon: data.weather[0].icon
    };
  }

  async fetchHistoricalAQIData(lat, lon, start, end) {
    // This would typically use a different API or endpoint
    // For now, return mock data or integrate with a historical API
    const mockData = [];
    const hours = Math.floor((end - start) / (1000 * 60 * 60));

    for (let i = 0; i < hours; i++) {
      mockData.push({
        timestamp: start + (i * 60 * 60 * 1000),
        aqi: Math.floor(Math.random() * 200) + 50,
        pm25: Math.random() * 100
      });
    }

    return mockData;
  }

  // Bulk operations
  async fetchMultipleCities(cities) {
    const promises = cities.map(city => this.fetchCityData(city));
    return Promise.allSettled(promises);
  }

  async prefetchNearbyCities(lat, lon, radius = 100) {
    // Prefetch data for nearby cities to improve UX
    try {
      // This would require a reverse geocoding API
      // For now, just prefetch current location weather
      await this.fetchWeatherData(lat, lon);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }

  // Cache management
  clearCache(pattern = null) {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    this.saveToStorage();
  }

  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null
    };

    let oldest = Date.now();
    let newest = 0;

    for (const [key, entry] of this.cache) {
      const size = JSON.stringify(entry).length;
      stats.totalSize += size;

      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
        stats.oldestEntry = new Date(entry.timestamp);
      }

      if (entry.timestamp > newest) {
        newest = entry.timestamp;
        stats.newestEntry = new Date(entry.timestamp);
      }
    }

    return stats;
  }

  // Storage persistence
  loadFromStorage() {
    try {
      const cached = localStorage.getItem('aqi_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only load entries that aren't too old (24 hours max)
        const maxAge = 24 * 60 * 60 * 1000;
        const now = Date.now();

        for (const [key, entry] of Object.entries(parsed)) {
          if (now - entry.timestamp < maxAge) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  saveToStorage() {
    try {
      const cacheObject = {};
      for (const [key, value] of this.cache) {
        cacheObject[key] = value;
      }
      localStorage.setItem('aqi_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  // Offline detection
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.eventBus.emit('networkStatusChange', { online: true });
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline');
      this.eventBus.emit('networkStatusChange', { online: false });
    });
  }

  isOnline() {
    return navigator.onLine;
  }

  // Service Worker registration
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('📋 Service Worker registered:', registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.eventBus.emit('serviceWorkerUpdate', { registration });
          }
        });
      });

    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  destroy() {
    this.cache.clear();
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
  }
}


