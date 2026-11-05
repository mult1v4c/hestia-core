import { storageVolumes } from './glances/gCore.js';
import { escapeHtml } from '../utils.js';
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { getImageUrl } from "../imageStore.js";
import { fetchGlances, formatBytes } from "./glances/gCore.js";
import { state } from "../state.js";

export class FetchApp extends BaseApp {
    async render() { return '<div class="app-content app-type-fetch"></div>'; }

    onMount(el, app) {
        const content = el.querySelector('.app-content');
        this.poll(el, async () => {
            const html = await this.renderContent(app);
            if (this.disposed) return;
            const template = document.createElement('template');
            template.innerHTML = html;
            content.replaceChildren(...template.content.firstElementChild.childNodes);
        }, 30000);
    }

    async renderContent(app) {
        const data = app.data || {};
        const apiVer = data.apiVer || '3';

        let specs = [];
        let titleUser = data.user || 'user';
        let titleHost = data.host || 'hestia';

        // --- GLANCES (Server) ---
        const url = data.glancesUrl || '/glances-api';
        const safeFetch = (endpoint) => fetchGlances(url, apiVer, endpoint).catch(() => null);

        try {
            // Added 'quicklook' for better CPU info
            const [mem, fs, os, system, quicklook, network, ipData] = await Promise.all([
                fetchGlances(url, apiVer, 'mem'),
                safeFetch('fs'),
                safeFetch('os'),
                safeFetch('system'),
                safeFetch('quicklook'), // Goldmine for CPU info
                safeFetch('network'),
                safeFetch('ip')
            ]);

            if (!mem) throw new Error("Offline");

            // Header & OS
            const sys = system || os || {};
            if (sys.hostname) titleHost = sys.hostname;
            titleUser = 'root';

            const distro = sys.linux_distro || sys.os_name || 'Linux';
            const plat = sys.platform || '';
            specs.push({ label: "OS", val: `${distro} ${plat}`.trim() });

            const kernel = sys.os_version || sys.kernel_release;
            if (kernel) specs.push({ label: "Kernel", val: kernel });

            // Hardware (Powered by Quicklook)
            if (quicklook) {
                if (quicklook.cpu_name) {
                    const cleanCpu = quicklook.cpu_name.replace(/(\(R\)|\(TM\)| CPU)/g, '');
                    specs.push({ label: "CPU", val: cleanCpu });
                }
            }

            if (mem) {
                specs.push({ label: "Memory", val: `${formatBytes(mem.used)} / ${formatBytes(mem.total)}` });
            }

            if (fs) {
                const volumes = storageVolumes(fs);
                for (const volume of volumes) {
                    specs.push({ label: 'Disk', val: `${volume.name} (${formatBytes(volume.used)} / ${formatBytes(volume.size)}, ${Math.round(volume.percent)}%)` });
                }
                if (!volumes.length) specs.push({ label: 'Disk', val: 'No storage volumes reported' });
            } else {
                specs.push({ label: 'Disk', val: 'Storage data unavailable' });
            }

            // IP Logic
            let ipVal = null;
            if (ipData && (ipData.address || ipData.public_address)) {
                ipVal = ipData.address || ipData.public_address;
            }

            // URL Fallback
            if (!ipVal && url) {
                try {
                    const urlObj = new URL(url, window.location.origin);
                    if (urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
                        ipVal = urlObj.hostname;
                    }
                } catch(e){}
            }

            let ifaceName = "";
            if (network && Array.isArray(network)) {
                const iface = network.find(n => n.interface_name !== 'lo') || network[0];
                if (iface) ifaceName = iface.interface_name;
            }

            if (ipVal) {
                specs.push({ label: "IP", val: ifaceName ? `${ipVal} (${ifaceName})` : ipVal });
            } else if (ifaceName) {
                specs.push({ label: "IP", val: ifaceName });
            }

            // Dashboard Stats
            this.addDashboardStats(specs);

        } catch (e) {
            throw e;
        }

        // --- RENDER ---
        let imgStyle = '';
        if (data.imgSrc && data.imgSrc.startsWith('img_')) {
            try {
                const dbUrl = await getImageUrl(data.imgSrc);
                if (dbUrl) imgStyle = `background-image: url('${dbUrl}')`;
            } catch (e) {}
        } else if (data.imgSrc) {
            imgStyle = `background-image: url('${data.imgSrc}')`;
        }

        let rowsHtml = '';
        specs.forEach(s => {
            rowsHtml += `
                <div class="fetch-row">
                    <span class="key">${escapeHtml(s.label)}:</span>
                    <span class="val" title="${escapeHtml(s.val)}">${escapeHtml(s.val)}</span>
                </div>`;
        });

        // Generate 16 Color Blocks (Grid Layout)
        let colorsHtml = '';
        const hexChars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
        hexChars.forEach(char => {
            colorsHtml += `<span style="background:var(--base0${char})"></span>`;
        });

        return `
            <div class="app-content app-type-fetch">
                <div class="fetch-col-left" style="${imgStyle ? '' : 'display:none'}">
                    <div class="fetch-avatar" style="${imgStyle}"></div>
                </div>

                <div class="fetch-col-right">
                    <div class="fetch-header">
                        <span class="u">${escapeHtml(titleUser)}</span><span class="at">@</span><span class="h">${escapeHtml(titleHost)}</span>
                    </div>
                    <div class="fetch-sep"></div>
                    <div class="fetch-list">
                        ${rowsHtml}
                    </div>
                    <div class="fetch-colors">
                        ${colorsHtml}
                    </div>
                </div>
            </div>`;
    }

    addDashboardStats(specs) {
        const themeKey = state.settings.theme.activePalette;
        let themeName = themeKey;
        if (state.palettes && state.palettes[themeKey]) {
            themeName = state.palettes[themeKey].name;
        }
        specs.push({ label: "Theme", val: themeName || "Custom" });

        const font = state.settings.theme.fontFamily || "System";
        specs.push({ label: "Font", val: font.replace(/['"]/g, "") });

        const cols = state.settings.theme.gridColumns;
        const rows = state.settings.theme.gridRows;
        specs.push({ label: "Layout", val: `${cols}x${rows} (${state.apps ? state.apps.length : 0} Apps)` });
    }
}

registry.register('fetch', FetchApp, {
    label: 'System Fetch',
    category: 'data',
    defaultSize: { cols: 2, rows: 1 },
    settings: [
        { name: 'glancesUrl', label: 'Glances URL', type: 'text', defaultValue: '/glances-api' },
        {
            name: 'apiVer',
            label: 'API Version',
            type: 'select',
            defaultValue: '4',
            options: [ { label: 'v3', value: '3' }, { label: 'v4', value: '4' }, { label: 'v2', value: '2' } ]
        },
        { name: 'imgSrc', label: 'Avatar Image', type: 'image-source' }
    ],
    css: `
        .app-type-fetch {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            display: flex;
            align-items: flex-start;
            padding: 15px;
            gap: 20px;
            overflow: hidden;
            box-sizing: border-box;
            background: inherit;
            border-radius: var(--radius);
        }

        .fetch-col-left {
            flex: 1;
            height: 100%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            min-width: 0;
        }

        .fetch-avatar {
            width: 100%;
            aspect-ratio: 1 / 1;
            max-height: 100%;
            background-color: rgba(255,255,255,0.05);
            background-size: cover;
            background-position: center;
            border-radius: 8px;
            border: 1px solid var(--border-dim);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .fetch-col-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            min-width: 0;
            font-family: var(--font-main-stack), monospace; /* Strict Font Usage */
        }

        .fetch-header {
            font-weight: bold;
            font-size: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 6px;
            margin-top: -2px;
        }
        .fetch-header .u { color: var(--brand-primary); }
        .fetch-header .at { color: var(--text-muted); }
        .fetch-header .h { color: var(--brand-secondary); }

        .fetch-sep {
            height: 2px; width: 100%; background: var(--border-dim);
            opacity: 0.6; margin-bottom: 12px; flex-shrink: 0;
        }

        .fetch-list {
            display: flex; flex-direction: column; gap: 5px;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            scrollbar-width: none;
        }
        .fetch-list::-webkit-scrollbar { display: none; }

        .fetch-row {
            display: flex; gap: 12px;
            font-size: 0.75rem;
            line-height: 1.2;
            white-space: nowrap;
        }
        .fetch-row .key { color: var(--brand-primary); font-weight: bold; min-width: 60px; }
        .fetch-row .val { color: var(--text-main); opacity: 0.9; min-width:0; white-space:normal; overflow-wrap:anywhere; }

        /* --- 8x2 COLOR GRID (Responsive Height) --- */
        .fetch-colors {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            grid-template-rows: 1fr 1fr;
            gap: 3px;
            margin-top: auto;
            padding-top: 15px;
            flex-shrink: 0;
            width: 100%;
            height: 30px; /* Taller Blocks */
        }
        .fetch-colors span {
            width: 100%; height: 100%;
            border-radius: 2px;
        }

        /* --- RESPONSIVE --- */
        .app-card[data-cols="1"] .app-type-fetch {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 10px;
        }
        .app-card[data-cols="1"] .fetch-col-left {
            flex: 0 0 auto;
            width: 50%;
            margin-bottom: 10px;
        }
        .app-card[data-cols="1"] .fetch-row { justify-content: center; font-size: 0.8rem; }
        .app-card[data-cols="1"] .fetch-header { font-size: 1rem; }
    `
});
