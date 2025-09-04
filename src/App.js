// src/App.js - Main Application Class (Optimized)
import { StateManager, DataManager, lazyImports, getSystemTheme } from './bundle.js';

export class AQIApp {
  constructor() {
    this.state = new StateManager({
      currentCity: null,
      currentAQI: null,
      currentPM25: null,
      searchHistory: [],
      theme: getSystemTheme(),
      loading: false,
      error: null
    });

    // Initialize only essential services
    this.dataManager = new DataManager();
    this.components = new Map();
    this.lazyComponents = new Map();

    this.init();
  }

  async init() {
    console.log('🚀 Initializing AQI Application (Optimized)...');

    // Only essential setup
    this.setupEssentialEventListeners();
    this.registerEssentialComponents();
    await this.loadEssentialData();

    // Lazy load everything else
    this.lazyLoadHeavyComponents();

    console.log('✅ AQI Application initialized successfully');
  }

  setupEssentialEventListeners() {
    // Basic state change handling
    this.state.onChange((changes) => {
      this.updateComponents(changes);
    });

    // Basic error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error);
    });
  }

  registerEssentialComponents() {
    // Only register search component initially
    this.lazyLoadComponent('search', '.search-container');
  }

  async lazyLoadComponent(name, selector) {
    try {
      const componentName = name.charAt(0).toUpperCase() + name.slice(1) + 'Component';
      const module = await lazyImports[componentName]();
      const ComponentClass = module[componentName];

      const element = document.querySelector(selector);
      if (element) {
        const component = new ComponentClass(element, { app: this });
        this.components.set(name, component);
      }
    } catch (error) {
      console.warn(`Failed to lazy load ${name} component:`, error);
    }
  }

  async loadEssentialData() {
    try {
      // Load only essential data
      const history = localStorage.getItem('aqi_search_history');
      if (history) {
        this.state.setState({ searchHistory: JSON.parse(history) });
      }

      // Load theme preference
      const preferences = localStorage.getItem('aqi_preferences');
      if (preferences) {
        const prefs = JSON.parse(preferences);
        this.state.setState({ theme: prefs.theme || this.getSystemTheme() });
      }

    } catch (error) {
      console.warn('Error loading essential data:', error);
    }
  }

  lazyLoadHeavyComponents() {
    // Load other components after initial render
    setTimeout(async () => {
      await this.lazyLoadComponent('results', '.results-container');
      await this.lazyLoadComponent('visualization', '.visualization-container');

      // Initialize DataManager and other services
      await this.dataManager.initialize();

      // Setup advanced features
      this.setupAdvancedFeatures();
    }, 100);
  }

  async setupAdvancedFeatures() {
    // Load EventBus and calculator
    try {
      const [{ EventBus }, { AQICalculator }] = await Promise.all([
        lazyImports.EventBus(),
        lazyImports.AQICalculator()
      ]);

      this.eventBus = new EventBus();
      this.calculator = new AQICalculator();

      // Setup advanced event handling
      this.setupAdvancedEventListeners();

      // Setup workers if needed
      this.setupWorkers();

    } catch (error) {
      console.warn('Error setting up advanced features:', error);
    }
  }

  setupAdvancedEventListeners() {
    if (!this.eventBus) return;

    this.state.onChange((changes) => {
      this.eventBus.emit('stateChange', changes);
    });
  }

  setupWorkers() {
    // Initialize Web Workers for heavy calculations (lazy)
    if (window.Worker) {
      try {
        const calculatorWorker = new Worker('./src/workers/aqi-calculator-worker.js');
        this.workers = this.workers || new Map();
        this.workers.set('calculator', calculatorWorker);

        calculatorWorker.onmessage = (e) => {
          this.handleWorkerMessage('calculator', e.data);
        };
      } catch (error) {
        console.warn('Web Workers not supported, falling back to main thread calculations');
      }
    }
  }

  async searchCity(query) {
    this.state.setState({ loading: true, error: null });

    try {
      const cityData = await this.dataManager.fetchCityData(query);
      const aqiData = await this.dataManager.fetchAQIData(cityData.lat, cityData.lon);

      // Use calculator if available, otherwise lazy load it
      let aqiValue, cigarettesValue;
      if (this.calculator) {
        aqiValue = this.calculator.calculateAQIFromPM25(aqiData.pm25);
        cigarettesValue = this.calculator.calculateCigarettes(aqiValue);
      } else {
        // Lazy load calculator
        const { AQICalculator } = await lazyImports.AQICalculator();
        this.calculator = new AQICalculator();
        aqiValue = this.calculator.calculateAQIFromPM25(aqiData.pm25);
        cigarettesValue = this.calculator.calculateCigarettes(aqiValue);
      }

      const newState = {
        currentCity: cityData,
        currentAQI: aqiValue,
        currentPM25: aqiData.pm25,
        cigarettesEquivalent: cigarettesValue,
        loading: false
      };

      this.state.setState(newState);

      // Update search history
      this.updateSearchHistory(cityData);

    } catch (error) {
      this.state.setState({
        error: error.message,
        loading: false
      });
      console.error('Search failed:', error);
    }
  }

  async calculateWithWorker(aqiData) {
    return new Promise((resolve, reject) => {
      const worker = this.workers.get('calculator');

      const handleMessage = (e) => {
        worker.removeEventListener('message', handleMessage);
        resolve(e.data);
      };

      const handleError = (error) => {
        worker.removeEventListener('message', handleMessage);
        reject(error);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage({
        type: 'calculate',
        data: aqiData
      });
    });
  }

  updateSearchHistory(cityData) {
    const history = this.state.getState().searchHistory || [];
    const existingIndex = history.findIndex(item =>
      item.name === cityData.name && item.country === cityData.country
    );

    if (existingIndex > -1) {
      history.splice(existingIndex, 1);
    }

    history.unshift({
      ...cityData,
      timestamp: Date.now()
    });

    // Keep only last 10 searches
    const trimmedHistory = history.slice(0, 10);

    this.state.setState({ searchHistory: trimmedHistory });
    localStorage.setItem('aqi_search_history', JSON.stringify(trimmedHistory));
  }

  handleWorkerMessage(workerType, data) {
    switch (workerType) {
      case 'calculator':
        // Handle calculation results
        if (data.type === 'calculationComplete') {
          this.state.setState({
            currentAQI: data.aqi,
            cigarettesEquivalent: data.cigarettes
          });
        }
        break;
    }
  }

  updateComponents(changes) {
    // Notify components of state changes
    this.components.forEach(component => {
      if (component.shouldUpdate && component.shouldUpdate(changes)) {
        component.update(changes);
      }
    });
  }

  handleError(error) {
    this.state.setState({
      error: error.message || 'An unexpected error occurred',
      loading: false
    });
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  toggleTheme() {
    const currentTheme = this.state.getState().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    this.state.setState({ theme: newTheme });

    // Save preference
    const preferences = JSON.parse(localStorage.getItem('aqi_preferences') || '{}');
    preferences.theme = newTheme;
    localStorage.setItem('aqi_preferences', JSON.stringify(preferences));
  }

  destroy() {
    // Cleanup workers
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();

    // Cleanup components
    this.components.forEach(component => {
      if (component.destroy) component.destroy();
    });
    this.components.clear();

    // Cleanup event listeners
    this.eventBus.clear();
  }
}
