// apps/baseApp.js
export class BaseApp {
    constructor() {
        // Shared logic can go here later
    }

    // All apps must implement this
    async render(appData) {
        throw new Error("Render method not implemented");
    }
}