function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    const html = document.documentElement;

    // Set initial theme based on system preference
    const systemTheme = getSystemTheme();
    html.setAttribute('data-theme', systemTheme);
    themeToggle.innerHTML = systemTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
            const newTheme = e.matches ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            themeToggle.innerHTML = newTheme === 'light' ? 
                '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        });

    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'light' ? 
            '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
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
    
    // Enhanced severity levels with no upper limit
    let severity;
    if (aqi <= 50) severity = 'good';
    else if (aqi <= 100) severity = 'moderate';
    else if (aqi <= 150) severity = 'unhealthy';
    else if (aqi <= 200) severity = 'very-unhealthy';
    else if (aqi <= 300) severity = 'hazardous';
    else if (aqi <= 500) severity = 'severe';
    else severity = 'extreme';

    // Add warning for extreme cases with more specific messages
    if (aqi > 500) {
        if (aqi > 1000) {
            message += ' ⚠️ CATASTROPHIC LEVELS: Severe and immediate health risk! Seek clean air immediately!';
        } else {
            message += ' ⚠️ EXTREME HAZARD: Immediate health risk!';
        }
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

// Update updateVisual function to handle larger numbers
function updateVisual(cigarettes) {
    const visual = document.querySelector('.cigarette-visual');
    // Increase max cigarettes shown and add a multiplier for extreme cases
    const maxCigarettes = 10;
    const cigaretteCount = Math.min(Math.ceil(cigarettes), maxCigarettes);
    
    let display = '🚬'.repeat(cigaretteCount);
    // Add multiplier text for large numbers
    if (cigarettes > maxCigarettes) {
        display += ` (${Math.floor(cigarettes/maxCigarettes)}x)`;
    }
    
    visual.innerHTML = display;
    visual.style.opacity = '0';
    visual.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        visual.style.opacity = '1';
        visual.style.transform = 'scale(1)';
    }, 100);
}

// Update the input validation
document.getElementById('aqiInput').addEventListener('input', (e) => {
    // Only check for negative values
    if (e.target.value < 0) {
        e.target.value = 0;
    }
});
// Theme toggle click handler
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;

async function fetchAQIData() {
    const cityInput = document.getElementById('cityInput');
    const city = cityInput.value.trim();
    
    if (!city) {
        showResult('Please enter a city name', 'warning');
        return;
    }

    try {
        cityInput.classList.add('loading');
        
        // Fetch geolocation data
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        if (!geoResponse.ok) {
            throw new Error('Error fetching geolocation data');
        }
        const geoData = await geoResponse.json();
        console.log('Geolocation Data:', geoData);

        if (!geoData.length) {
            throw new Error('City not found');
        }

        const { lat, lon } = geoData[0];

        // Fetch AQI data
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const aqiResponse = await fetch(aqiUrl);
        if (!aqiResponse.ok) {
            throw new Error('Error fetching AQI data');
        }
        const aqiData = await aqiResponse.json();
        console.log('AQI Data:', aqiData);

        // Process AQI data as needed

    } catch (error) {
        showResult(error.message === 'City not found' ? 
            'City not found. Please check the spelling and try again.' : 
            'Error fetching AQI data. Please try again later.', 'warning');
    } finally {
        cityInput.classList.remove('loading');
    }
}

// Add enter key support
document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchAQIData();
    }
});
