// src/components/ResultsComponent.js - Advanced Results Display
import { Component } from '../core/Component.js';

export class ResultsComponent extends Component {
  constructor(element, props = {}) {
    super(element, props);
    this.currentAnimation = null;
    this.animationQueue = [];
  }

  render() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="results-container">
        <div id="result" class="result-card" style="display: none;">
          <div class="result-header">
            <h3 class="city-name">---</h3>
            <div class="result-meta">
              <span class="timestamp">Updated just now</span>
              <span class="data-source">OpenWeatherMap</span>
            </div>
          </div>

          <div class="aqi-display">
            <div class="aqi-value">--</div>
            <div class="aqi-label">Air Quality Index</div>
            <div class="aqi-category">---</div>
          </div>

          <div class="pm25-display">
            <div class="pm25-value">--</div>
            <div class="pm25-unit">μg/m³</div>
            <div class="pm25-label">PM2.5 Concentration</div>
          </div>

          <div class="cigarette-equivalent">
            <div class="cigarette-icon">🚬</div>
            <div class="cigarette-value">--</div>
            <div class="cigarette-label">Cigarettes per day</div>
          </div>
        </div>

        <div class="health-advisory" style="display: none;">
          <div class="advisory-header">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Health Advisory</h4>
          </div>
          <div class="advisory-content">
            <div class="risk-level">
              <span class="risk-badge">---</span>
            </div>
            <ul class="recommendations"></ul>
          </div>
        </div>

        <div class="detailed-info" style="display: none;">
          <h4>Air Quality Details</h4>
          <div class="pollutants-grid">
            <div class="pollutant-item">
              <span class="pollutant-name">PM10</span>
              <span class="pollutant-value">--</span>
              <span class="pollutant-unit">μg/m³</span>
            </div>
            <div class="pollutant-item">
              <span class="pollutant-name">NO₂</span>
              <span class="pollutant-value">--</span>
              <span class="pollutant-unit">μg/m³</span>
            </div>
            <div class="pollutant-item">
              <span class="pollutant-name">SO₂</span>
              <span class="pollutant-value">--</span>
              <span class="pollutant-unit">μg/m³</span>
            </div>
            <div class="pollutant-item">
              <span class="pollutant-name">O₃</span>
              <span class="pollutant-value">--</span>
              <span class="pollutant-unit">μg/m³</span>
            </div>
            <div class="pollutant-item">
              <span class="pollutant-name">CO</span>
              <span class="pollutant-value">--</span>
              <span class="pollutant-unit">μg/m³</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Add click handlers for expandable sections
    const resultCard = this.querySelector('.result-card');
    const healthAdvisory = this.querySelector('.health-advisory');
    const detailedInfo = this.querySelector('.detailed-info');

    if (resultCard) {
      resultCard.addEventListener('click', () => this.toggleSection(detailedInfo));
    }

    if (healthAdvisory) {
      healthAdvisory.addEventListener('click', () => this.toggleSection(healthAdvisory));
    }
  }

  update(changes) {
    super.update(changes);

    // Check if relevant state changed
    const relevantChanges = ['currentCity', 'currentAQI', 'currentPM25', 'cigarettesEquivalent', 'loading', 'error'];
    const hasRelevantChange = relevantChanges.some(key => changes[key]);

    if (hasRelevantChange) {
      this.updateDisplay();
    }
  }

  async updateDisplay() {
    const state = this.props.app?.state?.getState() || {};

    if (state.loading) {
      this.showLoading();
      return;
    }

    if (state.error) {
      this.showError(state.error);
      return;
    }

    if (state.currentCity && state.currentAQI !== null) {
      await this.showResults(state);
    } else {
      this.hideResults();
    }
  }

  async showResults(state) {
    const resultCard = this.querySelector('.result-card');
    const healthAdvisory = this.querySelector('.health-advisory');
    const detailedInfo = this.querySelector('.detailed-info');

    // Update result card
    this.updateResultCard(state);
    this.updateHealthAdvisory(state);
    this.updateDetailedInfo(state);

    // Animate in
    await this.animateIn(resultCard);
    await this.animateIn(healthAdvisory, 200);
    await this.animateIn(detailedInfo, 400);

    // Announce to screen readers
    this.announceResults(state);
  }

  updateResultCard(state) {
    const cityName = this.querySelector('.city-name');
    const aqiValue = this.querySelector('.aqi-value');
    const aqiCategory = this.querySelector('.aqi-category');
    const pm25Value = this.querySelector('.pm25-value');
    const cigaretteValue = this.querySelector('.cigarette-value');
    const timestamp = this.querySelector('.timestamp');

    if (cityName) cityName.textContent = state.currentCity.name;
    if (aqiValue) {
      aqiValue.textContent = state.currentAQI;
      aqiValue.className = `aqi-value ${this.getAQICategory(state.currentAQI).key}`;
    }
    if (aqiCategory) {
      aqiCategory.textContent = this.getAQICategory(state.currentAQI).description;
      aqiCategory.className = `aqi-category ${this.getAQICategory(state.currentAQI).key}`;
    }
    if (pm25Value) pm25Value.textContent = state.currentPM25 || '--';
    if (cigaretteValue) cigaretteValue.textContent = state.cigarettesEquivalent || '--';
    if (timestamp) timestamp.textContent = `Updated ${this.formatTimestamp(new Date())}`;
  }

  updateHealthAdvisory(state) {
    const riskBadge = this.querySelector('.risk-badge');
    const recommendations = this.querySelector('.recommendations');

    if (!riskBadge || !recommendations) return;

    const riskLevel = this.getAQICategory(state.currentAQI);
    riskBadge.textContent = riskLevel.description;
    riskBadge.className = `risk-badge ${riskLevel.key}`;

    const recs = this.generateRecommendations(state.currentAQI, state.currentPM25);
    recommendations.innerHTML = recs.map(rec => `<li>${rec}</li>`).join('');
  }

  updateDetailedInfo(state) {
    // This would be populated with detailed pollutant data
    // For now, we'll use mock data since the API response structure may vary
    const mockPollutants = {
      pm10: Math.round(state.currentPM25 * 1.5),
      no2: Math.round(Math.random() * 50) + 10,
      so2: Math.round(Math.random() * 20) + 5,
      o3: Math.round(Math.random() * 100) + 20,
      co: Math.round(Math.random() * 500) + 100
    };

    Object.entries(mockPollutants).forEach(([pollutant, value]) => {
      const element = this.querySelector(`.${pollutant.toLowerCase()}-value`);
      if (element) element.textContent = value;
    });
  }

  generateRecommendations(aqi, pm25) {
    const recommendations = [];

    if (aqi <= 50) {
      recommendations.push('✅ Air quality is satisfactory. Enjoy outdoor activities!');
      recommendations.push('🌱 Consider planting trees to help improve local air quality.');
    } else if (aqi <= 100) {
      recommendations.push('⚠️ Sensitive individuals should consider reducing prolonged outdoor exertion.');
      recommendations.push('🏠 Keep windows closed during peak pollution hours.');
    } else if (aqi <= 150) {
      recommendations.push('🚨 Children, elderly, and those with respiratory conditions should avoid outdoor activities.');
      recommendations.push('😷 Consider wearing N95 masks if you must go outside.');
      recommendations.push('🏃‍♂️ Avoid outdoor exercise, especially near busy roads.');
    } else if (aqi <= 200) {
      recommendations.push('🚨 Everyone should avoid outdoor activities. Stay indoors with air filtration.');
      recommendations.push('🏠 Use air purifiers with HEPA filters.');
      recommendations.push('🚗 Avoid driving; use public transport or walk during low-traffic hours.');
    } else if (aqi <= 300) {
      recommendations.push('🚨 Hazardous conditions! Stay indoors, use air purifiers, and wear N95 masks if going outside.');
      recommendations.push('🏥 Monitor health symptoms and seek medical attention if needed.');
    } else {
      recommendations.push('🚨 EMERGENCY: Severe health risk! Seek clean air immediately.');
      recommendations.push('🏥 Emergency responders should use appropriate respiratory protection.');
      recommendations.push('📞 Contact local health authorities for guidance.');
    }

    // PM2.5 specific recommendations
    if (pm25 > 55.4) {
      recommendations.push('🔍 High PM2.5 levels detected. Use advanced air filtration systems.');
    }

    return recommendations;
  }

  getAQICategory(aqi) {
    const categories = {
      good: { min: 0, max: 50, color: '#00e400', description: 'Good', key: 'good' },
      moderate: { min: 51, max: 100, color: '#ffff00', description: 'Moderate', key: 'moderate' },
      unhealthy: { min: 101, max: 150, color: '#ff7e00', description: 'Unhealthy for Sensitive Groups', key: 'unhealthy' },
      veryUnhealthy: { min: 151, max: 200, color: '#ff0000', description: 'Very Unhealthy', key: 'very-unhealthy' },
      hazardous: { min: 201, max: 300, color: '#8f3f97', description: 'Hazardous', key: 'hazardous' },
      severe: { min: 301, max: 500, color: '#7e0023', description: 'Very Hazardous', key: 'severe' }
    };

    for (const [key, category] of Object.entries(categories)) {
      if (aqi >= category.min && aqi <= category.max) {
        return category;
      }
    }

    return categories.severe; // Default for extreme values
  }

  showLoading() {
    const resultCard = this.querySelector('.result-card');
    if (resultCard) {
      resultCard.style.display = 'block';
      resultCard.classList.add('loading');

      // Show loading animation
      const aqiValue = this.querySelector('.aqi-value');
      const pm25Value = this.querySelector('.pm25-value');
      const cigaretteValue = this.querySelector('.cigarette-value');

      [aqiValue, pm25Value, cigaretteValue].forEach(el => {
        if (el) el.innerHTML = '<div class="loading-spinner"></div>';
      });
    }
  }

  showError(error) {
    const resultCard = this.querySelector('.result-card');
    if (resultCard) {
      resultCard.style.display = 'block';
      resultCard.classList.remove('loading');
      resultCard.classList.add('error');

      const aqiValue = this.querySelector('.aqi-value');
      if (aqiValue) {
        aqiValue.innerHTML = '❌';
        aqiValue.className = 'aqi-value error';
      }

      const cityName = this.querySelector('.city-name');
      if (cityName) cityName.textContent = 'Error';

      const aqiCategory = this.querySelector('.aqi-category');
      if (aqiCategory) {
        aqiCategory.textContent = error;
        aqiCategory.className = 'aqi-category error';
      }
    }
  }

  hideResults() {
    const resultCard = this.querySelector('.result-card');
    const healthAdvisory = this.querySelector('.health-advisory');
    const detailedInfo = this.querySelector('.detailed-info');

    [resultCard, healthAdvisory, detailedInfo].forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  async animateIn(element, delay = 0) {
    if (!element) return;

    return new Promise(resolve => {
      setTimeout(() => {
        element.style.display = 'block';
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';

        this.animate(element, 0, 1, 300, 'ease-out').then(() => {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
          resolve();
        });
      }, delay);
    });
  }

  toggleSection(section) {
    if (!section) return;

    const isVisible = section.style.display !== 'none';
    if (isVisible) {
      this.animate(section, 1, 0, 200).then(() => {
        section.style.display = 'none';
      });
    } else {
      section.style.display = 'block';
      section.style.opacity = '0';
      this.animate(section, 0, 1, 200);
    }
  }

  formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'just now'; // Less than 1 minute
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; // Minutes
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; // Hours

    return date.toLocaleDateString(); // Date
  }

  announceResults(state) {
    // Announce to screen readers
    const announcement = `Air quality updated for ${state.currentCity.name}. AQI is ${state.currentAQI}, which is ${this.getAQICategory(state.currentAQI).description}.`;

    // Create aria-live region if it doesn't exist
    let liveRegion = document.getElementById('results-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'results-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = announcement;
  }
}



