// src/components/VisualizationComponent.js - Advanced Canvas Visualizations
import { Component } from '../core/Component.js';
import { CanvasRenderer } from '../modules/CanvasRenderer.js';

export class VisualizationComponent extends Component {
  constructor(element, props = {}) {
    super(element, props);
    this.canvas = null;
    this.renderer = null;
    this.animationId = null;
    this.isAnimating = false;
    this.currentVisualization = 'cigarettes'; // cigarettes, chart, particles
  }

  render() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="visualization-container">
        <div class="visualization-header">
          <h3>Air Quality Visualization</h3>
          <div class="visualization-controls">
            <button class="viz-btn active" data-viz="cigarettes">
              <i class="fas fa-smoking"></i> Cigarettes
            </button>
            <button class="viz-btn" data-viz="chart">
              <i class="fas fa-chart-line"></i> Trend
            </button>
            <button class="viz-btn" data-viz="particles">
              <i class="fas fa-atom"></i> Particles
            </button>
          </div>
        </div>

        <div class="canvas-wrapper">
          <canvas id="aqi-canvas" width="800" height="400"></canvas>
          <div class="canvas-overlay">
            <div class="canvas-tooltip" style="display: none;"></div>
            <div class="canvas-loading" style="display: none;">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Rendering...</span>
            </div>
          </div>
        </div>

        <div class="visualization-info">
          <div class="info-item">
            <span class="info-label">Equivalent to smoking</span>
            <span class="info-value" id="cigarette-count">--</span>
            <span class="info-unit">cigarettes per day</span>
          </div>
          <div class="info-item">
            <span class="info-label">Health Impact</span>
            <span class="info-value" id="health-impact">--</span>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.initializeCanvas();
  }

  bindEvents() {
    // Visualization type buttons
    const vizButtons = this.querySelectorAll('.viz-btn');
    vizButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const vizType = btn.dataset.viz;
        this.switchVisualization(vizType);
      });
    });

    // Canvas interactions
    const canvas = this.querySelector('#aqi-canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
      canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    }

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  initializeCanvas() {
    const canvas = this.querySelector('#aqi-canvas');
    if (!canvas) return;

    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);

    // Set canvas size based on container
    this.resizeCanvas();

    // Initial render
    this.renderVisualization();
  }

  switchVisualization(vizType) {
    // Update active button
    const buttons = this.querySelectorAll('.viz-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viz === vizType);
    });

    this.currentVisualization = vizType;
    this.renderVisualization();
  }

  renderVisualization() {
    if (!this.renderer) return;

    const state = this.props.app?.state?.getState() || {};
    const { currentAQI, cigarettesEquivalent, currentPM25 } = state;

    if (!currentAQI && !cigarettesEquivalent) {
      this.renderEmptyState();
      return;
    }

    this.showLoading();

    switch (this.currentVisualization) {
      case 'cigarettes':
        this.renderCigaretteVisualization(cigarettesEquivalent || 0);
        break;
      case 'chart':
        this.renderChartVisualization();
        break;
      case 'particles':
        this.renderParticleVisualization(currentPM25 || 0);
        break;
      default:
        this.renderCigaretteVisualization(cigarettesEquivalent || 0);
    }

    this.hideLoading();
  }

  renderCigaretteVisualization(cigaretteCount) {
    if (!this.renderer) return;

    this.renderer.clear();

    // Create 3D cigarette visualization
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxCigarettes = Math.min(cigaretteCount, 50); // Cap for performance

    // Calculate grid layout
    const cigarettesPerRow = Math.ceil(Math.sqrt(maxCigarettes));
    const cigaretteSpacing = 40;
    const startX = centerX - (cigarettesPerRow * cigaretteSpacing) / 2;
    const startY = centerY - (cigarettesPerRow * cigaretteSpacing) / 2;

    for (let i = 0; i < maxCigarettes; i++) {
      const row = Math.floor(i / cigarettesPerRow);
      const col = i % cigarettesPerRow;

      const x = startX + col * cigaretteSpacing + row * 5; // 3D offset
      const y = startY + row * cigaretteSpacing - col * 3; // 3D offset

      this.renderer.draw3DCigarette(x, y, i, maxCigarettes);
    }

    // Add breathing animation
    if (!this.isAnimating) {
      this.startBreathingAnimation(maxCigarettes);
    }

    // Update info
    this.updateVisualizationInfo(cigaretteCount, 'cigarettes');
  }

  renderChartVisualization() {
    if (!this.renderer) return;

    this.renderer.clear();

    // Create mock historical data for demo
    const mockData = this.generateMockHistoricalData();
    this.renderer.drawAnimatedLineChart(mockData);

    // Add trend line
    this.renderer.drawTrendLine(mockData);

    this.updateVisualizationInfo('Historical Trend', 'chart');
  }

  renderParticleVisualization(pm25) {
    if (!this.renderer) return;

    this.renderer.clear();

    // Create particle system based on PM2.5 levels
    const particleCount = Math.min(Math.floor(pm25 / 5), 200); // Scale particles with PM2.5
    this.renderer.createParticleSystem(particleCount, pm25);

    if (!this.isAnimating) {
      this.startParticleAnimation();
    }

    this.updateVisualizationInfo(pm25, 'particles');
  }

  renderEmptyState() {
    if (!this.renderer) return;

    this.renderer.clear();
    this.renderer.drawEmptyState();
    this.updateVisualizationInfo('--', 'empty');
  }

  startBreathingAnimation(cigaretteCount) {
    this.isAnimating = true;
    let scale = 1;
    let direction = 1;

    const animate = () => {
      scale += direction * 0.005;

      if (scale > 1.05) direction = -1;
      if (scale < 0.95) direction = 1;

      this.renderer.applyBreathingEffect(scale);

      if (this.isAnimating) {
        this.animationId = requestAnimationFrame(animate);
      }
    };

    animate();
  }

  startParticleAnimation() {
    this.isAnimating = true;

    const animate = () => {
      this.renderer.updateParticles();

      if (this.isAnimating) {
        this.animationId = requestAnimationFrame(animate);
      }
    };

    animate();
  }

  updateVisualizationInfo(value, type) {
    const countElement = this.querySelector('#cigarette-count');
    const impactElement = this.querySelector('#health-impact');

    if (countElement) {
      switch (type) {
        case 'cigarettes':
          countElement.textContent = value;
          break;
        case 'particles':
          countElement.textContent = `${value} μg/m³`;
          break;
        case 'chart':
          countElement.textContent = value;
          break;
        default:
          countElement.textContent = '--';
      }
    }

    if (impactElement) {
      const state = this.props.app?.state?.getState() || {};
      const aqi = state.currentAQI || 0;

      if (aqi <= 50) impactElement.textContent = 'Minimal';
      else if (aqi <= 100) impactElement.textContent = 'Minor';
      else if (aqi <= 150) impactElement.textContent = 'Moderate';
      else if (aqi <= 200) impactElement.textContent = 'Serious';
      else impactElement.textContent = 'Severe';
    }
  }

  handleMouseMove(e) {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Show tooltip for interactive elements
    const tooltip = this.querySelector('.canvas-tooltip');
    if (tooltip) {
      const hit = this.renderer.getHitInfo(x, y);
      if (hit) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX - rect.left + 10}px`;
        tooltip.style.top = `${e.clientY - rect.top - 30}px`;
        tooltip.textContent = hit.tooltip;
      } else {
        tooltip.style.display = 'none';
      }
    }
  }

  handleMouseLeave() {
    const tooltip = this.querySelector('.canvas-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  handleCanvasClick(e) {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle clicks on interactive elements
    const hit = this.renderer.getHitInfo(x, y);
    if (hit && hit.clickable) {
      this.handleVisualizationClick(hit);
    }
  }

  handleVisualizationClick(hit) {
    // Handle different types of clicks based on visualization
    switch (this.currentVisualization) {
      case 'cigarettes':
        if (hit.type === 'cigarette') {
          this.showCigaretteDetails(hit.index);
        }
        break;
      case 'chart':
        if (hit.type === 'dataPoint') {
          this.showDataPointDetails(hit.data);
        }
        break;
    }
  }

  showCigaretteDetails(index) {
    // Show details about a specific cigarette
    const tooltip = this.querySelector('.canvas-tooltip');
    if (tooltip) {
      tooltip.innerHTML = `
        <strong>Cigarette #${index + 1}</strong><br>
        Each cigarette represents ~22μg/m³ of PM2.5<br>
        <small>Click to learn more about health impacts</small>
      `;
    }
  }

  showDataPointDetails(data) {
    // Show details about a data point
    const tooltip = this.querySelector('.canvas-tooltip');
    if (tooltip) {
      tooltip.innerHTML = `
        <strong>${new Date(data.timestamp).toLocaleString()}</strong><br>
        AQI: ${data.aqi}<br>
        PM2.5: ${data.pm25} μg/m³
      `;
    }
  }

  handleResize() {
    if (this.canvas) {
      this.resizeCanvas();
      this.renderVisualization();
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;

    const container = this.querySelector('.canvas-wrapper');
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = Math.min(rect.height, 400);

      if (this.renderer) {
        this.renderer.resize(this.canvas.width, this.canvas.height);
      }
    }
  }

  showLoading() {
    const loading = this.querySelector('.canvas-loading');
    if (loading) {
      loading.style.display = 'flex';
    }
  }

  hideLoading() {
    const loading = this.querySelector('.canvas-loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  generateMockHistoricalData() {
    const data = [];
    const now = Date.now();
    const hours = 24;

    for (let i = 0; i < hours; i++) {
      const timestamp = now - (hours - i) * 60 * 60 * 1000;
      const baseAQI = 50 + Math.sin(i / 4) * 30 + Math.random() * 20;
      const aqi = Math.max(0, Math.round(baseAQI));

      data.push({
        timestamp,
        aqi,
        pm25: Math.round(aqi * 0.5)
      });
    }

    return data;
  }

  update(changes) {
    super.update(changes);

    // Check if relevant state changed
    const relevantChanges = ['currentAQI', 'cigarettesEquivalent', 'currentPM25'];
    const hasRelevantChange = relevantChanges.some(key => changes[key]);

    if (hasRelevantChange) {
      this.renderVisualization();
    }
  }

  onUnmount() {
    super.onUnmount();

    // Stop animations
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Clean up renderer
    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}

