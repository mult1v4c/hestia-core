import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { parseMarkdown, escapeHtml } from "../utils.js";

export class NoteApp extends BaseApp {
    async render(app) {
        const data = app.data || {};

        const title = escapeHtml(data.title || '');
        const textHtml = parseMarkdown(data.text || 'Double-click to edit...');

        const headerHtml = title ? `<h4>${title}</h4>` : '';

        return `
            <div class="app-content app-type-note">
                ${headerHtml}
                <div class="note-paper">${textHtml}</div>
            </div>`;
    }
}

registry.register('note', NoteApp, {
    label: 'Sticky Note',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'title', label: 'Title', type: 'text', placeholder: 'My Note' },
        { name: 'bgColor', label: 'Background Color', type: 'color', defaultValue: 'var(--bg-surface)' }
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
            outline: none;
            line-height: 1.4;
            cursor: text;
        }

        .note-paper:focus {
            background: rgba(0,0,0,0.2);
        }

        /* Responsive expansion logic */
        .app-card[data-cols="1"] .note-paper {
            min-width: calc(200% + var(--gap-size));
        }

        .app-card[data-rows="1"] .note-paper {
            min-height: calc(200% + var(--gap-size));
        }

        .note-paper {
            flex: 1; width: 100%; box-sizing: border-box; padding: 10px;
            overflow-y: auto;
            font-size: 0.9rem; line-height: 1.5;
            word-wrap: break-word;
        }

        .note-paper i {
            width: 14px;
            height: auto;
        }

        .note-editor {
            flex: 1; width: 100%; height: 100%;
            box-sizing: border-box; padding: 10px;
            border: none; outline: none; resize: none;
            background: rgba(255,255,255,0.1); /* Slight contrast */
            font-family: inherit; font-size: 0.9rem; line-height: 1.5;
            color: inherit;
        }

        /* Markdown Styling */
        .note-paper h1 { font-size: 1.5em; margin: 0.5em 0; ; }
        .note-paper h2 { font-size: 1.2em; margin: 0.5em 0; }
        .note-paper h3 { font-size: 1.1em; margin: 0.5em 0; font-weight: bold; }
        .note-paper code { background: rgb(from var(--base04) r g b / 20%); padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        .note-paper a { text-decoration: none; color: inherit; border-bottom: 1px solid; border-bottom-color: inherit;}
        .note-paper hr { border: 0; border-top: 1px solid rgb(from var(--text-main) r g b / 50%); margin: 10px 0; }

        /* List Styles */
        .task-done, .task-todo { display: flex; align-items: center; gap: 8px; margin: 2px 0; }
        .task-done input, .task-todo input { margin: 0; cursor: default; }
        .task-done span { text-decoration: line-through; opacity: 0.7; }

        /* List Item Style */
        .list-item { margin-left: 5px; }

        /* Checkbox Styles */
        .task-done, .task-todo {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin: 4px 0;
            line-height: 1.4;
        }

        /* The Icons */
        .task-done i, .task-todo i {
            font-size: 1.1em;
            margin-top: 3px;
            flex-shrink: 0;
        }

        /* Checked State */
        .task-done i { color: var(--brand-primary); }
        .task-done span { text-decoration: line-through; opacity: 0.6; }

        /* Unchecked State */
        .task-todo i { color: var(--text-muted); }
    `
});