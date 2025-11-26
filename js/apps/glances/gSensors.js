import { fetchGlances } from "./gCore.js";

export function initSensors(el, config) {
    const { url, apiVer } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `<div class="sensor-list" id="sensor-list">Scanning...</div>`;
    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // 2. Return Update Function
    return async () => {
        const rawSensors = await fetchGlances(url, apiVer, 'sensors');
        let sensors = Array.isArray(rawSensors) ? rawSensors : Object.values(rawSensors || {});

        // Filter weird units if needed
        if (sensors.length > 0 && sensors[0].unit !== 'C' && sensors[0].unit !== 'F') {
             sensors = sensors.filter(s => s.unit === 'C' || s.unit === 'F');
        }

        titleEl.innerText = "TEMPS";
        valEl.innerText = sensors.length > 0 ? sensors.length + " Active" : "--";

        const list = el.querySelector('#sensor-list');
        list.innerHTML = '';

        if (sensors.length > 0) {
            sensors.forEach(s => {
                let label = s.label || s.adapter || 'Unknown';
                if (label.startsWith('Package id')) label = 'Package';
                else if (label.startsWith('Core')) label = label.replace('Core ', 'Core');
                else if (label === 'Composite') label = 'CPU';
                else if (label.startsWith('acpitz')) label = 'Mobo ' + (label.split(' ')[1] || '');
                else if (label.startsWith('nvme')) label = 'SSD';

                const max = s.critical || 100;
                const warn = s.warning || 80;
                let percent = (s.value / max) * 100;
                if (percent > 100) percent = 100;

                let colorClass = 'default';
                if (s.value >= max) colorClass = 'critical';
                else if (s.value >= warn) colorClass = 'warning';

                const row = document.createElement('div');
                row.className = 'sensor-row';
                row.innerHTML = `
                    <div class="s-info">
                        <span class="s-name">${label}</span>
                        <span class="s-val ${colorClass}">${s.value.toFixed(0)}°</span>
                    </div>
                    <div class="s-bar-bg">
                        <div class="s-bar ${colorClass}" style="width: ${percent}%"></div>
                    </div>
                `;
                list.appendChild(row);
            });
        } else {
            list.innerHTML = '<div>No sensors found</div>';
        }
    };
}