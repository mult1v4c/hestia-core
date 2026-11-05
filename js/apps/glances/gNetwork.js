import { fetchGlances, drawGraph, HISTORY_SIZE, formatBytes } from './gCore.js';
import { sampleRate, asList } from './gCore.js';

export function initNetwork(el, config) {
    const { url, apiVer, dataPoints } = config;
    const body = el.querySelector('.glances-body');
    body.innerHTML = '<div class="canvas-wrapper"><canvas class="glances-graph"></canvas><div class="glances-overlay" id="net-meta">--</div></div>';
    const wrapper = body.firstElementChild;
    const canvas = wrapper.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const redraw = () => drawGraph(canvas, ctx, dataPoints, '--yellow', Math.max(1024, ...dataPoints) * 1.2);
    const observer = new ResizeObserver(() => {
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        redraw();
    });
    observer.observe(wrapper);
    config.addCleanup?.(() => observer.disconnect());
    return async () => {
        const interfaces = asList(await fetchGlances(url, apiVer, 'network'));
        let totalRx = 0, totalTx = 0, available = false;
        interfaces.filter(iface => iface.interface_name !== 'lo').forEach(iface => {
            const rx = sampleRate(iface, 'bytes_recv');
            const tx = sampleRate(iface, 'bytes_sent');
            if (rx != null || tx != null) available = true;
            totalRx += rx || 0;
            totalTx += tx || 0;
        });
        el.querySelector('.metric-title').textContent = 'NETWORK';
        el.querySelector('.metric-value').textContent = available ? formatBytes(totalRx + totalTx) + '/s' : '—';
        el.querySelector('#net-meta').textContent = available ? `RX ${formatBytes(totalRx)}/s | TX ${formatBytes(totalTx)}/s` : 'Waiting for rate samples';
        dataPoints.push(available ? totalRx + totalTx : 0);
        if (dataPoints.length > HISTORY_SIZE) dataPoints.shift();
        redraw();
    };
}
