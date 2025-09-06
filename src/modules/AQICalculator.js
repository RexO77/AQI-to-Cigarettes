// src/modules/AQICalculator.js - Advanced AQI Calculations
export class AQICalculator {
  constructor() {
    this.aqiBreakpoints = {
      pm25: [
        { min: 0.0, max: 12.0, aqiMin: 0, aqiMax: 50 },
        { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100 },
        { min: 35.5, max: 55.4, aqiMin: 101, aqiMax: 150 },
        { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200 },
        { min: 150.5, max: 250.4, aqiMin: 201, aqiMax: 300 },
        { min: 250.5, max: 350.4, aqiMin: 301, aqiMax: 400 },
        { min: 350.5, max: 500.4, aqiMin: 401, aqiMax: 500 }
      ],
      pm10: [
        { min: 0, max: 54, aqiMin: 0, aqiMax: 50 },
        { min: 55, max: 154, aqiMin: 51, aqiMax: 100 },
        { min: 155, max: 254, aqiMin: 101, aqiMax: 150 },
        { min: 255, max: 354, aqiMin: 151, aqiMax: 200 },
        { min: 355, max: 424, aqiMin: 201, aqiMax: 300 },
        { min: 425, max: 504, aqiMin: 301, aqiMax: 400 },
        { min: 505, max: 604, aqiMin: 401, aqiMax: 500 }
      ]
    };
  }

  // Calculate AQI from PM2.5 concentration
  calculateAQIFromPM25(pm25) {
    if (pm25 < 0) return 0;
    if (pm25 > 500.4) return 500;

    for (const breakpoint of this.aqiBreakpoints.pm25) {
      if (pm25 >= breakpoint.min && pm25 <= breakpoint.max) {
        return this.linearScale(pm25, breakpoint.min, breakpoint.max, breakpoint.aqiMin, breakpoint.aqiMax);
      }
    }

    return 0;
  }

  // Calculate PM2.5 from AQI
  calculatePM25FromAQI(aqi) {
    if (aqi < 0) return 0;
    if (aqi > 500) return 500.4;

    for (const breakpoint of this.aqiBreakpoints.pm25) {
      if (aqi >= breakpoint.aqiMin && aqi <= breakpoint.aqiMax) {
        return this.linearScale(aqi, breakpoint.aqiMin, breakpoint.aqiMax, breakpoint.min, breakpoint.max);
      }
    }

    return 0;
  }

  // Calculate cigarette equivalents
  calculateCigarettes(aqi) {
    // Based on Berkeley Earth research: 22 μg/m³ PM2.5 = 1 cigarette per day
    const pm25 = this.calculatePM25FromAQI(aqi);
    return (pm25 / 22).toFixed(2);
  }

  // Advanced AQI calculation with environmental factors
  calculateAdvancedAQI(pm25, temperature = 20, humidity = 50) {
    let baseAQI = this.calculateAQIFromPM25(pm25);

    // Temperature adjustment (PM2.5 is more harmful in warmer temperatures)
    if (temperature > 25) {
      baseAQI *= (1 + (temperature - 25) * 0.01);
    }

    // Humidity adjustment (higher humidity can increase particle deposition)
    if (humidity > 70) {
      baseAQI *= (1 + (humidity - 70) * 0.005);
    }

    return Math.round(Math.min(baseAQI, 500));
  }

  // Health risk assessment
  assessHealthRisk(aqi, pm25, userProfile = {}) {
    const { age, hasRespiratoryCondition, isSmoker } = userProfile;

    let riskLevel = 'low';
    let riskMultiplier = 1;

    // Base risk from AQI
    if (aqi <= 50) riskLevel = 'good';
    else if (aqi <= 100) riskLevel = 'moderate';
    else if (aqi <= 150) riskLevel = 'unhealthy';
    else if (aqi <= 200) riskLevel = 'very-unhealthy';
    else if (aqi <= 300) riskLevel = 'hazardous';
    else riskLevel = 'severe';

    // Personal risk factors
    if (age && age > 65) riskMultiplier *= 1.5;
    if (hasRespiratoryCondition) riskMultiplier *= 1.8;
    if (isSmoker) riskMultiplier *= 2.0;

    // PM2.5 specific risks
    if (pm25 > 35.4) riskMultiplier *= 1.3; // Very unhealthy threshold

    return {
      level: riskLevel,
      multiplier: riskMultiplier,
      adjustedRisk: Math.min(riskLevel === 'severe' ? 'extreme' : riskLevel, this.adjustRiskLevel(riskLevel, riskMultiplier)),
      recommendations: this.generateRecommendations(aqi, pm25, userProfile)
    };
  }

  // Generate health recommendations
  generateRecommendations(aqi, pm25, userProfile = {}) {
    const recommendations = [];

    if (aqi <= 50) {
      recommendations.push('Air quality is good. Enjoy outdoor activities!');
    } else if (aqi <= 100) {
      recommendations.push('Air quality is moderate. Sensitive individuals should consider limiting prolonged outdoor exertion.');
    } else if (aqi <= 150) {
      recommendations.push('Air quality is unhealthy for sensitive groups. Children, elderly, and those with respiratory conditions should avoid outdoor activities.');
    } else if (aqi <= 200) {
      recommendations.push('Air quality is very unhealthy. Everyone should avoid outdoor activities. Stay indoors with air filtration.');
    } else if (aqi <= 300) {
      recommendations.push('Air quality is hazardous. Stay indoors, use air purifiers, and wear N95 masks if going outside is necessary.');
    } else {
      recommendations.push('Air quality is severe. Emergency conditions! Seek clean air immediately, use advanced respiratory protection.');
    }

    // PM2.5 specific recommendations
    if (pm25 > 55.4) {
      recommendations.push('High PM2.5 levels detected. Use HEPA air purifiers indoors.');
    }

    // Personal recommendations
    if (userProfile.isSmoker) {
      recommendations.push('As a smoker, you\'re already at higher risk. Consider quitting during high pollution periods.');
    }

    if (userProfile.hasRespiratoryCondition) {
      recommendations.push('With your respiratory condition, take extra precautions during poor air quality.');
    }

    return recommendations;
  }

  // AQI category and color
  getAQICategory(aqi) {
    const categories = {
      good: { min: 0, max: 50, color: '#00e400', description: 'Good' },
      moderate: { min: 51, max: 100, color: '#ffff00', description: 'Moderate' },
      unhealthy: { min: 101, max: 150, color: '#ff7e00', description: 'Unhealthy for Sensitive Groups' },
      veryUnhealthy: { min: 151, max: 200, color: '#ff0000', description: 'Very Unhealthy' },
      hazardous: { min: 201, max: 300, color: '#8f3f97', description: 'Hazardous' },
      severe: { min: 301, max: 500, color: '#7e0023', description: 'Very Hazardous' }
    };

    for (const [key, category] of Object.entries(categories)) {
      if (aqi >= category.min && aqi <= category.max) {
        return { ...category, key };
      }
    }

    return categories.severe; // Default for extreme values
  }

  // Trend analysis
  analyzeTrend(historicalData) {
    if (historicalData.length < 2) return { trend: 'insufficient-data' };

    const recent = historicalData.slice(-10); // Last 10 readings
    const older = historicalData.slice(-20, -10); // Previous 10 readings

    const recentAvg = recent.reduce((sum, d) => sum + d.aqi, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.aqi, 0) / older.length;

    const change = recentAvg - olderAvg;
    const percentChange = (change / olderAvg) * 100;

    let trend = 'stable';
    if (Math.abs(percentChange) < 5) {
      trend = 'stable';
    } else if (percentChange > 5) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      trend,
      change: Math.round(change),
      percentChange: Math.round(percentChange),
      recentAverage: Math.round(recentAvg),
      olderAverage: Math.round(olderAvg)
    };
  }

  // Seasonal analysis
  analyzeSeasonal(data) {
    // Group data by month
    const monthlyData = {};
    data.forEach(entry => {
      const month = new Date(entry.timestamp).getMonth();
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(entry.aqi);
    });

    const seasonalAverages = {};
    Object.keys(monthlyData).forEach(month => {
      seasonalAverages[month] = monthlyData[month].reduce((sum, aqi) => sum + aqi, 0) / monthlyData[month].length;
    });

    return seasonalAverages;
  }

  // Utility functions
  linearScale(value, fromMin, fromMax, toMin, toMax) {
    if (fromMax === fromMin) return toMin;
    return Math.round(((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin);
  }

  adjustRiskLevel(baseLevel, multiplier) {
    const levels = ['good', 'moderate', 'unhealthy', 'very-unhealthy', 'hazardous', 'severe', 'extreme'];
    const currentIndex = levels.indexOf(baseLevel);

    if (currentIndex === -1) return baseLevel;

    const adjustedIndex = Math.min(currentIndex + Math.floor(multiplier - 1), levels.length - 1);
    return levels[adjustedIndex];
  }

  // Calculate AQI from multiple pollutants (if available)
  calculateAQIFromMultiplePollutants(pollutants) {
    const aqiValues = [];

    // Calculate AQI for each pollutant
    if (pollutants.pm25 !== undefined) {
      aqiValues.push(this.calculateAQIFromPM25(pollutants.pm25));
    }

    if (pollutants.pm10 !== undefined) {
      aqiValues.push(this.calculateAQIFromPM10(pollutants.pm10));
    }

    // Add more pollutants as needed

    // Return the highest AQI value
    return Math.max(...aqiValues);
  }

  // Calculate AQI from PM10
  calculateAQIFromPM10(pm10) {
    if (pm10 < 0) return 0;
    if (pm10 > 604) return 500;

    for (const breakpoint of this.aqiBreakpoints.pm10) {
      if (pm10 >= breakpoint.min && pm10 <= breakpoint.max) {
        return this.linearScale(pm10, breakpoint.min, breakpoint.max, breakpoint.aqiMin, breakpoint.aqiMax);
      }
    }

    return 0;
  }
}



