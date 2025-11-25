// js/apps/static/noteApp.js
import { BaseApp } from "../baseApp.js";

export class NoteApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        // Trusted innerHTML (Self-hosted context)
        const content = data.content || '';

        return `
            <div class="app-content app-type-text">
                <div class="note-paper">
                    <h4>${app.name}</h4>
                    <p>${content}</p>
                </div>
            </div>`;
    }
}