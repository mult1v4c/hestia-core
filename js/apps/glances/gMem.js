import { fetchGlances, drawGraph, HISTORY_SIZE, formatBytes } from "./gCore.js";

export function initMem(el, config) {
    const { url, apiVer, dataPoints } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="canvas-wrapper"><canvas class="glances-graph"></canvas></div>
        <div class="graph-meta"><span id="mem-meta">-- / --</span></div>`;

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
            drawGraph(canvas, ctx, dataPoints, '--green');
        }).observe(wrapper);
    }

    // 3. Return Update Function
    return async () => {
        const mem = await fetchGlances(url, apiVer, 'mem');

        titleEl.innerText = "RAM USAGE";
        valEl.innerText = mem.percent.toFixed(1) + '%';

        const usedStr = formatBytes(mem.used);
        const totalStr = formatBytes(mem.total);
        el.querySelector('#mem-meta').innerText = `${usedStr} / ${totalStr}`;

        dataPoints.push(mem.percent);
        if (dataPoints.length > HISTORY_SIZE) dataPoints.shift();
        drawGraph(canvas, ctx, dataPoints, '--green');
    };
}