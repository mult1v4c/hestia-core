import { fetchGlances } from "./gCore.js";

export function initUptime(el, config) {
    const { url, apiVer } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="uptime-wrapper">
            <div class="ut-grid">
                <div class="ut-cell icon-cell">
                    <i class="fa-solid fa-clock" style="font-size: inherit;"></i>
                </div>
                <div class="ut-cell info-cell">
                    <div class="ut-label">SYSTEM UP</div>
                    <div class="ut-val" id="uptime-val">--</div>
                    <div class="ut-boot" id="boot-time">Booted: --</div>
                </div>
            </div>
        </div>
    `;

    const valEl = el.querySelector('#uptime-val');
    const bootEl = el.querySelector('#boot-time');

    // 2. Return Update Function
    return async () => {
        // Fetch Uptime
        const raw = await fetchGlances(url, apiVer, 'uptime');

        let seconds = 0;

        // --- FIX: Handle String Response ("4 days, 14:14:22") ---
        if (typeof raw === 'string' && raw.includes(':')) {
            const daysMatch = raw.match(/(\d+)\s+days?,\s+(\d+):(\d+):(\d+)/);
            const timeMatch = raw.match(/^(\d+):(\d+):(\d+)$/);

            if (daysMatch) {
                seconds = (parseInt(daysMatch[1]) * 86400) +
                          (parseInt(daysMatch[2]) * 3600) +
                          (parseInt(daysMatch[3]) * 60) +
                          parseInt(daysMatch[4]);
            } else if (timeMatch) {
                seconds = (parseInt(timeMatch[1]) * 3600) +
                          (parseInt(timeMatch[2]) * 60) +
                          parseInt(timeMatch[3]);
            }
        } else {
            // Handle numeric or object response
            if (typeof raw === 'object' && raw.seconds) seconds = parseFloat(raw.seconds);
            else if (typeof raw === 'string') seconds = parseFloat(raw.split(' ')[0]);
            else seconds = parseFloat(raw);
        }
        // -------------------------------------------------------

        // Calculate Display Values
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        let timeStr = "";
        if (d > 0) timeStr += `${d}d `;
        if (h > 0 || d > 0) timeStr += `${h}h `;
        timeStr += `${m}m`;

        // Update Body
        valEl.innerText = timeStr || "0m";

        // Calculate Boot Date
        if (seconds > 0) {
            const bootDate = new Date(Date.now() - (seconds * 1000));
            bootEl.innerText = "Boot: " + bootDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    };
}