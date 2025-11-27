import { fetchGlances } from "./gCore.js";

export function initUptime(el, config) {
    const { url, apiVer } = config;
    const bodyEl = el.querySelector('.glances-body');

    // 1. Get Header Elements
    const titleEl = el.querySelector('.metric-title');
    const valElHeader = el.querySelector('.metric-value');

    // 2. Setup DOM (Weather App Layout)
    bodyEl.innerHTML = `
        <div class="uptime-row">
            <i class="uptime-icon fa-solid fa-clock"></i>
            <div class="uptime-info">
                <div class="uptime-val" id="uptime-val">--</div>
                <div class="uptime-boot" id="boot-time">Booted: --</div>
            </div>
        </div>
    `;

    const valElBody = el.querySelector('#uptime-val');
    const bootEl = el.querySelector('#boot-time');

    // 3. Return Update Function
    return async () => {
        // Fetch Uptime
        const raw = await fetchGlances(url, apiVer, 'uptime');
        let seconds = 0;

        // Handle string response ("4 days, 14:14:22")
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

        // Calculate Display Values
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        // Detailed String (For Body) -> "5d 4h 20m"
        let timeStr = "";
        if (d > 0) timeStr += `${d}d `;
        if (h > 0 || d > 0) timeStr += `${h}h `;
        timeStr += `${m}m`;
        const finalTimeStr = timeStr || "0m";

        // Simple String (For Header) -> "5 Days"
        // We fallback to the detailed string if it's less than a day (e.g. "4h 20m")
        let headerStr = finalTimeStr;
        if (d > 0) {
            headerStr = `${d} Day${d === 1 ? '' : 's'}`;
        }

        // --- UPDATE HEADER ---
        if (titleEl) titleEl.innerText = "UPTIME";
        if (valElHeader) valElHeader.innerText = headerStr;

        // --- UPDATE BODY ---
        if (valElBody) valElBody.innerText = finalTimeStr;

        // Calculate Boot Date
        if (seconds > 0) {
            const bootDate = new Date(Date.now() - (seconds * 1000));
            if (bootEl) bootEl.innerText = "Boot: " + bootDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    };
}