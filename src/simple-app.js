// Simple, working AQI application - no over-engineering
class SimpleAQIApp {
  constructor() {
    this.apiKey = '7f74765aaa2a9fb00ac8e6262e582771';
    this.currentTheme = this.getSystemTheme();
    this.aqiBreakpoints = [
      { min: 0.0, max: 12.0, aqiMin: 0, aqiMax: 50 },
      { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100 },
      { min: 35.5, max: 55.4, aqiMin: 101, aqiMax: 150 },
      { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200 },
      { min: 150.5, max: 250.4, aqiMin: 201, aqiMax: 300 },
      { min: 250.5, max: 350.4, aqiMin: 301, aqiMax: 400 },
      { min: 350.5, max: 500.4, aqiMin: 401, aqiMax: 500 }
    ];
    this.init();
  }

  init() {
    this.setupTheme();
    this.setupSearch();
    this.setupLocationButton();
    this.setupThemeToggle();
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  setupThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
      });
    }
  }

  setupSearch() {
    const searchInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput && searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSearch();
      });

      // Simple autocomplete
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (e.target.value.length > 2) {
            this.showSuggestions(e.target.value);
          } else {
            this.hideSuggestions();
          }
        }, 300);
      });
    }
  }

  setupLocationButton() {
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
      locationBtn.addEventListener('click', () => this.getCurrentLocation());
    }
  }

  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError('Geolocation not supported');
      return;
    }

    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
      locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      locationBtn.disabled = true;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      const cityData = await this.reverseGeocode(latitude, longitude);
      
      const searchInput = document.getElementById('cityInput');
      if (searchInput) {
        searchInput.value = cityData.name;
      }
      
      await this.searchByCoordinates(latitude, longitude, cityData.name);
      
    } catch (error) {
      console.error('Location error:', error);
      this.showError('Unable to get your location');
    } finally {
      if (locationBtn) {
        locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        locationBtn.disabled = false;
      }
    }
  }

  async reverseGeocode(lat, lon) {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
    );
    
    if (!response.ok) throw new Error('Reverse geocoding failed');
    
    const data = await response.json();
    if (data.length === 0) throw new Error('No location found');
    
    return {
      name: data[0].name,
      country: data[0].country,
      state: data[0].state
    };
  }

  async showSuggestions(query) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`
      );
      
      if (!response.ok) return;
      
      const cities = await response.json();
      const autocompleteList = document.getElementById('autocomplete-list');
      
      if (!autocompleteList || cities.length === 0) {
        this.hideSuggestions();
        return;
      }

      autocompleteList.innerHTML = cities
        .map(city => `
          <div class="autocomplete-item" data-name="${city.name}" data-lat="${city.lat}" data-lon="${city.lon}">
            <div class="city-name">${city.name}</div>
            <div class="city-country">${city.state ? city.state + ', ' : ''}${city.country}</div>
          </div>
        `)
        .join('');

      autocompleteList.style.display = 'block';

      // Add click handlers
      autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          const cityName = item.dataset.name;
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          
          document.getElementById('cityInput').value = cityName;
          this.hideSuggestions();
          this.searchByCoordinates(lat, lon, cityName);
        });
      });
      
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  }

  hideSuggestions() {
    const autocompleteList = document.getElementById('autocomplete-list');
    if (autocompleteList) {
      autocompleteList.style.display = 'none';
    }
  }

  async handleSearch() {
    const searchInput = document.getElementById('cityInput');
    const query = searchInput?.value.trim();
    
    if (!query) return;

    try {
      // Get coordinates for the city
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${this.apiKey}`
      );
      
      if (!response.ok) throw new Error('City not found');
      
      const cities = await response.json();
      if (cities.length === 0) throw new Error('City not found');
      
      const city = cities[0];
      await this.searchByCoordinates(city.lat, city.lon, city.name);
      
    } catch (error) {
      this.showError(error.message);
    }
  }

  async searchByCoordinates(lat, lon, cityName) {
    this.showLoading(true);
    
    try {
      // Get AQI data
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch air quality data');
      
      const data = await response.json();
      const openWeatherAQI = data.list[0].main.aqi;
      const pm25 = data.list[0].components.pm2_5;
      
      // Calculate proper US EPA AQI from PM2.5
      const usEpaAQI = this.calculateAQIFromPM25(pm25);
      
      // Calculate cigarette equivalent using Berkeley Earth research
      // 22 μg/m³ PM2.5 = 1 cigarette per day
      const cigarettes = Math.max(0, Math.round(pm25 / 22));
      
      this.displayResults({
        cityName,
        aqi: usEpaAQI,
        openWeatherAQI,
        pm25,
        cigarettes,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  displayResults(data) {
    // Hide autocomplete first to prevent layering issues
    this.hideSuggestions();
    
    // Hide placeholder
    const placeholder = document.getElementById('results-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    
    // Show results container
    const resultsContainer = document.querySelector('.results-container');
    if (!resultsContainer) return;
    
    resultsContainer.style.display = 'block';
    
    const aqiCategory = this.getAQICategory(data.aqi);
    const aqiColor = this.getAQIColor(data.aqi);
    
    resultsContainer.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <div class="city-name">${data.cityName}</div>
          <div class="timestamp">${data.timestamp.toLocaleString()}</div>
        </div>
        
        <div class="aqi-display">
          <div class="aqi-value ${aqiCategory.toLowerCase()}" style="color: ${aqiColor}">
            ${data.aqi}
          </div>
          <div class="aqi-label">US EPA Air Quality Index</div>
          <div class="aqi-category ${aqiCategory.toLowerCase()}" style="color: ${aqiColor}">
            ${aqiCategory}
          </div>
        </div>
        
        <div class="cigarette-equivalent">
          <div class="cigarette-icon">🚬</div>
          <div class="cigarette-value">${data.cigarettes}</div>
          <div class="cigarette-label">cigarettes per day equivalent</div>
        </div>
        
        <div class="pm25-info">
          <strong>PM2.5:</strong> ${data.pm25.toFixed(1)} μg/m³ | <strong>Calculation:</strong> ${data.pm25.toFixed(1)} ÷ 22 = ${data.cigarettes} cigarettes/day
        </div>
      </div>
    `;
  }

  getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  }

  showLoading(show) {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.disabled = show;
      searchBtn.innerHTML = show 
        ? '<i class="fas fa-spinner fa-spin"></i>'
        : '<i class="fas fa-search"></i>';
    }
  }

  // Calculate US EPA AQI from PM2.5 concentration
  calculateAQIFromPM25(pm25) {
    if (pm25 < 0) return 0;
    if (pm25 > 500.4) return 500;

    for (const breakpoint of this.aqiBreakpoints) {
      if (pm25 >= breakpoint.min && pm25 <= breakpoint.max) {
        // Linear interpolation formula: AQI = ((I_hi - I_lo) / (C_hi - C_lo)) * (C - C_lo) + I_lo
        const aqi = Math.round(
          ((breakpoint.aqiMax - breakpoint.aqiMin) / (breakpoint.max - breakpoint.min)) * 
          (pm25 - breakpoint.min) + breakpoint.aqiMin
        );
        return aqi;
      }
    }
    return 0;
  }

  showError(message) {
    // Simple error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 4000);
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
  
  // Start the app
  new SimpleAQIApp();
});
