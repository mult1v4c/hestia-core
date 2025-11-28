// js/apps/jellyfinApp.js
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { initJellyfin } from "./jellyfin/jLogic.js";

export class JellyfinApp extends BaseApp {
    async render(app) {
        return `
            <div class="app-content app-type-jellyfin">
                <div class="jellyfin-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="https://raw.githubusercontent.com/jellyfin/jellyfin-ux/master/branding/SVG/icon-transparent.svg" style="width:20px;">
                        <span class="jf-header-title">JELLYFIN</span>
                    </div>
                    <div class="jf-status-wrapper">
                        <div class="jf-status-dot"></div>
                        <span class="jf-status-text">--</span>
                    </div>
                </div>
                <div class="jellyfin-body"></div>
            </div>`;
    }

    onMount(el, app) {
        const url = app.data.url || '';
        const apiKey = app.data.apiKey || '';
        const userId = app.data.userId || '';
        const intervalTime = parseInt(app.data.interval) || 5000;

        if (!url || !apiKey) {
            el.querySelector('.jellyfin-body').innerHTML = `<div style="padding:10px; opacity:0.6;">Configure URL & API Key</div>`;
            return;
        }

        const config = { url, apiKey, userId };
        const updateLogic = initJellyfin(el, config);

        const statusDot = el.querySelector('.jf-status-dot');
        const statusText = el.querySelector('.jf-status-text');

        const runUpdate = async () => {
            if (!el.isConnected) return;
            try {
                if (updateLogic) await updateLogic();
                // Success State
                if (statusDot) statusDot.className = 'jf-status-dot active';
                if (statusText) statusText.innerText = 'ONLINE';
            } catch (err) {
                console.error("[Jellyfin] Error:", err);
                // Error State
                if (statusDot) statusDot.className = 'jf-status-dot disabled';
                if (statusText) statusText.innerText = 'OFFLINE';
            }
        };

        const timer = setInterval(runUpdate, intervalTime);
        runUpdate();
    }
}

registry.register('jellyfin', JellyfinApp, {
    label: 'Jellyfin Media',
    category: 'data',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'url', label: 'Server URL', type: 'text', placeholder: 'http://192.168.1.x:8096' },
        { name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Dashboard > API Keys' },
        { name: 'userId', label: 'User ID / Name', type: 'text', placeholder: 'For "Latest Added"' },
        { name: 'interval', label: 'Interval (ms)', type: 'text', defaultValue: '5000' }
    ],
    css: `
        .app-type-jellyfin {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
            padding: 0; overflow: hidden;
            background: #000; color: white;
        }

        /* HEADER */
        .jellyfin-header {
            position: absolute; top: 0; left: 0; width: 100%;
            padding: 8px 10px; z-index: 10;
            // background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
            pointer-events: none;
            display: flex; justify-content: space-between; align-items: center;
        }
        .jf-header-title { font-weight: bold; font-size: 0.8rem; letter-spacing: 1px; }

        /* Status Indicators */
        .jf-status-wrapper {
            pointer-events: auto; display: flex; align-items: center; gap: 6px;
        }
        .jf-status-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: rgba(255,255,255,0.3); transition: all 0.3s;
            box-shadow: 0 1px 2px black;
        }
        .jf-status-dot.active { background: var(--status-success); box-shadow: 0 0 8px var(--status-success); }
        .jf-status-dot.disabled { background: var(--status-error); }

        .jf-status-text {
            font-size: 0.7rem; font-weight: bold; color: rgba(255,255,255,0.8);
            text-shadow: 0 1px 2px black;
        }

        .jellyfin-body { flex: 1; position: relative; width: 100%; height: 100%; }

        /* --- PLAYER VIEW --- */
        .jf-player {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            position: relative;
        }

        .jf-backdrop {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-size: cover; background-position: center;
            opacity: 0.6; transition: background-image 0.5s;
        }

        .jf-overlay {
            position: absolute; bottom: 0; left: 0; width: 100%;
            padding: 15px; box-sizing: border-box;
            background: linear-gradient(to top, rgba(0,0,0,0.9) 20%, transparent);
            display: flex; flex-direction: column; gap: 5px;
        }

        .jf-meta-top { display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; margin-bottom: 5px; }
        .jf-user { background: var(--brand-primary); color: var(--bg-canvas); padding: 2px 6px; border-radius: 3px; font-weight: bold; }
        .jf-state { font-weight: bold; letter-spacing: 1px; opacity: 0.8; }

        .jf-info { margin-bottom: 8px; }
        .jf-title { font-size: 1.1rem; font-weight: bold; text-shadow: 0 1px 3px black; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .jf-meta-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin-bottom: 2px; }
        .jf-year { opacity: 0.9; font-weight: bold; }
        .jf-rating { border: 1px solid rgba(255,255,255,0.5); padding: 0 4px; border-radius: 3px; font-size: 0.7rem; }
        .jf-genre { font-size: 0.75rem; opacity: 0.7; font-style: italic; }

        .jf-progress-track {
            height: 4px; width: 100%; background: rgba(255,255,255,0.2);
            border-radius: 2px; overflow: hidden;
        }
        .jf-progress-fill { height: 100%; background: var(--brand-primary); transition: width 1s linear; }

        /* --- SHELF VIEW --- */
        .jf-shelf {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            padding: 35px 0 0 0;
            box-sizing: border-box; background: var(--bg-surface);
        }

        .jf-shelf-header {
            font-size: 0.65rem; color: var(--text-muted); font-weight: bold;
            margin: 0 10px 5px 10px; border-bottom: 1px solid var(--border-dim); padding-bottom: 2px;
            flex-shrink: 0;
        }

        .jf-list {
            flex: 1;
            min-height: 0; /* Important for nested flex scrolling */
            overflow-y: auto;
            display: flex; flex-direction: column; gap: 2px;
            padding: 0 5px 5px 5px;
        }
        .jf-list::-webkit-scrollbar { width: 4px; }

        .jf-list-item {
            position: relative;
            display: flex; align-items: center; gap: 15px;
            padding: 8px; border-radius: 6px;
            overflow: hidden;
            transition: transform 0.2s;
            border: 1px solid rgba(255,255,255,0.05);
            flex-shrink: 0; /* CRITICAL FIX: Prevents items from squishing */
        }
        .jf-list-item:hover { transform: scale(1.01); z-index: 2; border-color: rgba(255,255,255,0.2); }

        .jf-list-item::before {
            content: "";
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-image: var(--bg-url);
            background-size: cover; background-position: center;
            filter: blur(8px) brightness(0.25);
            z-index: 0; transform: scale(1.1);
        }

        .jf-poster-thumb {
            width: 70px; height: 105px; flex-shrink: 0;
            background-size: cover; background-position: center;
            border-radius: 4px; background-color: rgba(0,0,0,0.5);
            box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            position: relative; z-index: 1;
        }

        .jf-item-info {
            flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;
            position: relative; z-index: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .jf-item-title { font-size: 1rem; font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .jf-item-meta { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.8); }
        .jf-item-year { font-weight: bold; }
        .jf-item-rating { border: 1px solid rgba(255,255,255,0.4); padding: 0 4px; border-radius: 3px; font-size: 0.7rem; font-weight: bold; }
        .jf-item-genre { font-size: 0.75rem; color: rgba(255,255,255,0.6); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    `
});