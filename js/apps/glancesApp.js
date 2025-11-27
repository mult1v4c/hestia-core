// js/apps/glancesApp.js
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { HISTORY_SIZE } from "./glances/gCore.js";
import { initCpu, initPerCpu } from "./glances/gCpu.js";
import { initMem } from "./glances/gMem.js";
import { initNetwork } from "./glances/gNetwork.js";
import { initSensors } from "./glances/gSensors.js";
import { initDisk } from "./glances/gDisk.js";
import { initDocker } from "./glances/gDocker.js";
import { initProcess } from "./glances/gProcess.js";
import { initUptime } from "./glances/gUptime.js";

export class GlancesApp extends BaseApp {
    async render(app) {
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
        let rawUrl = app.data.url || 'http://localhost:61208';
        const url = rawUrl.replace(/\/+$/, '').replace(/\/api\/\d+$/, '');
        const metric = app.data.metric || 'cpu';
        const apiVer = app.data.apiVer || '3';
        const intervalTime = parseInt(app.data.interval) || 1000;

        const dataPoints = new Array(HISTORY_SIZE).fill(0);
        let isRunning = true;
        let updateLogic = null;

        const config = { url, apiVer, dataPoints };

        if (metric === 'cpu') updateLogic = initCpu(el, config);
        else if (metric === 'percpu') updateLogic = initPerCpu(el, config);
        else if (metric === 'mem') updateLogic = initMem(el, config);
        else if (metric === 'net') updateLogic = initNetwork(el, config);
        else if (metric === 'sensors') updateLogic = initSensors(el, config);
        else if (metric === 'disk') updateLogic = initDisk(el, config);
        else if (metric === 'docker') updateLogic = initDocker(el,config);
        else if (metric === 'process') updateLogic = initProcess(el, config);
        else if (metric === 'uptime') updateLogic = initUptime(el, config);

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
        runUpdate();
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
                { label: 'CPU (Per Core)', value: 'percpu' },
                { label: 'Memory (Graph)', value: 'mem' },
                { label: 'Network (Graph)', value: 'net' },
                { label: 'Disk I/O & Usage', value: 'disk' },
                { label: 'Docker Containers', value: 'docker' },
                { label: 'Top Processes', value: 'process' },
                { label: 'Temperatures (List)', value: 'sensors' },
                { label: 'System Uptime', value: 'uptime' }
            ]
        },
        { name: 'interval', label: 'Interval (ms)', type: 'text', defaultValue: '1000' }
    ],
    css: `
        .app-type-glances {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1;
            display: flex;
            flex-direction: column;
            padding: 10px;
            box-sizing: border-box;
            overflow: hidden;
            gap: 5px;
            background: inherit;
            color: inherit;
        }

        .glances-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            flex-shrink: 0;
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

        .glances-body {
            flex: 1;
            width: 100%;
            min-height: 0;
            position: relative;
            display: flex;
            flex-direction: column;
        }

        /* --- OVERLAY STYLE (NEW) --- */
        .glances-overlay {
            position: absolute; bottom: 4px; right: 4px;
            font-size: 0.7rem; color: var(--text-muted);
            display: flex; gap: 8px; font-family: monospace;
            background: rgba(0,0,0,0.4);
            padding: 3px 6px;
            border-radius: 4px;
            pointer-events: none;
            backdrop-filter: blur(2px);
            border: 1px solid rgba(255,255,255,0.05);
        }

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

        /* Legacy Footer Meta (Can be removed if unused, but keeping for safety) */
        .graph-meta, .cpu-meta {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-align: right;
            margin-top: 10px;
            white-space: nowrap;
            flex-shrink: 0;
            display: none; /* Hidden by default now */
        }

        /* --- DISK GRID --- */
        .disk-header-section {
            position: relative; overflow: hidden;
            width: 100%;
            height: 100px;
            flex-shrink: 0;
            border-bottom: 1px solid var(--border-dim);
            margin-bottom: 5px;
        }
        .disk-io-overlay { /* Specific legacy override or alias */
             position: absolute; bottom: 4px; right: 4px;
            font-size: 0.7rem; color: var(--text-muted);
            display: flex; gap: 8px; font-family: monospace;
            background: rgba(0,0,0,0.4); padding: 3px 6px; border-radius: 4px;
            pointer-events: none;
            backdrop-filter: blur(2px);
        }

        .disk-grid {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            grid-auto-rows: minmax(60px, 1fr);
            gap: 5px;
            overflow-y: auto;
            min-height: 0;
            padding-top: 5px;
        }
        .disk-grid::-webkit-scrollbar { width: 0; }

        .disk-card {
            display: flex; align-items: center; gap: 8px;
            background: rgba(0,0,0,0.15);
            border: 1px solid var(--border-dim);
            border-radius: var(--radius);
            padding: 5px 10px;
            justify-content: center;
        }

        .disk-pie-wrapper {
            position: relative; width: 40px; height: 40px; flex-shrink: 0;
            display: flex; justify-content: center; align-items: center;
        }
        .disk-pie-wrapper canvas { width: 40px; height: 40px; }
        .disk-percent { position: absolute; font-size: 0.6rem; font-weight: bold; color: var(--text-main); }
        .disk-info { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .disk-name { font-size: 0.8rem; font-weight: bold; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .disk-meta { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* --- DOCKER --- */
        .docker-grid {
            flex: 1;
            display: grid;
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
            display: flex; align-items: center; padding: 5px 10px; gap: 10px;
        }
        .d-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--text-muted); box-shadow: 0 0 5px currentColor; }
        .docker-card.running .d-status-dot { color: var(--status-success); background: currentColor; }
        .docker-card.paused .d-status-dot { color: var(--status-warning); background: currentColor; }
        .docker-card.stopped .d-status-dot { color: var(--status-error); background: currentColor; }
        .d-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .d-name { font-size: 0.8rem; font-weight: bold; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .d-stats { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* --- PROCESS --- */
        .proc-header { display: flex; font-size: 0.65rem; font-weight: bold; color: var(--text-muted); padding: 0 5px 5px 5px; border-bottom: 1px solid var(--border-dim); flex-shrink: 0; }
        .proc-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; min-height: 0; padding-top: 5px; }
        .proc-list::-webkit-scrollbar { width: 0; }
        .proc-row { display: flex; align-items: center; font-size: 0.8rem; padding: 4px 5px; position: relative; z-index: 1; }
        .p-bar { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(235, 111, 146, 0.15); border-left: 2px solid var(--brand-tertiary); z-index: -1; transition: width 0.5s; pointer-events: none; }
        .p-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold; }
        .p-val { width: 50px; text-align: right; font-family: monospace; }
        .p-cpu { color: var(--brand-tertiary); }
        .p-mem { color: var(--text-muted); font-size: 0.7rem; }
        .app-card[data-cols="1"] .proc-header { display: none; }
        .app-card[data-cols="1"] .p-mem { display: none; }

        /* --- UPTIME --- */
        .uptime-row { display: flex; align-items: center; justify-content: center; gap: 15px; height: 100%; width: 100%; }
        .uptime-icon { font-size: 2.5rem; }
        .uptime-info { display: flex; flex-direction: column; align-items: flex-start; }
        .uptime-val { font-size: 1.8rem; font-weight: bold; line-height: 1; }
        .uptime-boot { font-size: 0.8rem; opacity: 0.7; margin-top: 2px; }

        /* --- CPU GRID --- */
        .cpu-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); grid-auto-rows: 1fr; gap: 5px; overflow: hidden; min-height: 0; }
        .core-graph-cell { background: rgba(0,0,0,0.2); border: 1px solid var(--border-dim); border-radius: 3px; position: relative; overflow: hidden; min-height: 40px; }
        .core-graph-cell canvas { display: block; width: 100%; height: 100%; }
        .core-meta { position: absolute; top: 2px; left: 4px; right: 4px; display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.8); z-index: 2; }
        .c-val { font-weight: bold; color: var(--text-main); }

        /* --- SENSORS --- */
        .sensor-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(35px, 1fr)); grid-auto-rows: 1fr; gap: 2px; overflow-y: hidden; padding-bottom: 5px; }
        .sensor-v-bar { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; padding: 5px 0; position: relative; transition: opacity 0.2s; }
        .sensor-v-bar:hover { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .sv-val { font-size: 0.8rem; font-weight: bold; font-family: monospace; margin-bottom: 5px; color: var(--text-main); }
        .sv-track { flex: 1; width: 6px; background: var(--bg-highlight); border-radius: 3px; position: relative; overflow: hidden; margin-bottom: 5px; }
        .sv-fill { position: absolute; bottom: 0; left: 0; width: 100%; transition: height 0.5s ease-out; border-radius: 3px; min-height: 2px; }
        .sv-name { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-height: 60px; }
        .sensor-v-bar.cool .sv-fill { background: var(--blue); }
        .sensor-v-bar.cool .sv-val { color: var(--text-muted); }
        .sensor-v-bar.careful .sv-fill { background: var(--status-success); }
        .sensor-v-bar.careful .sv-val { color: var(--status-success); }
        .sensor-v-bar.warning .sv-fill { background: var(--status-warning); }
        .sensor-v-bar.warning .sv-val { color: var(--status-warning); }
        .sensor-v-bar.critical .sv-fill { background: var(--status-error); }
        .sensor-v-bar.critical .sv-val { color: var(--status-error); font-weight: 900; }
    `
});