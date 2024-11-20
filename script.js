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

function calculateCigarettes(aqi = null) {
    const manualAqi = document.getElementById('aqiInput').value;
    const aqiValue = aqi !== null ? aqi : manualAqi;
    const resultDiv = document.getElementById('result');
    const cigaretteVisual = document.querySelector('.cigarette-visual');

    if (!aqiValue) {
        showResult('Please enter an AQI value or search for a city.', 'warning');
        return;
    }

    const cigarettes = (aqiValue / 22).toFixed(2);
    let message = `The AQI value of ${aqiValue} is equivalent to smoking ${cigarettes} cigarettes per day.`;
    
    let severity;
    if (aqiValue <= 50) severity = 'good';
    else if (aqiValue <= 100) severity = 'moderate';
    else if (aqiValue <= 150) severity = 'unhealthy';
    else if (aqiValue <= 200) severity = 'very-unhealthy';
    else if (aqiValue <= 300) severity = 'hazardous';
    else if (aqiValue <= 500) severity = 'severe';
    else severity = 'extreme';

    if (aqiValue > 500) {
        if (aqiValue > 1000) {
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
    resultDiv.className = ''; 
    resultDiv.classList.add(severity);
    resultDiv.classList.add('show');
    resultDiv.style.animation = 'none';
    resultDiv.offsetHeight;
    resultDiv.style.animation = 'slideIn 0.5s ease forwards';
}

function updateVisual(cigarettes) {
    const visual = document.querySelector('.cigarette-visual');
    const maxCigarettes = 10;
    const cigaretteCount = Math.min(Math.ceil(cigarettes), maxCigarettes);
    
    let display = '🚬'.repeat(cigaretteCount);
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

document.getElementById('aqiInput').addEventListener('input', (e) => {
    if (e.target.value < 0) {
        e.target.value = 0;
    }
});

const API_KEY = '7f74765aaa2a9fb00ac8e6262e582771';

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

        // Process and display AQI data
        if (aqiData.list && aqiData.list.length > 0) {
            const aqi = aqiData.list[0].main.aqi * 50; // Convert to AQI scale
            document.getElementById('aqiInput').value = aqi; // Update input field
            calculateCigarettes(aqi);
        } else {
            throw new Error('No AQI data available for this location');
        }

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