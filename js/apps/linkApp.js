import { BaseApp } from "./baseApp.js";
import { resolveIconClass } from "../utils.js";
import { registry } from "../registry.js";

export class LinkApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        const iconClass = resolveIconClass(data.icon);
        const url = data.url || '#';

        return `
            <a href="${url}" target="_blank" class="app-content app-type-link">
                <i class="${iconClass}"></i>
                <span>${app.name}</span>
            </a>`;
    }
}

registry.register('link', LinkApp, {
    label: 'Link Button',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        { name: 'url', label: 'URL', type: 'text', placeholder: 'https://...' },
        { name: 'icon', label: 'Icon Class', type: 'text', placeholder: 'e.g. fa-brands fa-github' }
    ],
    css: `
        .app-type-link {
            align-items: center; justify-content: center; text-decoration: none;
            color: inherit; height: 100%; width: 100%; transition: color 0.2s;
        }
        .app-card .app-type-link:hover { transform: scale(1.1); }
        .app-type-link i { font-size: 2.5rem; margin-bottom: 10px; }
        .app-type-link span { font-size: 1rem; text-align: center; }
    `
});