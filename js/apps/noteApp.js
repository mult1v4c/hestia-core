import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { escapeHtml } from "../utils.js"; // <--- Import the helper

export class NoteApp extends BaseApp {
    async render(app) {
        const data = app.data || {};

        const title = escapeHtml(data.title || '');
        const text = data.text || 'Empty note...';

        const headerHtml = title ? `<h4>${title}</h4>` : '';

        return `
            <div class="app-content app-type-note">
                ${headerHtml}
                <div class="note-paper">${text}</div>
            </div>`;
    }
}

registry.register('note', NoteApp, {
    label: 'Sticky Note',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        // 1. Add the new Title setting here
        { name: 'title', label: 'Title', type: 'text', placeholder: 'My Note' },
        { name: 'text', label: 'Content', type: 'textarea', placeholder: 'Write something...' },
        { name: 'bgColor', label: 'Background Color', type: 'color', defaultValue: '#fef3c7' }
    ],
    css: `
        .app-type-note {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            padding: 0;
            display: flex;
            flex-direction: column;
            color: inherit;
            overflow: hidden;
            z-index: 1;
        }

        /* 2. Fixed CSS selector (was .app-type-text) */
        .app-type-note h4 {
            margin: 10px 10px 0 10px;
            color: inherit;
            font-size: 1.1rem;
            font-weight: bold;
            flex-shrink: 0; /* Prevent title from squishing */
        }

        .note-paper {
            flex: 1;
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        /* Responsive expansion logic */
        .app-card[data-cols="1"] .note-paper {
            min-width: calc(200% + var(--gap-size));
        }
        .app-card[data-rows="1"] .note-paper {
            min-height: calc(200% + var(--gap-size));
        }
    `
});