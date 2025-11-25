// js/appRegistry.js
import { LinkApp } from "./apps/static/linkApp.js";
import { NoteApp } from "./apps/static/noteApp.js";
import { ImageApp } from "./apps/static/imageApp.js";

const registry = new Map();

// Register Built-in Apps
registry.set('link', new LinkApp());
registry.set('text', new NoteApp());
registry.set('image', new ImageApp());

/**
 * Get the renderer instance for a specific app subtype.
 * @param {string} subtype
 * @returns {import('./apps/baseApp.js').BaseApp}
 */
export function getAppType(subtype) {
    return registry.get(subtype) || registry.get('link'); // Default to link if unknown
}

/**
 * Main entry point for Grid to ask "Give me HTML for this app object"
 * @param {Object} app
 * @returns {Promise<string>} HTML
 */
export async function renderAppContent(app) {
    const subtype = app.subtype || 'link';
    const appInstance = getAppType(subtype);

    if (appInstance) {
        return await appInstance.render(app);
    }

    return `<div>Unknown App Type: ${subtype}</div>`;
}

/**
 * Hook for post-render logic (attaching listeners)
 */
export function mountApp(el, app) {
    const subtype = app.subtype;
    const appInstance = getAppType(subtype);
    if (appInstance && appInstance.onMount) {
        appInstance.onMount(el, app);
    }
}