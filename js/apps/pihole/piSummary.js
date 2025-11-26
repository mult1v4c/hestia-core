//
import { fetchPihole, formatNumber } from "./piCore.js";

export function initSummary(el, config) {
    const { url, token } = config;
    const bodyEl = el.querySelector('.pihole-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="ph-grid">
            <div class="ph-card queries">
                <div class="ph-label">QUERIES</div>
                <div class="ph-val" id="val-total">--</div>
            </div>
            <div class="ph-card blocked">
                <div class="ph-label">BLOCKED</div>
                <div class="ph-val" id="val-blocked">--</div>
            </div>
            <div class="ph-card percent">
                <div class="ph-label">RATIO</div>
                <div class="ph-val" id="val-percent">--%</div>
            </div>
        </div>
    `;

    const statusDot = el.querySelector('.ph-status-dot');
    const statusText = el.querySelector('.ph-status-text');

    // 2. Return Update Function
    return async () => {
        const cleanBase = url.endsWith('/') ? url.slice(0, -1) : url;
        const targetUrl = `${cleanBase}/stats/summary`;

        const data = await fetchPihole(targetUrl, {}, token, cleanBase);

        // Update Metrics
        const queries = data.queries || {};
        el.querySelector('#val-total').innerText = formatNumber(queries.total);
        el.querySelector('#val-blocked').innerText = formatNumber(queries.blocked);

        const percent = parseFloat(queries.percent_blocked || 0).toFixed(1);
        el.querySelector('#val-percent').innerText = percent + '%';

        statusDot.className = 'ph-status-dot active';
        statusText.innerText = 'ACTIVE';
    };
}