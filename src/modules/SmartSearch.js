// src/modules/SmartSearch.js - Intelligent Search with Fuzzy Matching
export class SmartSearch {
  constructor(cities = []) {
    this.cities = cities;
    this.searchIndex = new Map();
    this.searchHistory = new Map();
    this.popularCities = this.getPopularCities();
    this.buildSearchIndex();
  }

  updateCities(cities) {
    this.cities = cities;
    this.buildSearchIndex();
  }

  buildSearchIndex() {
    this.searchIndex.clear();

    this.cities.forEach((city, index) => {
      const terms = this.extractSearchTerms(city);
      terms.forEach(term => {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, []);
        }
        this.searchIndex.get(term).push(index);
      });
    });
  }

  extractSearchTerms(city) {
    const terms = new Set();

    // Add full name variations
    const fullName = city.displayName || city.name;
    terms.add(fullName.toLowerCase());

    // Add individual words
    const words = fullName.toLowerCase().split(/[\s,]+/);
    words.forEach(word => {
      if (word.length > 2) { // Skip very short words
        terms.add(word);
      }
    });

    // Add country code
    if (city.country) {
      terms.add(city.country.toLowerCase());
    }

    // Add state/province
    if (city.state) {
      terms.add(city.state.toLowerCase());
    }

    // Add common abbreviations
    if (city.name === 'New York') terms.add('nyc');
    if (city.name === 'Los Angeles') terms.add('la');
    if (city.name === 'London') terms.add('uk');
    if (city.name === 'Paris') terms.add('france');

    return Array.from(terms);
  }

  fuzzySearch(query, threshold = 0.6) {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase().trim();
    const results = new Map();

    // Direct prefix matches (highest priority)
    this.cities.forEach((city, index) => {
      const cityName = (city.displayName || city.name).toLowerCase();
      if (cityName.startsWith(queryLower)) {
        results.set(index, {
          city,
          score: 1.0,
          matchType: 'prefix'
        });
      }
    });

    // Fuzzy matches
    this.cities.forEach((city, index) => {
      if (results.has(index)) return; // Skip if already matched

      const cityName = (city.displayName || city.name).toLowerCase();
      const score = this.calculateSimilarity(queryLower, cityName);

      if (score >= threshold) {
        results.set(index, {
          city,
          score,
          matchType: 'fuzzy'
        });
      }
    });

    // Word-based matches
    if (results.size === 0) {
      const queryWords = queryLower.split(/\s+/);
      this.cities.forEach((city, index) => {
        const cityWords = (city.displayName || city.name).toLowerCase().split(/[\s,]+/);
        let wordMatches = 0;

        queryWords.forEach(queryWord => {
          cityWords.forEach(cityWord => {
            if (this.calculateSimilarity(queryWord, cityWord) > 0.8) {
              wordMatches++;
            }
          });
        });

        if (wordMatches > 0) {
          const score = wordMatches / queryWords.length;
          results.set(index, {
            city,
            score,
            matchType: 'word'
          });
        }
      });
    }

    // Convert to array and sort by score
    const sortedResults = Array.from(results.values())
      .sort((a, b) => {
        // Primary sort by score
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }

        // Secondary sort by match type priority
        const typePriority = { prefix: 3, fuzzy: 2, word: 1 };
        const aPriority = typePriority[a.matchType] || 0;
        const bPriority = typePriority[b.matchType] || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        // Tertiary sort by popularity
        const aPopularity = this.getCityPopularity(a.city);
        const bPopularity = this.getCityPopularity(b.city);

        return bPopularity - aPopularity;
      });

    return sortedResults;
  }

  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Levenshtein distance calculation
    const matrix = Array(shorter.length + 1).fill(null).map(() => Array(longer.length + 1).fill(null));

    for (let i = 0; i <= shorter.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= longer.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= shorter.length; i++) {
      for (let j = 1; j <= longer.length; j++) {
        const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1,     // deletion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[shorter.length][longer.length];
    const maxLength = Math.max(str1.length, str2.length);

    // Normalize similarity score
    const similarity = 1 - (distance / maxLength);

    // Boost score for substring matches
    if (longer.includes(shorter)) {
      return Math.min(similarity + 0.2, 1.0);
    }

    return similarity;
  }

  getCityPopularity(city) {
    // Check if city is in popular cities list
    const popularIndex = this.popularCities.findIndex(pc =>
      pc.name.toLowerCase() === city.name.toLowerCase() &&
      pc.country.toLowerCase() === city.country.toLowerCase()
    );

    if (popularIndex >= 0) {
      return this.popularCities.length - popularIndex; // Higher score for more popular cities
    }

    // Check search history frequency
    const historyKey = `${city.name}_${city.country}`.toLowerCase();
    return this.searchHistory.get(historyKey) || 0;
  }

  recordSearch(city) {
    const key = `${city.name}_${city.country}`.toLowerCase();
    const current = this.searchHistory.get(key) || 0;
    this.searchHistory.set(key, current + 1);

    // Persist to localStorage
    try {
      const history = JSON.parse(localStorage.getItem('search_frequency') || '{}');
      history[key] = (history[key] || 0) + 1;
      localStorage.setItem('search_frequency', JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save search frequency:', error);
    }
  }

  loadSearchHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('search_frequency') || '{}');
      this.searchHistory = new Map(Object.entries(history));
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }

  getPopularCities() {
    return [
      { name: 'London', country: 'GB', state: 'England' },
      { name: 'New York', country: 'US', state: 'New York' },
      { name: 'Tokyo', country: 'JP' },
      { name: 'Paris', country: 'FR' },
      { name: 'Sydney', country: 'AU' },
      { name: 'Berlin', country: 'DE' },
      { name: 'Singapore', country: 'SG' },
      { name: 'Mumbai', country: 'IN' },
      { name: 'Beijing', country: 'CN' },
      { name: 'Los Angeles', country: 'US', state: 'California' },
      { name: 'Chicago', country: 'US', state: 'Illinois' },
      { name: 'Toronto', country: 'CA', state: 'Ontario' },
      { name: 'Amsterdam', country: 'NL' },
      { name: 'Barcelona', country: 'ES' },
      { name: 'Rome', country: 'IT' },
      { name: 'Vienna', country: 'AT' },
      { name: 'Prague', country: 'CZ' },
      { name: 'Bangkok', country: 'TH' },
      { name: 'Istanbul', country: 'TR' },
      { name: 'Moscow', country: 'RU' }
    ];
  }

  // Advanced search with filters
  advancedSearch(query, filters = {}) {
    let results = this.fuzzySearch(query);

    // Apply filters
    if (filters.country) {
      results = results.filter(result =>
        result.city.country.toLowerCase() === filters.country.toLowerCase()
      );
    }

    if (filters.minPopulation) {
      // This would require population data integration
      // For now, filter by popular cities
      results = results.filter(result =>
        this.getCityPopularity(result.city) > 5
      );
    }

    if (filters.maxResults) {
      results = results.slice(0, filters.maxResults);
    }

    return results;
  }

  // Auto-complete suggestions
  getAutocompleteSuggestions(partialQuery, limit = 5) {
    if (partialQuery.length < 2) return [];

    const results = this.fuzzySearch(partialQuery, 0.3);

    return results
      .slice(0, limit)
      .map(result => ({
        text: result.city.displayName || result.city.name,
        city: result.city,
        score: result.score
      }));
  }

  // Search analytics
  getSearchAnalytics() {
    const totalSearches = Array.from(this.searchHistory.values()).reduce((sum, count) => sum + count, 0);
    const popularSearches = Array.from(this.searchHistory.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      totalSearches,
      uniqueCities: this.searchHistory.size,
      popularSearches: popularSearches.map(([key, count]) => ({
        city: key.split('_')[0],
        country: key.split('_')[1],
        count
      }))
    };
  }

  // Clear search data
  clearSearchHistory() {
    this.searchHistory.clear();
    localStorage.removeItem('search_frequency');
  }

  // Export search data for backup
  exportSearchData() {
    return {
      history: Object.fromEntries(this.searchHistory),
      cities: this.cities,
      timestamp: new Date().toISOString()
    };
  }

  // Import search data
  importSearchData(data) {
    if (data.history) {
      this.searchHistory = new Map(Object.entries(data.history));
      localStorage.setItem('search_frequency', JSON.stringify(data.history));
    }

    if (data.cities) {
      this.updateCities(data.cities);
    }
  }
}



