import { ServiceError } from '../baseApp.js';
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
        const legacy = /api\.php(?:\?|$)/.test(cleanBase);
        const targetUrl = legacy ? cleanBase : `${cleanBase}/stats/summary`;

        const data = await fetchPihole(targetUrl, legacy ? { summaryRaw: '', auth: token } : {}, token, legacy ? '' : cleanBase);

        // Update Metrics
        const queries = legacy ? { total: data.dns_queries_today, blocked: data.ads_blocked_today, percent_blocked: data.ads_percentage_today } : data.queries;
        if (queries?.total == null) throw new ServiceError('Pi-hole returned no statistics. Check API version and credentials.');
        el.querySelector('#val-total').innerText = formatNumber(queries.total);
        el.querySelector('#val-blocked').innerText = formatNumber(queries.blocked);

        const percent = parseFloat(queries.percent_blocked || 0).toFixed(1);
        el.querySelector('#val-percent').innerText = percent + '%';

        statusDot.className = 'ph-status-dot active';
        statusText.innerText = 'ONLINE';
    };
}