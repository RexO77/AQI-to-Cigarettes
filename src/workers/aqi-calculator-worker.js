// src/workers/aqi-calculator-worker.js - Web Worker for Heavy AQI Calculations

// Import calculation functions (in a worker, we need to redefine or import them)
const AQICalculator = {
  // AQI breakpoints for PM2.5
  pm25Breakpoints: [
    { min: 0.0, max: 12.0, aqiMin: 0, aqiMax: 50 },
    { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100 },
    { min: 35.5, max: 55.4, aqiMin: 101, aqiMax: 150 },
    { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200 },
    { min: 150.5, max: 250.4, aqiMin: 201, aqiMax: 300 },
    { min: 250.5, max: 350.4, aqiMin: 301, aqiMax: 400 },
    { min: 350.5, max: 500.4, aqiMin: 401, aqiMax: 500 }
  ],

  linearScale(value, fromMin, fromMax, toMin, toMax) {
    if (fromMax === fromMin) return toMin;
    return Math.round(((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin);
  },

  calculateAQIFromPM25(pm25) {
    if (pm25 < 0) return 0;
    if (pm25 > 500.4) return 500;

    for (const breakpoint of this.pm25Breakpoints) {
      if (pm25 >= breakpoint.min && pm25 <= breakpoint.max) {
        return this.linearScale(pm25, breakpoint.min, breakpoint.max, breakpoint.aqiMin, breakpoint.aqiMax);
      }
    }
    return 0;
  },

  calculateCigarettes(aqi) {
    // Calculate PM2.5 from AQI first
    const pm25 = this.calculatePM25FromAQI(aqi);
    return Number((pm25 / 22).toFixed(2)); // 22 μg/m³ = 1 cigarette per day
  },

  calculatePM25FromAQI(aqi) {
    if (aqi < 0) return 0;
    if (aqi > 500) return 500.4;

    for (const breakpoint of this.pm25Breakpoints) {
      if (aqi >= breakpoint.aqiMin && aqi <= breakpoint.aqiMax) {
        return this.linearScale(aqi, breakpoint.aqiMin, breakpoint.aqiMax, breakpoint.min, breakpoint.max);
      }
    }
    return 0;
  },

  calculateAdvancedAQI(pm25, temperature = 20, humidity = 50) {
    let baseAQI = this.calculateAQIFromPM25(pm25);

    // Temperature adjustment
    if (temperature > 25) {
      baseAQI *= (1 + (temperature - 25) * 0.01);
    }

    // Humidity adjustment
    if (humidity > 70) {
      baseAQI *= (1 + (humidity - 70) * 0.005);
    }

    return Math.round(Math.min(baseAQI, 500));
  },

  assessHealthRisk(pm25, temperature = 20, humidity = 50) {
    const aqi = this.calculateAdvancedAQI(pm25, temperature, humidity);

    let riskLevel = 'low';
    if (aqi <= 50) riskLevel = 'good';
    else if (aqi <= 100) riskLevel = 'moderate';
    else if (aqi <= 150) riskLevel = 'unhealthy';
    else if (aqi <= 200) riskLevel = 'very-unhealthy';
    else if (aqi <= 300) riskLevel = 'hazardous';
    else riskLevel = 'severe';

    return {
      aqi,
      level: riskLevel,
      cigarettes: this.calculateCigarettes(aqi)
    };
  },

  generateRecommendations(pm25, temperature = 20, humidity = 50) {
    const aqi = this.calculateAdvancedAQI(pm25, temperature, humidity);
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

    return recommendations;
  }
};

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data, id } = e.data;

  try {
    let result;

    switch (type) {
      case 'calculate':
        result = calculateAQIMetrics(data);
        break;

      case 'batchCalculate':
        result = calculateBatchAQIMetrics(data);
        break;

      case 'predict':
        result = predictAQITrend(data);
        break;

      case 'analyze':
        result = analyzeAQIHistory(data);
        break;

      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }

    // Send result back to main thread
    self.postMessage({
      type: 'calculationComplete',
      result,
      id,
      success: true
    });

  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'calculationError',
      error: error.message,
      id,
      success: false
    });
  }
};

function calculateAQIMetrics(data) {
  const { pm25, temperature = 20, humidity = 50 } = data;

  return {
    aqi: AQICalculator.calculateAdvancedAQI(pm25, temperature, humidity),
    cigarettes: AQICalculator.calculateCigarettes(AQICalculator.calculateAQIFromPM25(pm25)),
    healthRisk: AQICalculator.assessHealthRisk(pm25, temperature, humidity),
    recommendations: AQICalculator.generateRecommendations(pm25, temperature, humidity)
  };
}

function calculateBatchAQIMetrics(batchData) {
  return batchData.map(data => calculateAQIMetrics(data));
}

function predictAQITrend(historicalData) {
  if (historicalData.length < 3) {
    return { trend: 'insufficient-data', predictions: [] };
  }

  // Simple linear regression for trend prediction
  const n = historicalData.length;
  const sumX = historicalData.reduce((sum, _, i) => sum + i, 0);
  const sumY = historicalData.reduce((sum, d) => sum + d.pm25, 0);
  const sumXY = historicalData.reduce((sum, d, i) => sum + i * d.pm25, 0);
  const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next 24 hours (assuming hourly data)
  const predictions = [];
  for (let i = 1; i <= 24; i++) {
    const predictedPM25 = slope * (n + i) + intercept;
    const predictedAQI = AQICalculator.calculateAQIFromPM25(Math.max(0, predictedPM25));

    predictions.push({
      hour: i,
      pm25: Math.round(predictedPM25 * 100) / 100,
      aqi: predictedAQI
    });
  }

  let trend = 'stable';
  if (slope > 0.5) trend = 'increasing';
  else if (slope < -0.5) trend = 'decreasing';

  return {
    trend,
    slope: Math.round(slope * 100) / 100,
    predictions
  };
}

function analyzeAQIHistory(historicalData) {
  if (historicalData.length === 0) {
    return { analysis: 'no-data' };
  }

  const pm25Values = historicalData.map(d => d.pm25);
  const aqiValues = historicalData.map(d => d.aqi || AQICalculator.calculateAQIFromPM25(d.pm25));

  // Calculate statistics
  const stats = {
    average: pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length,
    max: Math.max(...pm25Values),
    min: Math.min(...pm25Values),
    median: calculateMedian(pm25Values),
    stdDev: calculateStdDev(pm25Values)
  };

  // Detect anomalies (values > 2 standard deviations from mean)
  const anomalies = historicalData.filter((d, i) => {
    const deviation = Math.abs(d.pm25 - stats.average) / stats.stdDev;
    return deviation > 2;
  });

  // Calculate trend
  const trend = predictAQITrend(historicalData);

  return {
    statistics: stats,
    anomalies: anomalies.length,
    anomalyData: anomalies,
    trend: trend.trend,
    slope: trend.slope
  };
}

function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateStdDev(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

// Performance monitoring
let calculationCount = 0;
let totalCalculationTime = 0;

function trackPerformance(startTime) {
  const duration = Date.now() - startTime;
  calculationCount++;
  totalCalculationTime += duration;

  if (calculationCount % 100 === 0) {
    const avgTime = totalCalculationTime / calculationCount;
    console.log(`Worker performance: ${calculationCount} calculations, avg ${avgTime.toFixed(2)}ms`);
  }
}

