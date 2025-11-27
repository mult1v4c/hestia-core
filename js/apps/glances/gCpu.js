// js/apps/glances/gCpu.js
import { fetchGlances, drawGraph, HISTORY_SIZE } from "./gCore.js";

export function initCpu(el, config) {
    const { url, apiVer, dataPoints } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM (Using new Overlay Structure)
    bodyEl.innerHTML = `
        <div class="canvas-wrapper">
            <canvas class="glances-graph"></canvas>
            <div class="glances-overlay" id="cpu-meta">--</div>
        </div>`;

    const canvas = el.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // 2. Setup Resize Observer
    const wrapper = el.querySelector('.canvas-wrapper');
    if (wrapper) {
        new ResizeObserver(() => {
            canvas.width = wrapper.clientWidth;
            canvas.height = wrapper.clientHeight;
            drawGraph(canvas, ctx, dataPoints, '--red');
        }).observe(wrapper);
    }

    // 3. Return Update Function
    return async () => {
        const [cpu, core] = await Promise.all([
            fetchGlances(url, apiVer, 'cpu'),
            fetchGlances(url, apiVer, 'core').catch(() => null)
        ]);

        titleEl.innerText = "CPU LOAD";
        valEl.innerText = cpu.total.toFixed(1) + '%';

        let metaText = "C: ?";

        if (core && core.phys && core.log) {
            metaText = `C: ${core.phys} | T: ${core.log}`;
        } else if (cpu.cpucore) {
            metaText = `CPU: ${cpu.cpucore}`;
        }

        el.querySelector('#cpu-meta').innerText = metaText;

        dataPoints.push(cpu.total);
        if (dataPoints.length > HISTORY_SIZE) dataPoints.shift();
        drawGraph(canvas, ctx, dataPoints, '--red');
    };
}

export function initPerCpu(el, config) {
    // ... (This function remains unchanged as it has its own grid layout) ...
    const { url, apiVer } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `<div class="cpu-grid" id="cpu-grid">Scanning...</div>`;

    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // State for history: Array of Arrays
    // coresHistory[0] = [10, 12, 15...] for Core 0
    let coresHistory = [];

    // 2. Return Update Function
    return async () => {
        // Fetch per-core data
        const raw = await fetchGlances(url, apiVer, 'percpu');
        const cores = Array.isArray(raw) ? raw : Object.values(raw || {});

        // Update Header
        titleEl.innerText = "CORE LOAD";
        const avgLoad = cores.reduce((acc, c) => acc + c.total, 0) / (cores.length || 1);
        valEl.innerText = avgLoad.toFixed(1) + '%';

        const grid = el.querySelector('#cpu-grid');

        // Initialize DOM if needed (first run or core count change)
        if (grid.childElementCount !== cores.length) {
            grid.innerHTML = '';
            coresHistory = [];

            cores.forEach(c => {
                // Initialize history for this core with empty data
                coresHistory.push(new Array(HISTORY_SIZE).fill(0));

                const cell = document.createElement('div');
                cell.className = 'core-graph-cell';
                cell.innerHTML = `
                    <canvas></canvas>
                    <div class="core-meta">
                        <span class="c-id">#${c.cpu_number}</span>
                        <span class="c-val">--%</span>
                    </div>
                `;
                grid.appendChild(cell);
            });
        }

        // Update Data & Draw Each Cell
        cores.forEach((c, i) => {
            const val = c.total;
            const cell = grid.children[i];
            if (!cell) return;

            // Update Text
            cell.querySelector('.c-val').innerText = val.toFixed(0) + '%';

            // Determine Color based on load
            // let colorVar = '--status-success'; // Green
            // if (val > 80) colorVar = '--status-error'; // Red
            // else if (val > 50) colorVar = '--status-warning'; // Orange

            // Update History
            if (!coresHistory[i]) coresHistory[i] = new Array(HISTORY_SIZE).fill(0);
            coresHistory[i].push(val);
            if (coresHistory[i].length > HISTORY_SIZE) coresHistory[i].shift();

            // Draw Graph
            const canvas = cell.querySelector('canvas');
            const ctx = canvas.getContext('2d');

            // Auto-resize canvas to fit cell (important for grid fluidity)
            if (canvas.width !== cell.clientWidth || canvas.height !== cell.clientHeight) {
                 canvas.width = cell.clientWidth;
                 canvas.height = cell.clientHeight;
            }

            drawGraph(canvas, ctx, coresHistory[i], '--red');
        });
    };
}