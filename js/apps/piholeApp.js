//
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { initSummary } from "./pihole/piSummary.js";

export class PiholeApp extends BaseApp {
    async render(app) {
        return `
            <div class="app-content app-type-pihole">
                <div class="pihole-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="https://wp-cdn.pi-hole.net/wp-content/uploads/2016/12/cropped-Vortex-R-32x32.png" style="width:16px;">
                        <span class="ph-title">PI-HOLE</span>
                    </div>
                    <div class="ph-status-wrapper">
                        <div class="ph-status-dot"></div>
                        <span class="ph-status-text">--</span>
                    </div>
                </div>
                <div class="pihole-body"></div>
            </div>`;
    }

    onMount(el, app) {
        const defaultUrl = '/pi-api/admin/api.php';
        const rawUrl = app.data.url || defaultUrl;
        const token = app.data.token || '';
        const intervalTime = parseInt(app.data.interval) || 5000;

        const config = { url: rawUrl, token };
        const updateLogic = initSummary(el, config);

        const runUpdate = async () => {
            if (!el.isConnected) return;
            try {
                if (updateLogic) await updateLogic();
            } catch (err) {
                console.error("[Pi-hole] Error:", err);
                const statusText = el.querySelector('.ph-status-text');
                if (statusText) statusText.innerText = "ERR";
            }
        };

        const timer = setInterval(runUpdate, intervalTime);
        runUpdate();
    }
}

registry.register('pihole', PiholeApp, {
    label: 'Pi-hole Stats',
    category: 'data',
    defaultSize: { cols: 2, rows: 1 }, // Default is now wider (Horizontal boxes)
    settings: [
        { name: 'url', label: 'API URL (Use /pi-api/...)', type: 'text', defaultValue: '/pi-api/admin/api.php' },
        { name: 'token', label: 'API Token / Password', type: 'text', placeholder: 'Web Interface Password' },
        { name: 'interval', label: 'Interval (ms)', type: 'text', defaultValue: '5000' }
    ],
    css: `
        .app-type-pihole {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
            padding: 10px; box-sizing: border-box;
            gap: 8px; background: inherit; color: inherit;
        }

        /* Header */
        .pihole-header {
            display: flex; justify-content: space-between; align-items: center;
            flex-shrink: 0;
            border-bottom: 1px solid var(--border-dim);
            padding-bottom: 6px; margin-bottom: 4px;
        }
        .ph-title { font-weight: bold; font-size: 0.8rem; letter-spacing: 1px; color: var(--text-main); }

        .ph-status-wrapper { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; }
        .ph-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); transition: all 0.3s; }
        .ph-status-dot.active { background: var(--status-success); box-shadow: 0 0 8px var(--status-success); }
        .ph-status-dot.disabled { background: var(--status-error); }
        .ph-status-text { font-weight: bold; color: var(--text-muted); }

        /* Body Grid */
        .pihole-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }

        .ph-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr; /* 3 Equal Columns */
            gap: 8px;
            height: 100%;
        }

        .ph-card {
            border: 1px solid transparent;
            border-radius: var(--radius);
            padding: 8px;
            display: flex; flex-direction: column; justify-content: space-between;
            position: relative; overflow: hidden;
        }

        /* Label Top-Left */
        .ph-label {
            font-size: 0.6rem; font-weight: bold;
            text-transform: uppercase; opacity: 0.8;
        }

        /* Value Bottom/Middle */
        .ph-val {
            font-size: 1.5rem; font-weight: bold; font-family: monospace;
            align-self: flex-end; /* Or center if you prefer */
        }

        /* --- COLORS & GRADIENTS --- */

        /* Queries: Green */
        .ph-card.queries {
            border-color: var(--status-success);
            background: linear-gradient(135deg, rgba(var(--status-success-rgb, 161, 181, 108), 0.15), rgba(var(--status-success-rgb, 161, 181, 108), 0.05));
            color: var(--status-success);
        }

        /* Blocked: Red */
        .ph-card.blocked {
            border-color: var(--status-error);
            background: linear-gradient(135deg, rgba(var(--status-error-rgb, 171, 70, 66), 0.15), rgba(var(--status-error-rgb, 171, 70, 66), 0.05));
            color: var(--status-error);
        }

        /* Ratio: Yellow */
        .ph-card.percent {
            border-color: var(--status-warning);
            background: linear-gradient(135deg, rgba(var(--status-warning-rgb, 247, 202, 136), 0.15), rgba(var(--status-warning-rgb, 247, 202, 136), 0.05));
            color: var(--status-warning);
        }

        /* Adaptive 1x1 */
        .app-card[data-cols="1"] .ph-grid { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr 1fr; }
        .app-card[data-cols="1"] .ph-val { font-size: 1.1rem; }
    `
});