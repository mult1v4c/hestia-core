// js/apps/baseApp.js

/**
 * Base class for all Hestia Apps.
 */
export class BaseApp {
    constructor() {
        this.type = "static";
    }

    /**
     * Returns the HTML content for the app card.
     * @param {Object} app - The full app state object
     * @returns {Promise<string>} HTML string
     */
    async render(app) {
        return `<div class="app-content">Base App</div>`;
    }

    /**
     * Optional: Called after the element is added to the DOM.
     * @param {HTMLElement} el - The app card element
     * @param {Object} app - The app state object
     */
    onMount(el, app) {
        // No-op by default
    }
}