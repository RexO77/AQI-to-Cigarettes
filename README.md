# AQI to Cigarettes Calculator 🌍🚬

A sleek, interactive web application that converts Air Quality Index (AQI) values into equivalent daily cigarettes smoked, helping users understand air pollution impact in familiar terms.

## Features 🌟

- **City Search**: Auto-complete city search with OpenWeatherMap API integration
- **Real-time AQI Data**: Fetches current air quality data for any searched location
- **Manual Input**: Option to manually enter AQI values
- **Visual Feedback**: 
    - Dynamic cigarette emoji visualization
    - Color-coded severity levels
    - Animated warnings for extreme conditions
- **Responsive Design**: Works seamlessly on all devices
- **Dark/Light Theme**: Automatic system theme detection with manual toggle

## AQI Severity Levels 📊

- 0-50: Good (Green)
- 51-100: Moderate (Yellow)
- 101-150: Unhealthy (Red)
- 151-200: Very Unhealthy (Dark Red)
- 201-300: Hazardous (Purple)
- 301-500: Severe (Dark Red)
- 500+: Extreme (Very Dark Red with Pulsing Animation)

## Technical Details 🛠️

- **Frontend**: Pure HTML, CSS, and JavaScript
- **APIs**: OpenWeatherMap (Geocoding and Air Pollution data)
- **Animations**: CSS transitions and keyframes
- **Responsive**: Mobile-first design approach
- **Accessibility**: High contrast themes and intuitive UI

## Setup 🚀

1. Clone the repository
2. Replace `API_KEY` in `script.js` with your OpenWeatherMap API key
3. Open `index.html` in a browser

## Dependencies 📦

- Font Awesome 6.0.0
- Google Fonts (Poppins)

## Browser Support 🌐

Compatible with all modern browsers supporting ES6+ features.

## License 📄

MIT License
