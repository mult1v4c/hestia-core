import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

export class CalendarApp extends BaseApp {
    async render(app) {
        return `
            <div class="app-content app-type-calendar">
                <div class="calendar-paper" id="cal-${app.id}"></div>
            </div>`;
    }

    onMount(el, app) {
        const container = el.querySelector(`#cal-${app.id}`);
        if (!container) return;

        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = date.getDate();

        let html = `<div class="cal-header">${date.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>`;
        html += `<div class="cal-grid">`;

        ['S','M','T','W','T','F','S'].forEach(d => html += `<div class="cal-head">${d}</div>`);

        // Empty slots for days before the 1st
        for(let i=0; i<firstDay; i++) html += `<div></div>`;

        // Actual days
        for(let i=1; i<=daysInMonth; i++) {
            const isToday = i === today ? 'today' : '';
            html += `<div class="cal-day ${isToday}">${i}</div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    }
}

registry.register('calendar', CalendarApp, {
    label: 'Calendar',
    category: 'static',
    defaultSize: { cols: 1, rows: 1 },
    settings: [],
    css: `
        .app-type-calendar {
            width: 100%; height: 100%;
            padding: 0; overflow: hidden;
            display: flex; flex-direction: column;
        }
        .calendar-paper {
            flex: 1; box-sizing: border-box; padding: 10px;
            display: flex; flex-direction: column;
        }
        .cal-header {
            font-weight: bold; text-align: center; margin-bottom: 5px;
            font-size: 0.9em; flex-shrink: 0;
            color: var(--brand-primary);
        }
        .cal-grid {
            display: grid; grid-template-columns: repeat(7, 1fr);
            grid-template-rows: repeat(auto-fit, minmax(0, 1fr));
            gap: 2px; text-align: center; font-size: 0.75em;
            height: 100%; align-items: center;
        }

        .app-card[data-rows="1"] .cal-grid { font-size: 0.6em; };
        .app-card[data-cols="1"] .cal-grid { font-size: 0.6em; };

        .app-card[data-rows="1"] .cal-header { font-size: 0.8em; };
        .app-card[data-cols="1"] .cal-header { font-size: 0.8em; };

        .cal-head { color: var(--brand-secondary); font-weight: bold; font-size: 0.8em; }
        .cal-day { border-radius: 3px; display: flex; justify-content: center; align-items: center; height: 100%; cursor: default; }
        .cal-day:hover { background: var(--bg-highlight); }
        .cal-day.today { background: var(--brand-primary); color: var(--bg-canvas); font-weight: bold; }
    `
});