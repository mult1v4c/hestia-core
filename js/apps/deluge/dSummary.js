import { fetchDeluge, formatBytes } from "./dCore.js";
import { ServiceError } from '../baseApp.js';
import { escapeHtml } from '../../utils.js';

export function initDeluge(el, config) {
    const { url, password } = config;
    const bodyEl = el.querySelector('.deluge-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="deluge-stats-row">
            <div class="d-stat">
                <i class="fa-solid fa-download text-green"></i>
                <span id="val-dl">--</span>
            </div>
            <div class="d-stat">
                <i class="fa-solid fa-upload text-blue"></i>
                <span id="val-ul">--</span>
            </div>
        </div>

        <div class="deluge-grid">
            <div class="d-card">
                <div class="d-label">DOWN</div>
                <div class="d-val text-green" id="count-down">0</div>
            </div>
            <div class="d-card">
                <div class="d-label">SEED</div>
                <div class="d-val text-blue" id="count-seed">0</div>
            </div>
            <div class="d-card">
                <div class="d-label">TOTAL</div>
                <div class="d-val" id="count-total">0</div>
            </div>
        </div>

        <div class="d-list-header">LATEST ACTIVITY</div>
        <div class="d-list" id="d-list">
            <div style="text-align:center; padding:10px; opacity:0.5;">Loading...</div>
        </div>
    `;

    // 2. Return Update Function
    return async () => {
        // Keys we need
        const keys = [
            "name", "state", "progress", "time_added"
        ];

        const connected = await fetchDeluge(url, 'web.connected', [], password);
        if (connected === false) throw new ServiceError('Web UI is reachable, but its daemon is disconnected. Connect a daemon in Deluge Connection Manager.', 'offline');
        if (connected !== true) throw new ServiceError('Invalid Deluge connection response.');
        const data = await fetchDeluge(url, 'web.update_ui', [keys, {}], password);

        if (!data || !data.torrents || typeof data.torrents !== 'object') throw new ServiceError('Deluge returned no torrent data. Check its daemon connection.');

        // --- A. Global Stats ---
        const stats = data.stats || {};
        el.querySelector('#val-dl').innerText = formatBytes(stats.download_rate || 0) + '/s';
        el.querySelector('#val-ul').innerText = formatBytes(stats.upload_rate || 0) + '/s';

        // --- B. Counts ---
        const torrents = Object.values(data.torrents);
        const total = torrents.length;
        const downloading = torrents.filter(t => t.state === 'Downloading').length;
        const seeding = torrents.filter(t => t.state === 'Seeding').length;

        el.querySelector('#count-total').innerText = total;
        el.querySelector('#count-down').innerText = downloading;
        el.querySelector('#count-seed').innerText = seeding;

        // --- C. Scrollable List ---
        const listEl = el.querySelector('#d-list');

        if (total > 0) {
            // Sort by time_added descending
            torrents.sort((a, b) => b.time_added - a.time_added);

            // Limit to top 50 to keep DOM light, but allow scrolling
            const topTorrents = torrents.slice(0, 50);

            let html = '';
            topTorrents.forEach(t => {
                const pct = Math.max(0, Math.min(100, Number(t.progress) || 0)).toFixed(1) + '%';
                let stateClass = 'text-muted';
                let barColor = 'var(--text-muted)';

                if (t.state === 'Downloading') { stateClass = 'text-green'; barColor = 'var(--green)'; }
                else if (t.state === 'Seeding') { stateClass = 'text-blue'; barColor = 'var(--blue)'; }
                else if (t.state === 'Error') { stateClass = 'text-red'; barColor = 'var(--red)'; }

                html += `
                    <div class="d-item">
                        <div class="d-item-row">
                            <div class="d-item-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</div>
                            <div class="d-item-pct">${pct}</div>
                        </div>
                        <div class="d-item-bar-bg">
                            <div class="d-item-bar-fill" style="width: ${pct}; background-color: ${barColor}"></div>
                        </div>
                        <div class="d-item-row meta">
                            <span class="${stateClass}">${escapeHtml(t.state)}</span>
                        </div>
                    </div>
                `;
            });

            // Only update DOM if it changed to prevent scroll jumping
            // (A simple length check helps, or just replacing it is fine for this scale)
            if (listEl.childElementCount !== topTorrents.length || listEl.innerHTML === '') {
                 listEl.innerHTML = html;
            } else {
                // If you want perfect scroll preservation, you'd patch it.
                // For now, replacing innerHTML is "okay" but might reset scroll if data changes.
                // Since this is a dashboard, usually just updating numbers is better,
                // but for a simple "Latest" list, full replace is acceptable for now.
                listEl.innerHTML = html;
            }
        } else {
            listEl.innerHTML = '<div style="text-align:center; padding:10px; opacity:0.5;">No torrents found</div>';
        }
    };
}
