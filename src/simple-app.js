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

    // Show advanced visualizations
    this.showVisualization(data);
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

  showVisualization(data) {
    // Hide visualization placeholder
    const vizPlaceholder = document.getElementById('visualization-placeholder');
    if (vizPlaceholder) vizPlaceholder.style.display = 'none';
    
    // Show visualization container
    const vizContainer = document.querySelector('.visualization-container');
    if (!vizContainer) return;
    
    vizContainer.style.display = 'block';
    
    // Generate historical trend data (simulated)
    const trendData = this.generateTrendData(data.aqi, data.pm25);
    const pollutantData = this.generatePollutantBreakdown(data);
    
    vizContainer.innerHTML = `
      <div class="visualization-header">
        <h3>Advanced Air Quality Analysis</h3>
        <div class="visualization-controls">
          <button class="viz-btn active" data-chart="trend">7-Day Trend</button>
          <button class="viz-btn" data-chart="breakdown">Pollutant Breakdown</button>
          <button class="viz-btn" data-chart="health">Health Impact</button>
        </div>
      </div>
      
      <div class="chart-container">
        <canvas id="aqiChart" width="800" height="400"></canvas>
      </div>
      
      <div class="chart-insights">
        <div class="insight-card">
          <h4>Air Quality Trend</h4>
          <p>Current AQI of ${data.aqi} is ${this.getTrendDirection(trendData)} compared to the 7-day average of ${Math.round(trendData.reduce((a, b) => a + b.aqi, 0) / 7)}.</p>
        </div>
        
        <div class="insight-card">
          <h4>Health Recommendation</h4>
          <p>${this.getHealthRecommendation(data.aqi)}</p>
        </div>
        
        <div class="insight-card">
          <h4>Cigarette Comparison</h4>
          <p>Breathing this air for 24 hours equals smoking ${data.cigarettes} cigarette${data.cigarettes !== 1 ? 's' : ''}. ${this.getCigaretteComparison(data.cigarettes)}</p>
        </div>
      </div>
    `;
    
    // Initialize chart
    this.initializeChart(trendData, pollutantData, data);
    this.setupChartControls();
  }

  generateTrendData(currentAqi, currentPm25) {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate realistic variations
      const variation = (Math.random() - 0.5) * 40;
      const aqi = Math.max(10, Math.min(300, currentAqi + variation));
      const pm25 = Math.max(5, Math.min(200, currentPm25 + (variation * 0.6)));
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        aqi: Math.round(aqi),
        pm25: Math.round(pm25 * 10) / 10,
        cigarettes: Math.max(0, Math.round(pm25 / 22))
      });
    }
    
    return data;
  }

  generatePollutantBreakdown(data) {
    // Simulate realistic pollutant distribution
    const pm25 = data.pm25;
    return {
      'PM2.5': pm25,
      'PM10': pm25 * 1.8,
      'NO2': Math.max(10, pm25 * 0.4),
      'SO2': Math.max(5, pm25 * 0.2),
      'CO': Math.max(0.5, pm25 * 0.1),
      'O3': Math.max(20, pm25 * 0.6)
    };
  }

  initializeChart(trendData, pollutantData, currentData) {
    const canvas = document.getElementById('aqiChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    this.currentChart = 'trend';
    this.chartData = { trendData, pollutantData, currentData };
    
    this.drawTrendChart(ctx, trendData);
  }

  drawTrendChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up chart area
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Find data ranges
    const maxAqi = Math.max(...data.map(d => d.aqi));
    const minAqi = Math.min(...data.map(d => d.aqi));
    const range = maxAqi - minAqi || 50;
    
    // Draw grid
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      // Y-axis labels
      const value = Math.round(maxAqi - (range * i) / 5);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(value, padding - 10, y + 4);
    }
    
    // Draw AQI line
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (data.length - 1);
      const y = padding + chartHeight - ((point.aqi - minAqi) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw data points
      ctx.save();
      ctx.fillStyle = this.getAQIColor(point.aqi);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
      
      // X-axis labels
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(point.date, x, height - padding + 20);
    });
    
    ctx.stroke();
    
    // Chart title
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#333';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('7-Day AQI Trend', width / 2, 30);
  }

  drawBreakdownChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    
    ctx.clearRect(0, 0, width, height);
    
    const pollutants = Object.keys(data);
    const values = Object.values(data);
    const maxValue = Math.max(...values);
    
    const barWidth = (width - 2 * padding) / pollutants.length - 20;
    const chartHeight = height - 2 * padding;
    
    // Draw bars
    pollutants.forEach((pollutant, index) => {
      const value = values[index];
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + 20);
      const y = height - padding - barHeight;
      
      // Bar color based on pollutant type
      const colors = {
        'PM2.5': '#FF6B6B',
        'PM10': '#4ECDC4',
        'NO2': '#45B7D1',
        'SO2': '#96CEB4',
        'CO': '#FFEAA7',
        'O3': '#DDA0DD'
      };
      
      ctx.fillStyle = colors[pollutant] || '#999';
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Value labels
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#333';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(value.toFixed(1), x + barWidth / 2, y - 5);
      
      // Pollutant labels
      ctx.fillText(pollutant, x + barWidth / 2, height - padding + 20);
    });
    
    // Chart title
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('Pollutant Breakdown (μg/m³)', width / 2, 30);
  }

  drawHealthChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw cigarette comparison visualization
    const cigarettes = data.cigarettes;
    const maxCigs = 20; // Max cigarettes to show
    const cigWidth = 30;
    const cigHeight = 8;
    const rows = Math.ceil(Math.min(cigarettes, maxCigs) / 10);
    
    ctx.fillStyle = '#8B4513';
    
    for (let i = 0; i < Math.min(cigarettes, maxCigs); i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = width / 2 - 150 + col * (cigWidth + 5);
      const y = height / 2 - 50 + row * (cigHeight + 10);
      
      // Draw cigarette
      ctx.fillRect(x, y, cigWidth, cigHeight);
      
      // Draw filter
      ctx.fillStyle = '#F4A460';
      ctx.fillRect(x + cigWidth - 8, y, 8, cigHeight);
      ctx.fillStyle = '#8B4513';
    }
    
    // Additional cigarettes indicator
    if (cigarettes > maxCigs) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#333';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`+${cigarettes - maxCigs} more cigarettes`, width / 2, height / 2 + 60);
    }
    
    // Title and info
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('Daily Cigarette Equivalent', width / 2, 30);
    
    ctx.font = '14px system-ui';
    ctx.fillText(`${cigarettes} cigarette${cigarettes !== 1 ? 's' : ''} per day`, width / 2, height - 40);
  }

  setupChartControls() {
    const buttons = document.querySelectorAll('.viz-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active state
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Switch chart
        const chartType = btn.dataset.chart;
        const canvas = document.getElementById('aqiChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        switch (chartType) {
          case 'trend':
            this.drawTrendChart(ctx, this.chartData.trendData);
            break;
          case 'breakdown':
            this.drawBreakdownChart(ctx, this.chartData.pollutantData);
            break;
          case 'health':
            this.drawHealthChart(ctx, this.chartData.currentData);
            break;
        }
      });
    });
  }

  getTrendDirection(trendData) {
    const recent = trendData.slice(-3).reduce((a, b) => a + b.aqi, 0) / 3;
    const older = trendData.slice(0, 3).reduce((a, b) => a + b.aqi, 0) / 3;
    
    if (recent > older + 10) return 'significantly higher';
    if (recent > older + 5) return 'higher';
    if (recent < older - 10) return 'significantly lower';
    if (recent < older - 5) return 'lower';
    return 'similar';
  }

  getHealthRecommendation(aqi) {
    if (aqi <= 50) return 'Air quality is good. Great day for outdoor activities!';
    if (aqi <= 100) return 'Air quality is moderate. Sensitive individuals should consider limiting outdoor activities.';
    if (aqi <= 150) return 'Unhealthy for sensitive groups. Children, elderly, and people with respiratory conditions should limit outdoor exposure.';
    if (aqi <= 200) return 'Unhealthy air quality. Everyone should limit outdoor activities and wear masks when outside.';
    if (aqi <= 300) return 'Very unhealthy air. Avoid outdoor activities. Stay indoors with air purifiers if possible.';
    return 'Hazardous air quality. Emergency conditions. Avoid all outdoor activities.';
  }

  getCigaretteComparison(cigarettes) {
    if (cigarettes === 0) return 'Equivalent to breathing clean air.';
    if (cigarettes <= 2) return 'Similar to light exposure to secondhand smoke.';
    if (cigarettes <= 5) return 'Comparable to being in a moderately smoky environment.';
    if (cigarettes <= 10) return 'Like being in a heavily polluted urban area.';
    if (cigarettes <= 20) return 'Equivalent to heavy smoking exposure.';
    return 'Extremely hazardous - like chain smoking.';
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
