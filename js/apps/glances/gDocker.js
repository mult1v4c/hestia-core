import { escapeHtml } from '../../utils.js';
//
import { fetchGlances } from "./gCore.js";

export function initDocker(el, config) {
    const { url, apiVer } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `<div class="docker-grid" id="docker-grid">Scanning...</div>`;

    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // 2. Return Update Function
    return async () => {
        let containers = [];

        try {
            // Primary endpoint
            containers = await fetchGlances(url, apiVer, 'containers');
        } catch (e) {
            if (e.status !== 404) throw e;
            // Fallback logic
            try {
                containers = await fetchGlances(url, apiVer, 'docker');
            } catch (err2) {
                if (err2.status !== 404) throw err2;
                try {
                    containers = await fetchGlances(url, apiVer, 'docker/containers');
                } catch (err3) {
                    throw err3;
                }
            }
        }

        // Handle array vs object response
        let list = Array.isArray(containers) ? containers : Object.values(containers || {});

        // --- NEW: SORT ALPHABETICALLY ---
        // We sort the raw list before rendering so they stay in place
        list.sort((a, b) => {
            // Normalize names for comparison (same logic as render)
            let nameA = a.name || a.Name || a.Image || 'Unknown';
            if (nameA.startsWith('/')) nameA = nameA.substring(1);

            let nameB = b.name || b.Name || b.Image || 'Unknown';
            if (nameB.startsWith('/')) nameB = nameB.substring(1);

            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        });
        // --------------------------------

        // Update Header
        titleEl.innerText = "CONTAINERS";
        const isRunning = (c) => (c.Status === 'running' || c.State === 'running' || c.status === 'running');
        const runningCount = list.filter(isRunning).length;
        valEl.innerText = `${runningCount} / ${list.length}`;

        // Render Grid
        const grid = el.querySelector('#docker-grid');
        grid.innerHTML = '';

        if (list.length > 0) {
            list.forEach(c => {
                let name = c.name || c.Name || c.Image || 'Unknown';
                if (name.startsWith('/')) name = name.substring(1);

                const status = (c.Status || c.State || c.status || '').toLowerCase();

                const cpuValue = c.cpu_percent ?? c.cpu?.total;
                const cpu = cpuValue != null ? Number(cpuValue).toFixed(1) + '%' : '';
                const memValue = c.memory_usage ?? c.memory?.usage;
                const mem = memValue != null ? (Number(memValue) / 1024 / 1024).toFixed(0) + 'MB' : '';

                let statusClass = 'stopped';
                if (status === 'running') statusClass = 'running';
                else if (status === 'paused') statusClass = 'paused';

                const card = document.createElement('div');
                card.className = `docker-card ${statusClass}`;

                const statsHtml = (cpu || mem) ? `<div class="d-stats">${cpu} ${mem ? '| ' + mem : ''}</div>` : '';

                card.innerHTML = `
                    <div class="d-status-dot"></div>
                    <div class="d-info">
                        <div class="d-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
                        ${statsHtml}
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<div style="text-align:center; opacity:0.6; margin-top:10px;">No containers found</div>';
        }
    };
}