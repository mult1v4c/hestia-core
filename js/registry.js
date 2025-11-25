// src/system/registry.js
export class Registry {
    constructor() {
        this.apps = {};
        this.styles = new Set();
    }

    register(type, AppClass, metadata) {
        if (this.apps[type]) return;

        this.apps[type] = {
            Class: AppClass,
            metadata: metadata
        };

        // Auto-inject CSS on registration
        if (metadata.css) {
            this.injectStyles(type, metadata.css);
        }
        console.log(`[Registry] Registered: ${type}`);
    }

    get(type) {
        return this.apps[type];
    }

    getAll() {
        return Object.values(this.apps).map(app => app.metadata);
    }

    injectStyles(id, css) {
        if (this.styles.has(id)) return;
        const style = document.createElement('style');
        style.id = `style-app-${id}`;
        style.innerHTML = css;
        document.head.appendChild(style);
        this.styles.add(id);
    }
}

export const registry = new Registry();