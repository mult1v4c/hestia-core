import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

export class WeatherApp extends BaseApp {
    async render(app) {
        const locationName = app.name !== "Untitled" ? app.name : "Local";
        return `
            <div class="app-content app-type-weather">
                <div class="weather-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>
                <div class="weather-row" style="display:none;">
                    <i class="weather-icon fa-solid fa-cloud"></i>
                    <div class="weather-info">
                        <div class="weather-temp">--°</div>
                        <div class="weather-loc">${locationName}</div>
                    </div>
                </div>
            </div>`;
    }

    async onMount(el, app) {
        const lat = app.data.lat || 51.5074;
        const lon = app.data.lon || -0.1278;

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await res.json();

            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;

            const iconMap = { 0: 'fa-sun', 1: 'fa-cloud-sun', 2: 'fa-cloud-sun', 3: 'fa-cloud', 45: 'fa-smog', 61: 'fa-cloud-rain', 80: 'fa-cloud-showers-heavy', 95: 'fa-bolt' };
            const iconClass = iconMap[code] || 'fa-cloud';

            el.querySelector('.weather-loading').style.display = 'none';
            const row = el.querySelector('.weather-row');
            row.style.display = 'flex';

            row.querySelector('.weather-temp').innerText = `${temp}°C`;
            row.querySelector('.weather-icon').className = `weather-icon fa-solid ${iconClass}`;

        } catch (err) {
            el.querySelector('.weather-loading').innerText = "N/A";
        }
    }
}

registry.register('weather', WeatherApp, {
    label: 'Weather',
    category: 'static',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        { name: 'lat', label: 'Latitude', type: 'text', placeholder: 'e.g. 51.50' },
        { name: 'lon', label: 'Longitude', type: 'text', placeholder: 'e.g. -0.12' }
    ],
    css: `
        .app-type-weather { justify-content: center; align-items: center; overflow: hidden; }
        .weather-row { display: flex; align-items: center; gap: 15px; }
        .weather-icon { font-size: 2.5rem; }
        .weather-info { display: flex; flex-direction: column; align-items: flex-start; }
        .weather-temp { font-size: 1.8rem; font-weight: bold; line-height: 1; }
        .weather-loc { font-size: 0.8rem; opacity: 0.7; margin-top: 2px; }
    `
});