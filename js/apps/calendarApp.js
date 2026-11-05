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
        const container = el.querySelector('.calendar-paper');
        if (!container) return;

        let lastDate;
        const update = () => {
            const date = new Date();
            if (lastDate === date.toDateString()) return;
            lastDate = date.toDateString();
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
            container.querySelector('.cal-grid').style.gridTemplateRows = `repeat(${1 + Math.ceil((firstDay + daysInMonth) / 7)}, minmax(0, 1fr))`;
        };
        update();
        const timer = setInterval(update, 60000);
        this.addCleanup(() => clearInterval(timer));
    }
}

registry.register('calendar', CalendarApp, {
    label: 'Calendar',
    category: 'static',
    defaultSize: { cols: 2, rows: 2 },
    settings: [],
    css: `
        .app-type-calendar {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            padding: 0; overflow: hidden;
            display: flex; flex-direction: column;
            width: 100%; height: 100%;
        }
        .calendar-paper {
            flex: 1; box-sizing: border-box; padding: 10px;
            display: flex; flex-direction: column;
            height: 100%; min-height: 0; min-width: 0;
        }
        .cal-header {
            font-weight: bold; text-align: center; margin-bottom: 5px;
            font-size: 0.9em; flex-shrink: 0;
            color: var(--brand-primary);
        }
        .cal-grid {
            display: grid; grid-template-columns: repeat(7, 1fr);
            flex: 1; min-height: 0; min-width: 0;
            gap: 2px; text-align: center; font-size: 0.75em;
            align-items: stretch;
        }

        .app-card[data-rows="1"] .cal-grid { font-size: 0.6em; }
        .app-card[data-cols="1"] .cal-grid { font-size: 0.6em; }

        .app-card[data-rows="1"] .cal-header { font-size: 0.8em; }
        .app-card[data-cols="1"] .cal-header { font-size: 0.8em; }

        .cal-head { display:flex; align-items:center; justify-content:center; min-height:0; color: var(--brand-secondary); font-weight: bold; font-size: 0.8em; }
        .cal-day { border-radius: 3px; display: flex; justify-content: center; align-items: center; min-height:0; cursor: default; }
        .cal-day:hover { background: var(--bg-highlight); }
        .cal-day.today { background: var(--brand-primary); color: var(--bg-canvas); font-weight: bold; }
    `
});