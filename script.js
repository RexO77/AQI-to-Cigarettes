document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    const html = document.documentElement;

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
});

function calculateCigarettes() {
    const aqi = document.getElementById('aqiInput').value;
    const resultDiv = document.getElementById('result');
    const cigaretteVisual = document.querySelector('.cigarette-visual');

    if (aqi === '') {
        showResult('Please enter an AQI value.', 'warning');
        return;
    }

    const cigarettes = (aqi / 22).toFixed(2);
    let message = `The AQI value of ${aqi} is equivalent to smoking ${cigarettes} cigarettes per day.`;
    
    // Enhanced severity levels
    let severity;
    if (aqi <= 50) severity = 'good';
    else if (aqi <= 100) severity = 'moderate';
    else if (aqi <= 150) severity = 'unhealthy';
    else if (aqi <= 200) severity = 'very-unhealthy';
    else if (aqi <= 300) severity = 'hazardous';
    else if (aqi <= 500) severity = 'severe';
    else severity = 'extreme';

    // Add warning for extreme cases
    if (aqi > 500) {
        message += ' ⚠️ EXTREME HAZARD: Immediate health risk!';
    }

    showResult(message, severity);
    updateVisual(cigarettes);
}

function showResult(message, severity) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = ''; // Reset classes
    
    // Add styling based on severity
    resultDiv.classList.add(severity);
    resultDiv.classList.add('show');
    
    // Trigger animation
    resultDiv.style.animation = 'none';
    resultDiv.offsetHeight; // Trigger reflow
    resultDiv.style.animation = 'slideIn 0.5s ease forwards';
}

function updateVisual(cigarettes) {
    const visual = document.querySelector('.cigarette-visual');
    const cigaretteCount = Math.min(Math.ceil(cigarettes), 10);
    
    visual.innerHTML = '🚬'.repeat(cigaretteCount);
    visual.style.opacity = '0';
    visual.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        visual.style.opacity = '1';
        visual.style.transform = 'scale(1)';
    }, 100);
}

// Add input validation and real-time calculation
document.getElementById('aqiInput').addEventListener('input', (e) => {
    if (e.target.value > 500) {
        e.target.value = 500;
    }
    if (e.target.value < 0) {
        e.target.value = 0;
    }
});