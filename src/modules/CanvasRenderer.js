// src/modules/CanvasRenderer.js - Advanced Canvas Rendering Engine
export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.particles = [];
    this.cigarettes = [];
    this.animationFrame = null;
    this.isDestroyed = false;

    // Enable high DPI support
    this.setupHighDPI();

    // Initialize rendering context
    this.setupContext();
  }

  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = rect.width;
    this.height = rect.height;
  }

  setupContext() {
    // Enable anti-aliasing
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Set up shadow defaults
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.setupHighDPI();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.shadowBlur = 0;
  }

  // 3D Cigarette Rendering
  draw3DCigarette(x, y, index, total) {
    const cigaretteWidth = 8;
    const cigaretteHeight = 60;
    const depth = 3;

    // Create 3D effect with multiple layers
    for (let layer = 0; layer < depth; layer++) {
      const offsetX = layer * 1.5;
      const offsetY = layer * 1;
      const alpha = 1 - (layer / depth) * 0.3;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      // Cigarette body
      this.ctx.fillStyle = '#D2B48C'; // Tan color
      this.roundedRect(x + offsetX, y + offsetY, cigaretteWidth, cigaretteHeight, 2);
      this.ctx.fill();

      // Filter tip
      this.ctx.fillStyle = '#FFFFFF';
      this.roundedRect(x + offsetX + 2, y + offsetY + 2, cigaretteWidth - 4, 8, 1);
      this.ctx.fill();

      // Tobacco end
      this.ctx.fillStyle = '#8B4513';
      this.roundedRect(x + offsetX + 2, y + offsetY + cigaretteHeight - 10, cigaretteWidth - 4, 8, 1);
      this.ctx.fill();

      this.ctx.restore();
    }

    // Store cigarette for interaction
    this.cigarettes.push({
      x, y, width: cigaretteWidth, height: cigaretteHeight, index
    });
  }

  // Animated Line Chart
  drawAnimatedLineChart(data) {
    if (!data || data.length === 0) return;

    const padding = 60;
    const chartWidth = this.width - padding * 2;
    const chartHeight = this.height - padding * 2;

    // Calculate scales
    const maxAQI = Math.max(...data.map(d => d.aqi));
    const minAQI = Math.min(...data.map(d => d.aqi));

    const xScale = (index) => padding + (index / (data.length - 1)) * chartWidth;
    const yScale = (aqi) => padding + chartHeight - ((aqi - minAQI) / (maxAQI - minAQI)) * chartHeight;

    // Draw grid
    this.drawGrid(padding, chartWidth, chartHeight, maxAQI);

    // Draw gradient background
    this.drawChartBackground(padding, chartWidth, chartHeight, maxAQI);

    // Draw line with animation
    this.animateLineDrawing(data, xScale, yScale);

    // Draw data points
    this.drawDataPoints(data, xScale, yScale);

    // Draw axes and labels
    this.drawAxes(padding, chartWidth, chartHeight, data, maxAQI);
  }

  drawGrid(padding, chartWidth, chartHeight, maxAQI) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    // Vertical grid lines
    const hours = 24;
    for (let i = 0; i <= hours; i += 4) {
      const x = padding + (i / hours) * chartWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding);
      this.ctx.lineTo(x, padding + chartHeight);
      this.ctx.stroke();
    }

    // Horizontal grid lines
    const levels = [50, 100, 150, 200];
    levels.forEach(level => {
      if (level <= maxAQI) {
        const y = padding + chartHeight - (level / maxAQI) * chartHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, y);
        this.ctx.lineTo(padding + chartWidth, y);
        this.ctx.stroke();
      }
    });
  }

  drawChartBackground(padding, chartWidth, chartHeight, maxAQI) {
    const gradient = this.ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0.1)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(padding, padding, chartWidth, chartHeight);
  }

  animateLineDrawing(data, xScale, yScale) {
    this.ctx.strokeStyle = '#ff4757';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Add shadow
    this.ctx.shadowColor = 'rgba(255, 71, 87, 0.5)';
    this.ctx.shadowBlur = 10;

    this.ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = xScale(i);
      const y = yScale(data[i].aqi);

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        // Smooth curve using quadratic curves
        const prevX = xScale(i - 1);
        const prevY = yScale(data[i - 1].aqi);
        const cpX = (prevX + x) / 2;
        const cpY = prevY;

        this.ctx.quadraticCurveTo(cpX, cpY, x, y);
      }
    }

    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  drawDataPoints(data, xScale, yScale) {
    data.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.aqi);

      // Outer glow
      this.ctx.shadowColor = this.getAQIColor(point.aqi);
      this.ctx.shadowBlur = 15;

      // Point
      this.ctx.fillStyle = this.getAQIColor(point.aqi);
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Inner highlight
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawTrendLine(data) {
    if (data.length < 2) return;

    // Calculate linear trend
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.aqi, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.aqi, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const startY = intercept;
    const endY = slope * (n - 1) + intercept;

    const padding = 60;
    const chartHeight = this.height - padding * 2;
    const maxAQI = Math.max(...data.map(d => d.aqi));
    const minAQI = Math.min(...data.map(d => d.aqi));

    const yScale = (aqi) => padding + chartHeight - ((aqi - minAQI) / (maxAQI - minAQI)) * chartHeight;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(padding, yScale(startY));
    this.ctx.lineTo(this.width - padding, yScale(endY));
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  drawAxes(padding, chartWidth, chartHeight, data, maxAQI) {
    // X-axis
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(padding, padding + chartHeight);
    this.ctx.lineTo(padding + chartWidth, padding + chartHeight);
    this.ctx.stroke();

    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(padding, padding);
    this.ctx.lineTo(padding, padding + chartHeight);
    this.ctx.stroke();

    // Labels
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';

    // Time labels
    const timeLabels = ['24h ago', '18h', '12h', '6h', 'Now'];
    timeLabels.forEach((label, i) => {
      const x = padding + (i / (timeLabels.length - 1)) * chartWidth;
      this.ctx.fillText(label, x, padding + chartHeight + 20);
    });

    // AQI labels
    this.ctx.textAlign = 'right';
    const aqiLabels = [0, 50, 100, 150, 200];
    aqiLabels.forEach(aqi => {
      if (aqi <= maxAQI) {
        const y = padding + chartHeight - (aqi / maxAQI) * chartHeight;
        this.ctx.fillText(aqi.toString(), padding - 10, y + 4);
      }
    });
  }

  // Particle System
  createParticleSystem(count, pm25) {
    this.particles = [];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: this.getParticleColor(pm25),
        life: Math.random() * 100 + 50
      });
    }
  }

  updateParticles() {
    this.clear();

    this.particles.forEach((particle, index) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Bounce off edges
      if (particle.x < 0 || particle.x > this.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.height) particle.vy *= -1;

      // Update life
      particle.life--;

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        return;
      }

      // Draw particle
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity * (particle.life / 100);
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = particle.size * 2;

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });

    // Add new particles occasionally
    if (Math.random() < 0.1 && this.particles.length < 100) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: this.getParticleColor(50),
        life: Math.random() * 100 + 50
      });
    }
  }

  // Breathing effect for cigarettes
  applyBreathingEffect(scale) {
    this.ctx.save();
    this.ctx.scale(scale, scale);
    this.ctx.translate(
      (this.width * (1 - scale)) / (2 * scale),
      (this.height * (1 - scale)) / (2 * scale)
    );

    // Redraw cigarettes with breathing effect
    this.cigarettes.forEach(cigarette => {
      this.draw3DCigarette(cigarette.x, cigarette.y, cigarette.index, this.cigarettes.length);
    });

    this.ctx.restore();
  }

  // Empty state
  drawEmptyState() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Search for a city to see air quality visualization', this.width / 2, this.height / 2);
  }

  // Utility methods
  roundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  }

  getParticleColor(pm25) {
    const intensity = Math.min(pm25 / 100, 1);
    const r = Math.floor(139 + (255 - 139) * intensity);
    const g = Math.floor(69 + (255 - 69) * intensity);
    const b = Math.floor(19 + (255 - 19) * intensity);
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  }

  // Hit testing for interactions
  getHitInfo(x, y) {
    // Check cigarettes
    for (const cigarette of this.cigarettes) {
      if (x >= cigarette.x && x <= cigarette.x + cigarette.width &&
          y >= cigarette.y && y <= cigarette.y + cigarette.height) {
        return {
          type: 'cigarette',
          index: cigarette.index,
          tooltip: `Cigarette #${cigarette.index + 1}`,
          clickable: true
        };
      }
    }

    return null;
  }

  // Performance optimization
  enableOffscreenRendering() {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(this.width, this.height);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      return true;
    }
    return false;
  }

  // Cleanup
  destroy() {
    this.isDestroyed = true;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.particles = [];
    this.cigarettes = [];
  }
}


