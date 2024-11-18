function calculateCigarettes() {
    const aqi = document.getElementById('aqiInput').value;
    const result = document.getElementById('result');

    if (aqi === '') {
        result.textContent = 'Please enter an AQI value.';
        return;
    }

    const cigarettes = (aqi / 22).toFixed(2);
    result.textContent = `The AQI value of ${aqi} is equivalent to smoking ${cigarettes} cigarettes per day.`;
}