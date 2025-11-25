import { BaseApp } from "./baseApp.js";
import { registry } from "../system/registry.js";

export class ImageApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        const src = data.src || '';

        // Determine render based on if src exists
        if (!src) return `<div class="app-type-image empty">No Image Set</div>`;

        return `
            <div class="app-content app-type-image" style="background-image: url('${src}')">
            </div>`;
    }
}

registry.register('image', ImageApp, {
    label: 'Image Frame',
    category: 'static',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'src', label: 'Image URL', type: 'text', placeholder: 'https://...' }
    ],
    css: `
        .app-type-image {
            width: 100%; height: 100%;
            background-size: cover; background-position: center;
            border-radius: 8px;
        }
        .app-type-image.empty {
            display: flex; align-items: center; justify-content: center;
            background: #eee; color: #999;
        }
    `
});