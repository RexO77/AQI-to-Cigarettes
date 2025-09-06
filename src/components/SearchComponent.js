// src/components/SearchComponent.js - Advanced Search with Fuzzy Matching
import { Component } from '../core/Component.js';
import { SmartSearch } from '../modules/SmartSearch.js';

export class SearchComponent extends Component {
  constructor(element, props = {}) {
    super(element, props);
    this.searchEngine = new SmartSearch([]);
    this.debounceTimer = null;
    this.currentQuery = '';
    this.isLoading = false;
  }

  render() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="search-input-wrapper">
        <input
          type="text"
          id="cityInput"
          placeholder="Enter city name (e.g., London, Tokyo, New York)"
          autocomplete="off"
          spellcheck="false"
        >
        <button type="button" id="searchBtn" class="search-btn" aria-label="Search">
          <i class="fas fa-search"></i>
        </button>
        <button type="button" id="locationBtn" class="location-btn" aria-label="Use current location">
          <i class="fas fa-map-marker-alt"></i>
        </button>
      </div>
      <div id="autocomplete-list" class="autocomplete-list" role="listbox" aria-label="City suggestions"></div>
      <div id="search-history" class="search-history" style="display: none;">
        <h4>Recent Searches</h4>
        <div class="history-list"></div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const input = this.querySelector('#cityInput');
    const searchBtn = this.querySelector('#searchBtn');
    const locationBtn = this.querySelector('#locationBtn');
    const autocompleteList = this.querySelector('#autocomplete-list');

    if (input) {
      // Real-time search with debouncing
      input.addEventListener('input', this.handleInput.bind(this));

      // Keyboard navigation
      input.addEventListener('keydown', this.handleKeydown.bind(this));

      // Focus/blur events
      input.addEventListener('focus', this.handleFocus.bind(this));
      input.addEventListener('blur', this.handleBlur.bind(this));
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', this.handleSearch.bind(this));
    }

    if (locationBtn) {
      locationBtn.addEventListener('click', this.handleLocation.bind(this));
    }

    // Click outside to close autocomplete
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.hideAutocomplete();
      }
    });
  }

  handleInput(e) {
    const query = e.target.value.trim();
    this.currentQuery = query;

    if (query.length === 0) {
      this.hideAutocomplete();
      this.showSearchHistory();
      return;
    }

    // Debounce the search
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  async performSearch(query) {
    if (query.length < 2) return;

    this.setLoading(true);

    try {
      const suggestions = await this.fetchCitySuggestions(query);
      this.searchEngine.updateCities(suggestions);
      this.displaySuggestions(suggestions, query);
    } catch (error) {
      console.error('Search failed:', error);
      this.showError('Failed to fetch city suggestions');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchCitySuggestions(query) {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=8&appid=${this.props.app?.dataManager?.apiKey || '7f74765aaa2a9fb00ac8e6262e582771'}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }

    const data = await response.json();
    return data.map(city => ({
      name: city.name,
      country: city.country,
      state: city.state,
      lat: city.lat,
      lon: city.lon,
      displayName: this.formatCityName(city)
    }));
  }

  displaySuggestions(suggestions, query) {
    const autocompleteList = this.querySelector('#autocomplete-list');

    if (!autocompleteList || suggestions.length === 0) {
      this.hideAutocomplete();
      return;
    }

    // Fuzzy search and scoring
    const scoredSuggestions = this.searchEngine.fuzzySearch(query)
      .slice(0, 6); // Limit to 6 suggestions

    autocompleteList.innerHTML = scoredSuggestions
      .map((item, index) => `
        <div
          class="autocomplete-item"
          role="option"
          tabindex="0"
          data-index="${index}"
          data-lat="${item.city.lat}"
          data-lon="${item.city.lon}"
        >
          <div class="city-name">${this.highlightMatch(item.city.displayName, query)}</div>
          <div class="city-country">${item.city.country}</div>
        </div>
      `)
      .join('');

    autocompleteList.style.display = 'block';

    // Add click handlers to suggestions
    autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => this.selectSuggestion(item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectSuggestion(item);
        }
      });
    });
  }

  highlightMatch(text, query) {
    if (!query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  selectSuggestion(element) {
    const cityName = element.querySelector('.city-name').textContent;
    const lat = parseFloat(element.dataset.lat);
    const lon = parseFloat(element.dataset.lon);

    const input = this.querySelector('#cityInput');
    input.value = cityName;

    this.hideAutocomplete();

    // Trigger search
    if (this.props.app) {
      this.props.app.searchCity(cityName);
    } else {
      // Fallback for direct usage
      this.props.onCitySelect?.({ name: cityName, lat, lon });
    }

    // Add to search history
    this.addToSearchHistory({ name: cityName, lat, lon });
  }

  handleKeydown(e) {
    const autocompleteList = this.querySelector('#autocomplete-list');

    if (!autocompleteList || autocompleteList.style.display === 'none') {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
      return;
    }

    const items = autocompleteList.querySelectorAll('.autocomplete-item');
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.navigateSuggestions(items, currentIndex, currentIndex + 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.navigateSuggestions(items, currentIndex, currentIndex - 1);
        break;

      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0) {
          this.selectSuggestion(items[currentIndex]);
        } else {
          this.handleSearch();
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.hideAutocomplete();
        break;
    }
  }

  navigateSuggestions(items, currentIndex, newIndex) {
    // Remove current selection
    if (currentIndex >= 0) {
      items[currentIndex].classList.remove('selected');
    }

    // Set new selection
    if (newIndex >= 0 && newIndex < items.length) {
      items[newIndex].classList.add('selected');
      items[newIndex].focus();
    }
  }

  handleSearch() {
    const input = this.querySelector('#cityInput');
    const query = input.value.trim();

    if (query) {
      if (this.props.app) {
        this.props.app.searchCity(query);
      } else {
        this.props.onSearch?.(query);
      }
    }
  }

  async handleLocation() {
    if (!navigator.geolocation) {
      this.showError('Geolocation is not supported by this browser');
      return;
    }

    this.setLoading(true);

    try {
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      // Reverse geocode to get city name
      const cityData = await this.reverseGeocode(latitude, longitude);

      const input = this.querySelector('#cityInput');
      input.value = cityData.displayName;

      if (this.props.app) {
        this.props.app.searchCity(cityData.displayName);
      }

    } catch (error) {
      console.error('Location error:', error);
      this.showError('Unable to get your location');
    } finally {
      this.setLoading(false);
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      });
    });
  }

  async reverseGeocode(lat, lon) {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.props.app?.dataManager?.apiKey || '7f74765aaa2a9fb00ac8e6262e582771'}`
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();

    if (data.length === 0) {
      throw new Error('No location found');
    }

    const city = data[0];
    return {
      name: city.name,
      country: city.country,
      state: city.state,
      lat,
      lon,
      displayName: this.formatCityName(city)
    };
  }

  formatCityName(city) {
    let displayName = city.name;
    if (city.state) {
      displayName += `, ${city.state}`;
    }
    displayName += `, ${city.country}`;
    return displayName;
  }

  showSearchHistory() {
    const historyContainer = this.querySelector('#search-history');
    const historyList = this.querySelector('.history-list');

    if (!historyContainer || !historyList) return;

    const history = this.getSearchHistory();

    if (history.length === 0) {
      historyContainer.style.display = 'none';
      return;
    }

    historyList.innerHTML = history
      .slice(0, 5)
      .map(item => `
        <div class="history-item" data-lat="${item.lat}" data-lon="${item.lon}">
          <i class="fas fa-history"></i>
          <span>${item.name}</span>
        </div>
      `)
      .join('');

    // Add click handlers
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const cityName = item.querySelector('span').textContent;
        const lat = parseFloat(item.dataset.lat);
        const lon = parseFloat(item.dataset.lon);

        const input = this.querySelector('#cityInput');
        input.value = cityName;

        if (this.props.app) {
          this.props.app.searchCity(cityName);
        }
      });
    });

    historyContainer.style.display = 'block';
  }

  getSearchHistory() {
    try {
      const history = localStorage.getItem('aqi_search_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('Failed to load search history:', error);
      return [];
    }
  }

  addToSearchHistory(cityData) {
    try {
      const history = this.getSearchHistory();
      const existingIndex = history.findIndex(item =>
        item.name === cityData.name && item.lat === cityData.lat && item.lon === cityData.lon
      );

      if (existingIndex > -1) {
        history.splice(existingIndex, 1);
      }

      history.unshift({
        ...cityData,
        timestamp: Date.now()
      });

      const trimmedHistory = history.slice(0, 10);
      localStorage.setItem('aqi_search_history', JSON.stringify(trimmedHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  handleFocus() {
    if (this.currentQuery.length === 0) {
      this.showSearchHistory();
    }
  }

  handleBlur() {
    // Delay hiding to allow for clicks on suggestions
    setTimeout(() => {
      this.hideAutocomplete();
      this.hideSearchHistory();
    }, 150);
  }

  hideAutocomplete() {
    const autocompleteList = this.querySelector('#autocomplete-list');
    if (autocompleteList) {
      autocompleteList.style.display = 'none';
    }
  }

  hideSearchHistory() {
    const historyContainer = this.querySelector('#search-history');
    if (historyContainer) {
      historyContainer.style.display = 'none';
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    const input = this.querySelector('#cityInput');
    const searchBtn = this.querySelector('#searchBtn');

    if (input) {
      input.classList.toggle('loading', loading);
    }

    if (searchBtn) {
      searchBtn.disabled = loading;
      searchBtn.innerHTML = loading
        ? '<i class="fas fa-spinner fa-spin"></i>'
        : '<i class="fas fa-search"></i>';
    }
  }

  showError(message) {
    // Create error toast or use existing error display
    const errorElement = document.createElement('div');
    errorElement.className = 'search-error';
    errorElement.textContent = message;

    this.element.appendChild(errorElement);

    setTimeout(() => {
      errorElement.remove();
    }, 3000);
  }

  onStateChange(prevState, newState) {
    // Update loading state
    if (prevState.loading !== newState.loading) {
      this.setLoading(newState.loading);
    }

    // Update current city in input if it changed
    if (prevState.currentCity !== newState.currentCity && newState.currentCity) {
      const input = this.querySelector('#cityInput');
      if (input && !input.value) {
        input.value = newState.currentCity.name;
      }
    }
  }
}



