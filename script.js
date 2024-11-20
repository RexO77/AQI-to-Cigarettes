function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Function to fetch city suggestions from OpenWeatherMap Geocoding API
async function fetchCitySuggestions(query) {
    const limit = 5; // Number of suggestions to display
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error fetching city suggestions');
        }
        const data = await response.json();
        return data; // Returns an array of city objects
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Update the autocomplete setup function
function setupAutocomplete() {
    const input = document.getElementById('cityInput');
    const autocompleteList = document.getElementById('autocomplete-list');
    
    input.addEventListener('input', async function() {
        const query = this.value.trim();
        autocompleteList.innerHTML = '';
        
        if (!query) {
            autocompleteList.style.display = 'none';
            return;
        }

        const cities = await fetchCitySuggestions(query);

        if (cities.length > 0) {
            autocompleteList.style.display = 'block';
            cities.forEach(city => {
                const div = document.createElement('div');
                const cityName = `${city.name}, ${city.state ? city.state + ', ' : ''}${city.country}`;
                div.textContent = cityName;
                div.className = 'autocomplete-item';
                div.addEventListener('click', () => {
                    input.value = cityName;
                    input.dataset.lat = city.lat;
                    input.dataset.lon = city.lon;
                    autocompleteList.style.display = 'none';
                    fetchAQIData(city.lat, city.lon);
                });
                autocompleteList.appendChild(div);
            });
        } else {
            autocompleteList.style.display = 'none';
        }
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    const html = document.documentElement;

    setupAutocomplete();

    const systemTheme = getSystemTheme();
    html.setAttribute('data-theme', systemTheme);
    themeToggle.innerHTML = systemTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

    window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
            const newTheme = e.matches ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            themeToggle.innerHTML = newTheme === 'light' ? 
                '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        });

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

async function fetchAQIData(lat = null, lon = null) {
    const cityInput = document.getElementById('cityInput');
    const city = cityInput.value.trim();
    
    if (!city && (lat === null || lon === null)) {
        showResult('Please enter a city name', 'warning');
        return;
    }

    try {
        cityInput.classList.add('loading');

        if (lat === null || lon === null) {
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

            lat = geoData[0].lat;
            lon = geoData[0].lon;
        }

        // Fetch AQI data
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const aqiResponse = await fetch(aqiUrl);
        if (!aqiResponse.ok) {
            throw new Error('Error fetching AQI data');
        }
        const aqiData = await aqiResponse.json();

        // Process and display AQI data
        if (aqiData.list && aqiData.list.length > 0) {
            const components = aqiData.list[0].components;
            const pm25 = components.pm2_5;

            // Calculate AQI from PM2.5
            const aqiValue = calculateAQIFromPM25(pm25);
            document.getElementById('aqiInput').value = aqiValue;
            calculateCigarettes(aqiValue);
        } else {
            throw new Error('No AQI data available for this location');
        }

    } catch (error) {
        console.error(error);
        showResult(
            error.message === 'City not found'
                ? 'City not found. Please check the spelling and try again.'
                : 'Error fetching AQI data. Please try again later.',
            'warning'
        );
    } finally {
        cityInput.classList.remove('loading');
    }
}

// Linear scale helper function for AQI calculation
function linearScale(value, fromMin, fromMax, toMin, toMax) {
    return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
}

function calculateAQIFromPM25(pm25) {
    let aqi;
    if (pm25 <= 12.0) {
        aqi = linearScale(pm25, 0.0, 12.0, 0, 50);
    } else if (pm25 <= 35.4) {
        aqi = linearScale(pm25, 12.1, 35.4, 51, 100);
    } else if (pm25 <= 55.4) {
        aqi = linearScale(pm25, 35.5, 55.4, 101, 150);
    } else if (pm25 <= 150.4) {
        aqi = linearScale(pm25, 55.5, 150.4, 151, 200);
    } else if (pm25 <= 250.4) {
        aqi = linearScale(pm25, 150.5, 250.4, 201, 300);
    } else if (pm25 <= 500.4) {
        aqi = linearScale(pm25, 250.5, 500.4, 301, 500);
    } else {
        aqi = 500; // Maximum AQI value
    }
    return Math.round(aqi);
}

// Add enter key support
document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // Use latitude and longitude if available
        const lat = e.target.dataset.lat;
        const lon = e.target.dataset.lon;
        fetchAQIData(lat, lon);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    setupAutocomplete();
});