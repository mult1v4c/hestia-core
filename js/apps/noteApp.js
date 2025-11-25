import { BaseApp } from "./baseApp.js";
import { registry } from "../system/registry.js";

export class NoteApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        const text = data.text || 'Empty note...';

        return `
            <div class="app-content app-type-note">
                <div class="note-text">${text}</div>
            </div>`;
    }
}

registry.register('note', NoteApp, {
    label: 'Sticky Note',
    category: 'static',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'text', label: 'Content', type: 'textarea', placeholder: 'Write something...' },
        { name: 'bgColor', label: 'Background Color', type: 'color', defaultValue: '#fef3c7' }
    ],
    css: `
        .app-type-note {
            padding: 10px; box-sizing: border-box;
            overflow-y: auto; height: 100%; width: 100%;
            background-color: var(--app-bg, #fef3c7);
            color: #333; font-family: sans-serif;
            border-radius: 8px;
        }
        .note-text { white-space: pre-wrap; }
    `
});