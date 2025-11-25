// js/apps/static/linkApp.js
import { BaseApp } from "../baseApp.js";
import { resolveIconClass } from "../../utils.js";

export class LinkApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        // Use our new helper to auto-detect "youtube" -> "fa-brands fa-youtube"
        const iconClass = resolveIconClass(data.icon);
        const url = data.url || '#';

        return `
            <a href="${url}" target="_blank" class="app-content app-type-link">
                <i class="${iconClass}"></i>
                <span>${app.name}</span>
            </a>`;
    }
}