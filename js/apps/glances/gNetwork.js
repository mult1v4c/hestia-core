import { fetchGlances, drawGraph, HISTORY_SIZE, formatBytes } from "./gCore.js";

export function initNetwork(el, config) {
    const { url, apiVer, dataPoints } = config;
    const bodyEl = el.querySelector('.glances-body');
    let lastNet = null;

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="canvas-wrapper">
            <canvas class="glances-graph"></canvas>
            <div class="net-overlay">
                <div class="net-row"><i class="fa-solid fa-arrow-down"></i> <span id="net-rx">--</span></div>
                <div class="net-row"><i class="fa-solid fa-arrow-up"></i> <span id="net-tx">--</span></div>
            </div>
        </div>
        <div class="graph-meta"><span id="net-meta">RX: -- | TX: --</span></div>`;

    const canvas = el.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // Redraw Helper (Calculates dynamic scale for network)
    const redraw = () => {
        const peak = Math.max(...dataPoints);
        // Add 20% headroom, default 1KB minimum
        const maxVal = peak > 0 ? peak * 1.2 : 1024;
        drawGraph(canvas, ctx, dataPoints, '--yellow', maxVal);
    };

    // 2. Setup Resize Observer
    const wrapper = el.querySelector('.canvas-wrapper');
    if (wrapper) {
        new ResizeObserver(() => {
            canvas.width = wrapper.clientWidth;
            canvas.height = wrapper.clientHeight;
            redraw();
        }).observe(wrapper);
    }

    // 3. Return Update Function
    return async () => {
        const rawData = await fetchGlances(url, apiVer, 'network');
        const interfaces = Array.isArray(rawData) ? rawData : Object.values(rawData);

        let totalRx = 0;
        let totalTx = 0;

        interfaces.forEach(iface => {
            const rx = iface.rx !== undefined ? iface.rx : (iface.bytes_recv || 0);
            const tx = iface.tx !== undefined ? iface.tx : (iface.bytes_sent || 0);
            totalRx += rx;
            totalTx += tx;
        });

        const now = Date.now();

        if (lastNet) {
            const timeDiff = (now - lastNet.time) / 1000;
            if (timeDiff > 0) {
                const rxDiff = totalRx - lastNet.rx;
                const txDiff = totalTx - lastNet.tx;

                const rxSpeed = Math.max(0, rxDiff / timeDiff);
                const txSpeed = Math.max(0, txDiff / timeDiff);
                const totalSpeed = rxSpeed + txSpeed;

                titleEl.innerText = "NETWORK";
                valEl.innerText = formatBytes(totalSpeed) + '/s';

                // Update Overlay & Footer
                const rxEl = el.querySelector('#net-rx');
                const txEl = el.querySelector('#net-tx');
                if (rxEl) rxEl.innerText = formatBytes(rxSpeed) + '/s';
                if (txEl) txEl.innerText = formatBytes(txSpeed) + '/s';
                el.querySelector('#net-meta').innerText = `⬇ ${formatBytes(rxSpeed)} | ⬆ ${formatBytes(txSpeed)}`;

                // Update Graph
                dataPoints.push(totalSpeed);
                if (dataPoints.length > HISTORY_SIZE) dataPoints.shift();
                redraw();
            }
        } else {
            titleEl.innerText = "NETWORK";
            valEl.innerText = "Calc...";
        }

        lastNet = { rx: totalRx, tx: totalTx, time: now };
    };
}