import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { HISTORY_SIZE } from "./glances/gCore.js";
import { initCpu } from "./glances/gCpu.js";
import { initMem } from "./glances/gMem.js";
import { initNetwork } from "./glances/gNetwork.js";
import { initSensors } from "./glances/gSensors.js";

export class GlancesApp extends BaseApp {
    async render(app) {
        // Generic shell
        return `
            <div class="app-content app-type-glances">
                <div class="glances-header">
                    <span class="metric-title">LOADING</span>
                    <span class="metric-value">...</span>
                </div>
                <div class="glances-body"></div>
            </div>`;
    }

    onMount(el, app) {
        // 1. Settings & Sanitization
        let rawUrl = app.data.url || 'http://localhost:61208';
        const url = rawUrl.replace(/\/+$/, '').replace(/\/api\/\d+$/, '');
        const metric = app.data.metric || 'cpu';
        const apiVer = app.data.apiVer || '3';
        const intervalTime = parseInt(app.data.interval) || 2000;

        // 2. State
        const dataPoints = new Array(HISTORY_SIZE).fill(0);
        let isRunning = true;
        let updateLogic = null; // Will hold the module function

        // 3. Initialize Specific Module
        const config = { url, apiVer, dataPoints };

        if (metric === 'cpu') updateLogic = initCpu(el, config);
        else if (metric === 'mem') updateLogic = initMem(el, config);
        else if (metric === 'net') updateLogic = initNetwork(el, config);
        else if (metric === 'sensors') updateLogic = initSensors(el, config);

        // 4. Main Loop
        const runUpdate = async () => {
            if (!isRunning || !el.isConnected) return;
            try {
                if (updateLogic) await updateLogic();
            } catch (err) {
                console.error("[Glances] Error:", err);
                const titleEl = el.querySelector('.metric-title');
                const valEl = el.querySelector('.metric-value');
                if (titleEl) titleEl.innerText = "ERROR";
                if (valEl) valEl.innerText = err.message.includes('404') ? "404" : "OFFLINE";
            }
        };

        const timer = setInterval(runUpdate, intervalTime);
        runUpdate(); // Initial run
    }
}

registry.register('glances', GlancesApp, {
    label: 'Glances Monitor',
    category: 'data',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'url', label: 'Glances URL', type: 'text', defaultValue: 'http://localhost:61208' },
        {
            name: 'apiVer',
            label: 'API Version',
            type: 'select',
            defaultValue: '4',
            options: [
                { label: 'v3 (Standard)', value: '3' },
                { label: 'v2 (Legacy)', value: '2' },
                { label: 'v4 (Latest)', value: '4' }
            ]
        },
        {
            name: 'metric',
            label: 'Mode',
            type: 'select',
            defaultValue: 'cpu',
            options: [
                { label: 'CPU (Graph)', value: 'cpu' },
                { label: 'Memory (Graph)', value: 'mem' },
                { label: 'Network (Graph)', value: 'net' },
                { label: 'Temperatures (List)', value: 'sensors' }
            ]
        },
        { name: 'interval', label: 'Interval (ms)', type: 'text', defaultValue: '2000' }
    ],
    css: `
        .app-type-glances {
            display: flex; flex-direction: column;
            padding: 15px; box-sizing: border-box;
            width: 100%; height: 100%;
            overflow: hidden;
            gap: 5px;
        }
        .glances-header { display: flex; justify-content: space-between; align-items: baseline; flex-shrink: 0; }
        .metric-title { font-size: 0.8rem; font-weight: bold; color: var(--text-muted); }
        .metric-value { font-size: 1.4rem; font-weight: bold; font-family: monospace; color: var(--text-main); }

        /* BODY CONTAINER */
        .glances-body {
            flex: 1;
            min-height: 0; /* CRITICAL for flex scrolling */
            position: relative;
            display: flex;
            flex-direction: column;
        }

        /* GRAPH STYLES (CPU, MEM, NET) */
        .canvas-wrapper {
            flex: 1;
            width: 100%;
            min-height: 0;
            position: relative;
        }
        .glances-graph {
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            height: 100%;
        }
        .graph-meta, .cpu-meta {
            font-size: 0.75rem; color: var(--text-muted);
            text-align: right; margin-top: 2px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            flex-shrink: 0; /* Prevent squishing the footer */
        }

        /* NETWORK OVERLAY */
        .net-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column; justify-content: center;
            padding-left: 10px; z-index: 5; pointer-events: none;
        }
        .net-row { display: flex; align-items: center; gap: 15px; font-size: 1.1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        .net-row i { width: 20px; text-align: center; color: var(--yellow); }

        /* SENSORS (New Scrollable Logic) */
        .sensor-list {
            overflow-y: auto;
            display: flex; flex-direction: column;
            gap: 6px; padding-right: 5px;
            flex: 1; /* Fill remaining height */
            min-height: 0; /* Allow it to shrink if container is small */
        }
        .sensor-row {
            display: flex; flex-direction: column; gap: 2px;
            font-size: 0.85rem;
            flex-shrink: 0; /* Don't squash individual rows */
        }
        .s-info { display: flex; justify-content: space-between; }
        .s-name { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s-val { font-weight: bold; font-family: monospace; }

        .s-bar-bg { width: 100%; height: 4px; background: var(--bg-highlight); border-radius: 2px; overflow: hidden; }
        .s-bar { height: 100%; transition: width 0.5s; }

        .s-bar.default { background-color: var(--text-muted); }
        .s-bar.warning { background-color: var(--status-warning); }
        .s-bar.critical { background-color: var(--status-error); }
        .s-val.warning { color: var(--status-warning); }
        .s-val.critical { color: var(--status-error); }

        /* ADAPTIVE LOGIC (1x1 Mode) */
        .app-card[data-cols="1"] .metric-title { font-size: 0.7rem; }
        .app-card[data-cols="1"] .metric-value { font-size: 1.1rem; }

        /* Hide Footer on small cards */
        .app-card[data-cols="1"] .graph-meta,
        .app-card[data-rows="1"] .graph-meta { display: none; }

        .app-card[data-cols="1"] .net-row { font-size: 0.9rem; gap: 5px; }

        /* Compact Sensors for 1x1 */
        .app-card[data-cols="1"] .sensor-list { gap: 4px; }
        .app-card[data-cols="1"] .sensor-row { font-size: 0.7rem; }
        .app-card[data-cols="1"] .s-bar-bg { height: 3px; }
    `
});