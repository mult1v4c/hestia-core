import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

export class ClockApp extends BaseApp {
    async render(app) {
        return `
            <div class="app-content app-type-clock">
                <div class="clock-time">--:--</div>
                <div class="clock-date">Loading...</div>
            </div>`;
    }

    onMount(el, app) {
        const timeEl = el.querySelector('.clock-time');
        const dateEl = el.querySelector('.clock-date');

        // Default to 12 if not set
        const use24h = (app.data.format === '24');

        const update = () => {
            // SAFETY CHECK: Stop running if this app was deleted from the DOM
            if (!el.isConnected) {
                clearInterval(intervalId);
                return;
            }

            const now = new Date();

            if (timeEl) {
                timeEl.innerText = now.toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit', hour12: !use24h
                });
            }
            if (dateEl) {
                dateEl.innerText = now.toLocaleDateString([], {
                    weekday: 'short', month: 'short', day: 'numeric'
                });
            }
        };

        // Run immediately
        update();

        // Start Loop
        const intervalId = setInterval(update, 1000);
    }
}

registry.register('clock', ClockApp, {
    label: 'Clock',
    category: 'static',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        {
            name: 'format',
            label: 'Time Format',
            type: 'select',
            default: '12',
            options: [
                { label: '12-Hour (AM/PM)', value: '12' },
                { label: '24-Hour', value: '24' }
            ]
        }
    ],
    css: `
        .app-type-clock {
            justify-content: center; align-items: center;
            background: inherit; color: inherit; overflow: hidden;
            display: flex; flex-direction: column;
            height: 100%;
        }
        .clock-time { font-size: 2.5rem; font-weight: bold; line-height: 1; text-align: center; font-variant-numeric: tabular-nums; }
        .clock-date { font-size: 0.9rem; opacity: 0.8; margin-top: 5px; text-align: center; }
    `
});