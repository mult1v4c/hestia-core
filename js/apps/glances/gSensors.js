import { fetchGlances } from './gCore.js';
import { asList } from './gCore.js';
import { createSeriesGraph } from './gCore.js';

export function temperatureSamples(raw) {
    const seen = new Map();
    return asList(raw).filter(s => s && ['C', 'F'].includes(String(s.unit).replace('°', '').toUpperCase()) && s.value != null && Number.isFinite(Number(s.value))).map(s => {
        const label = [s.adapter || s.type, s.label].filter(Boolean).join(' / ') || 'Sensor';
        const count = seen.get(label) || 0;
        seen.set(label, count + 1);
        return { id: `${label}:${count}`, label: count ? `${label} (${count + 1})` : label,
            value: String(s.unit).toUpperCase().includes('F') ? (Number(s.value) - 32) * 5 / 9 : Number(s.value) };
    });
}

export function initSensors(el, config) {
    const body = el.querySelector('.glances-body');
    body.innerHTML = '<div class="series-widget"></div>';
    const update = createSeriesGraph(body.firstElementChild, { addCleanup: config.addCleanup, unit: '°C', floor: 100 });
    return async () => {
        const sensors = temperatureSamples(await fetchGlances(config.url, config.apiVer, 'sensors'));
        el.querySelector('.metric-title').textContent = 'TEMPS';
        el.querySelector('.metric-value').textContent = sensors.length ? `${sensors.length} sensors` : '—';
        update(sensors, value => `${value.toFixed(1)}°C`);
    };
}
