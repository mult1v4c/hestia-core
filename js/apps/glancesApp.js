//
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { HISTORY_SIZE } from "./glances/gCore.js";
import { initCpu } from "./glances/gCpu.js";
import { initMem } from "./glances/gMem.js";
import { initNetwork } from "./glances/gNetwork.js";
import { initSensors } from "./glances/gSensors.js";
import { initDisk } from "./glances/gDisk.js";
import { initDocker } from "./glances/gDocker.js";
import { initProcess } from "./glances/gProcess.js";

export class GlancesApp extends BaseApp {
    async render(app) {
        // We use the same structure as the Note/Calendar apps
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
        else if (metric === 'disk') updateLogic = initDisk(el, config);
        else if (metric === 'docker') updateLogic = initDocker(el,config);
        else if (metric === 'process') updateLogic = initProcess(el, config);

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
                { label: 'Disk I/O & Usage', value: 'disk' },
                { label: 'Docker Containers', value: 'docker' },
                { label: 'Top Processes', value: 'process' },
                { label: 'Temperatures (List)', value: 'sensors' }
            ]
        },
        { name: 'interval', label: 'Interval (ms)', type: 'text', defaultValue: '2000' }
    ],
    css: `
        .app-type-glances {
            /* 1. POSITIONING (Like NoteApp) - Prevents Grid Movement */
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1;

            /* 2. LAYOUT - Internal Flow */
            display: flex;
            flex-direction: column;
            padding: 10px;
            box-sizing: border-box;
            overflow: hidden;
            gap: 5px;
            background: inherit;
            color: inherit;
        }

        /* --- HEADER --- */
        .glances-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            flex-shrink: 0; /* Never shrink */
            width: 100%;
        }
        .metric-title {
            font-size: 0.75rem;
            font-weight: bold;
            color: var(--text-muted);
            text-transform: uppercase;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .metric-value {
            font-size: 1.2rem;
            font-weight: bold;
            font-family: monospace;
            color: var(--text-main);
            margin-left: 10px;
        }

        /* --- BODY CONTAINER --- */
        .glances-body {
            flex: 1; /* Occupy all remaining space */
            width: 100%;
            min-height: 0; /* Allow shrinking */
            position: relative;
            display: flex;
            flex-direction: column;
        }

        /* --- MODULES (Graph/Sensors) --- */
        .canvas-wrapper {
            flex: 1;
            width: 100%;
            min-height: 0;
            position: relative;
        }
        .glances-graph {
            width: 100% !important;
            height: 100% !important;
        }

        /* Footer Meta */
        .graph-meta, .cpu-meta {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-align: right;
            margin-top: 10px;
            white-space: nowrap;
            flex-shrink: 0;
        }

        /* --- GRAPH & IO --- */
        .canvas-wrapper {
            width: 100%; position: relative; overflow: hidden;
            flex: 1; /* Default for CPU/Mem (grows to fill) */
        }

        /* --- DISK SPECIFIC LAYOUT (Fixed Height) --- */
        .disk-header-section {
            position: relative; overflow: hidden;
            width: 100%;
            height: 100px; /* FIXED HEIGHT */
            flex-shrink: 0; /* Never shrinks, prevents jumping */
            border-bottom: 1px solid var(--border-dim);
            margin-bottom: 5px;
        }

        .glances-graph { width: 100% !important; height: 100% !important; }

        .disk-io-overlay {
            position: absolute; bottom: 2px; right: 2px;
            font-size: 0.7rem; color: var(--text-muted);
            display: flex; gap: 8px; font-family: monospace;
            background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px;
            pointer-events: none;
        }

        /* --- DISK GRID (Pie Charts) --- */
        .disk-grid {
            flex: 1; /* Take ALL remaining vertical space */
            display: grid;
            /* Cols: Fit as many as possible, min 130px wide */
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            /* Rows: Min 60px, but stretch (1fr) to fill vertical space equally */
            grid-auto-rows: minmax(60px, 1fr);
            gap: 5px;
            overflow-y: auto;
            min-height: 0;
        }
        .disk-grid::-webkit-scrollbar { width: 0; }

        .disk-card {
            display: flex; align-items: center; gap: 8px;
            background: rgba(0,0,0,0.15);
            border: 1px solid var(--border-dim);
            border-radius: var(--radius);
            padding: 5px 10px;
            /* Center content in the stretched card */
            justify-content: center;
        }

        .disk-pie-wrapper {
            position: relative; width: 40px; height: 40px; flex-shrink: 0;
            display: flex; justify-content: center; align-items: center;
        }
        .disk-pie-wrapper canvas { width: 40px; height: 40px; }
        .disk-percent {
            position: absolute; font-size: 0.6rem; font-weight: bold; color: var(--text-main);
        }

        .disk-info {
            min-width: 0; display: flex; flex-direction: column; justify-content: center;
        }
        .disk-name {
            font-size: 0.8rem; font-weight: bold; color: var(--text-main);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .disk-meta {
            font-size: 0.65rem; color: var(--text-muted);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Network Overlay */
        .net-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        .net-row i { width: 14px; text-align: center; color: var(--yellow); }

        /* Sensors List */
        .sensor-list {
            flex: 1; /* Stretch to fill */
            display: flex; flex-direction: column;
            overflow-y: auto; /* Scroll ONLY if absolutely necessary */
            gap: 4px; padding-right: 2px;
        }

        .sensor-list::-webkit-scrollbar { width: 0; } /* Hide scrollbar for cleaner look */

        .sensor-row {
            display: flex; flex-direction: column; gap: 2px;
            font-size: 0.8rem;
            flex-shrink: 0;
        }
        .s-info { display: flex; justify-content: space-between; width: 100%; }
        .s-name { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
        .s-val { font-weight: bold; font-family: monospace; }
        .s-bar-bg { width: 100%; height: 4px; background: var(--bg-highlight); border-radius: 2px; overflow: hidden; }
        .s-bar { height: 100%; transition: width 0.5s; }

        /* Colors */
        .s-bar.default { background-color: var(--text-muted); }
        .s-bar.warning { background-color: var(--status-warning); }
        .s-bar.critical { background-color: var(--status-error); }
        .s-val.warning { color: var(--status-warning); }
        .s-val.critical { color: var(--status-error); }

        /* --- ADAPTIVE (1x1) --- */
        .app-card[data-cols="1"] .metric-title { font-size: 0.65rem; }
        .app-card[data-cols="1"] .metric-value { font-size: 1.0rem; }
        .app-card[data-cols="1"] .s-bar-bg { height: 2px; }
        .app-card[data-cols="1"] .sensor-row { font-size: 0.7rem; }

        /* --- SENSORS GRID --- */
        .sensor-grid {
            flex: 1;
            display: grid;
            /* Auto-fit columns: Min 100px wide, Max 1fr (stretch to fill) */
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            /* Auto rows: Start at 60px height */
            grid-auto-rows: minmax(60px, 1fr);
            gap: 5px;
            overflow-y: auto;
            width: 100%;
            align-content: start; /* Don't stretch rows if there are few items */
        }

        /* Hide Scrollbar */
        .sensor-grid::-webkit-scrollbar { width: 0; }

        .sensor-box {
            background: rgba(0,0,0,0.15);
            border: 1px solid var(--border-dim);
            border-radius: var(--radius);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 5px;
            transition: all 0.2s;
        }

        /* Name (Upper Left) */
        .sb-name {
            position: absolute;
            top: 4px; left: 6px;
            font-size: 0.6rem;
            color: var(--text-muted);
            font-weight: bold;
            text-transform: uppercase;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            max-width: 90%;
        }

        /* Temp (Center Big) */
        .sb-temp {
            font-size: 1.4rem;
            font-weight: bold;
            font-family: monospace;
            margin-top: 10px; /* Offset slightly for the label */
        }

        /* Color Logic */
        .sensor-box.normal { color: var(--status-success); }

        .sensor-box.warning {
            border-color: var(--status-warning);
            color: var(--status-warning);
            background: rgba(var(--status-warning), 0.05);
        }
        .sensor-box.warning .sb-name { color: var(--status-warning); opacity: 0.8; }

        .sensor-box.critical {
            border-color: var(--status-error);
            color: var(--status-error);
            background: rgba(var(--status-error), 0.1);
        }
        .sensor-box.critical .sb-name { color: var(--status-error); opacity: 0.8; }
        .sensor-box.critical .sb-temp { animation: pulse-text 1s infinite; }

        /* Adaptive 1x1 or Very Small */
        .app-card[data-cols="1"] .metric-title { font-size: 0.65rem; }
        .app-card[data-cols="1"] .metric-value { font-size: 1.0rem; }

        @keyframes pulse-text {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        /* --- DOCKER SPECIFIC --- */
        .docker-grid {
            flex: 1;
            display: grid;
            /* Cards are slightly larger than sensors */
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            grid-auto-rows: minmax(45px, 1fr);
            gap: 5px;
            overflow-y: auto;
            min-height: 0;
            align-content: start;
        }
        .docker-grid::-webkit-scrollbar { width: 0; }

        .docker-card {
            background: rgba(0,0,0,0.15);
            border: 1px solid var(--border-dim);
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            padding: 5px 10px;
            gap: 10px;
            transition: all 0.2s;
        }

        .d-status-dot {
            width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
            background: var(--text-muted);
            box-shadow: 0 0 5px currentColor;
        }
        .docker-card.running .d-status-dot { color: var(--status-success); background: currentColor; }
        .docker-card.paused .d-status-dot { color: var(--status-warning); background: currentColor; }
        .docker-card.stopped .d-status-dot { color: var(--status-error); background: currentColor; }

        .d-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .d-name {
            font-size: 0.8rem; font-weight: bold; color: var(--text-main);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .d-stats {
            font-size: 0.65rem; color: var(--text-muted);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* --- PROCESS LIST --- */
        .proc-header {
            display: flex;
            font-size: 0.65rem;
            font-weight: bold;
            color: var(--text-muted);
            padding: 0 5px 5px 5px;
            border-bottom: 1px solid var(--border-dim);
            flex-shrink: 0;
        }

        .proc-list {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-height: 0;
            padding-top: 5px;
        }
        .proc-list::-webkit-scrollbar { width: 0; }

        .proc-row {
            display: flex;
            align-items: center;
            font-size: 0.8rem;
            padding: 4px 5px;
            position: relative; /* For the bar behind */
            z-index: 1;
        }

        /* The usage bar behind the text */
        .p-bar {
            position: absolute;
            left: 0; top: 0; bottom: 0;
            background: rgba(235, 111, 146, 0.15); /* Pinkish transparent */
            border-left: 2px solid var(--brand-tertiary); /* Solid pink edge */
            z-index: -1;
            transition: width 0.5s;
            pointer-events: none;
        }

        .p-name {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: bold;
        }

        .p-val {
            width: 50px;
            text-align: right;
            font-family: monospace;
        }
        .p-cpu { color: var(--brand-tertiary); } /* Pink */
        .p-mem { color: var(--text-muted); font-size: 0.7rem; }

        /* Adaptive 1x1 */
        .app-card[data-cols="1"] .proc-header { display: none; }
        .app-card[data-cols="1"] .p-mem { display: none; }
        .app-card[data-cols="1"] .proc-row { font-size: 0.7rem; padding: 2px 5px; }
    `
});