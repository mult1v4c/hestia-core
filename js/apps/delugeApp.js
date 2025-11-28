import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { initDeluge } from "./deluge/dSummary.js";

export class DelugeApp extends BaseApp {
    async render(app) {
        return `
            <div class="app-content app-type-deluge">
                <div class="deluge-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/8/85/Deluge-Logo.svg" style="width:16px;">
                        <span class="d-title">DELUGE</span>
                    </div>
                    <div class="d-status-wrapper">
                        <div class="d-status-dot"></div>
                        <span class="d-status-text">--</span>
                    </div>
                </div>
                <div class="deluge-body"></div>
            </div>`;
    }

    onMount(el, app) {
        const rawUrl = app.data.url || '/deluge-api/json';
        const password = app.data.password || '';
        const intervalTime = parseInt(app.data.interval) || 5000;

        const config = { url: rawUrl, password };
        const updateLogic = initDeluge(el, config);

        const statusDot = el.querySelector('.d-status-dot');
        const statusText = el.querySelector('.d-status-text');

        const runUpdate = async () => {
            if (!el.isConnected) return;
            try {
                if (updateLogic) await updateLogic();
                // Success State
                if (statusDot) statusDot.className = 'd-status-dot active';
                if (statusText) statusText.innerText = 'ONLINE';
            } catch (err) {
                console.error("[Deluge] Error:", err);
                // Error State
                if (statusDot) statusDot.className = 'd-status-dot disabled';
                if (statusText) statusText.innerText = 'ERR';
            }
        };

        const timer = setInterval(runUpdate, intervalTime);
        runUpdate();
    }
}

registry.register('deluge', DelugeApp, {
    label: 'Deluge Client',
    category: 'data',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'url', label: 'JSON-RPC URL', type: 'text', defaultValue: '/deluge-api/json' },
        { name: 'password', label: 'Web Password', type: 'text' },
        { name: 'interval', label: 'Interval (ms)', type: 'text', defaultValue: '3000' }
    ],
    css: `
        .app-type-deluge {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
            padding: 10px; box-sizing: border-box;
            gap: 5px; background: inherit; color: inherit;
        }

        .deluge-header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid var(--border-dim);
            padding-bottom: 6px; margin-bottom: 4px; flex-shrink: 0;
        }
        .d-title { font-weight: bold; font-size: 0.8rem; letter-spacing: 1px; }

        /* Status Styles */
        .d-status-wrapper { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; }
        .d-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); transition: all 0.3s; }
        .d-status-dot.active { background: var(--status-success); box-shadow: 0 0 8px var(--status-success); }
        .d-status-dot.disabled { background: var(--status-error); }
        .d-status-text { font-weight: bold; color: var(--text-muted); }

        .deluge-body { flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 0; }

        /* Row 1: Speeds */
        .deluge-stats-row {
            display: flex; justify-content: space-between;
            font-family: monospace; font-size: 0.9rem;
            background: rgba(0,0,0,0.15); padding: 5px 8px; border-radius: 4px;
            flex-shrink: 0;
        }
        .d-stat { display: flex; gap: 8px; align-items: center; }

        /* Row 2: Grid */
        .deluge-grid {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; flex-shrink: 0;
        }
        .d-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border-dim);
            border-radius: 4px; padding: 6px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .d-label { font-size: 0.6rem; color: var(--text-muted); font-weight: bold; margin-bottom: 2px; }
        .d-val { font-size: 1.1rem; font-weight: bold; }

        /* Row 3: Scrollable List */
        .d-list-header {
            font-size: 0.65rem; color: var(--text-muted); font-weight: bold;
            margin-top: 5px; border-bottom: 1px solid var(--border-dim);
            padding-bottom: 2px; flex-shrink: 0;
        }

        .d-list {
            flex: 1; min-height: 0;
            overflow-y: auto;
            display: flex; flex-direction: column; gap: 6px;
            padding-right: 2px;
        }
        .d-list::-webkit-scrollbar { width: 4px; }

        .d-item {
            background: rgba(0,0,0,0.1); border-radius: 4px; padding: 5px;
            border: 1px solid transparent;
        }
        .d-item:hover { background: rgba(255,255,255,0.05); }

        .d-item-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .d-item-name {
            font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            font-weight: bold; flex: 1;
        }
        .d-item-pct { font-size: 0.7rem; font-family: monospace; }

        .d-item-bar-bg {
            height: 3px; width: 100%; background: var(--bg-highlight);
            border-radius: 2px; overflow: hidden; margin: 3px 0;
        }
        .d-item-bar-fill { height: 100%; width: 0%; transition: width 0.3s; }

        .d-item-row.meta { font-size: 0.65rem; }
    `
});