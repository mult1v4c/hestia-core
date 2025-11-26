import { fetchGlances } from "./gCore.js";

export function initProcess(el, config) {
    const { url, apiVer } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="proc-header">
            <div style="flex:1">NAME</div>
            <div style="width: 50px; text-align:right;">CPU</div>
            <div style="width: 50px; text-align:right;">MEM</div>
        </div>
        <div class="proc-list" id="proc-list">Scanning...</div>
    `;

    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // 2. Return Update Function
    return async () => {
        // Fetch data (endpoint is usually /processlist)
        const rawList = await fetchGlances(url, apiVer, 'processlist');
        let list = Array.isArray(rawList) ? rawList : Object.values(rawList || {});

        // Sort by CPU Descending
        list.sort((a, b) => b.cpu_percent - a.cpu_percent);

        // Take Top 10
        const top10 = list.slice(0, 10);

        // Update Header Stats
        titleEl.innerText = "TOP PROCESSES";
        valEl.innerText = list.length; // Total process count

        // Render List
        const grid = el.querySelector('#proc-list');
        grid.innerHTML = '';

        top10.forEach(p => {
            const cpu = p.cpu_percent.toFixed(1);
            const mem = p.memory_percent.toFixed(1);

            const row = document.createElement('div');
            row.className = 'proc-row';
            row.innerHTML = `
                <div class="p-name" title="${p.name}">${p.name}</div>
                <div class="p-val p-cpu">${cpu}%</div>
                <div class="p-val p-mem">${mem}%</div>
                <div class="p-bar" style="width: ${Math.min(p.cpu_percent, 100)}%"></div>
            `;
            grid.appendChild(row);
        });
    };
}