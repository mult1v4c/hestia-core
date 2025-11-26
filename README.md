# 🔥 Project Hestia

![Preview](preview.png)

**A highly customizable, browser-based dashboard that puts you in control.**

**Project Hestia** is a client-side dashboard designed to be your browser's start page. It features a responsive grid layout, a powerful theming engine, and a modular app architecture that allows developers to easily create custom widgets.

## ✨ Features

  * **Responsive Grid System:** Drag-and-drop your apps. Resize them to any dimension. The apps will automatically adjust to your prefered grid size.
  * **Deep Customization:**
      * **Base16 Support:** Includes predefined palettes that follow the [Base16](https://github.com/chriskempson/base16) framework. You can add your own palettes by adding entries to the `js/palettes.js` file.
      * **Fine-Grained Control:** Tweak every color, gap size, corner radius, and font.
      * **Live Previews:** See changes instantly as you edit settings.
  * **Modular App System:** Apps are isolated modules. Creating a new widget (Weather, Clock, Notes) is as simple as writing a single JavaScript class.
  * **Client-Side Persistence:**
      * **No Backend Required:** Runs entirely in the browser.
      * **LocalStorage:** Saves your layout and settings automatically.
      * **IndexedDB:** Efficiently stores large assets like uploaded images locally.
  * **Developer Friendly:** Built with vanilla ES6+ JavaScript. No build steps, bundlers, or frameworks required.

## 🚀 Getting Started

Visit the [live demo page](https://mult1v4c.github.io/hestia-core/) or select one of the steps below.

The easiest way to run Hestia is to clone this repository and open `index.html` in your browser.

```bash
git clone https://github.com/mult1v4c/hestia-core
```

### Running Locally (Docker)

You can run Hestia in a Docker container by using the included `Dockerfile`.

```bash
docker build -t hestia-core .
docker run -d -p 8080:80 hestia-core
```

Visit `http://localhost:8080` in your browser.

### Manual Installation

Since Hestia is a static web application, you can serve it with any web server (Python, Nginx, Apache, or VS Code Live Server).

```bash
# Example using Python
python3 -m http.server 8000
```

## 📖 User Guide

### Edit Mode

Click the **Edit** button (Pen Icon) in the top-right toolbar.

  * **Move:** Drag cards to rearrange them.
  * **Resize:** Grab the bottom-right corner of any card to resize it.
  * **Edit App:** Click the Pencil icon on a card to change its settings (URL, Title, Colors).
  * **Delete:** Click the Trash icon to remove an app.

### Settings

Click the **Gear** icon to open the customization panel.

  * **Themes:** Select a preset or pick custom colors.
  * **Geometry:** Adjust the grid gap, padding, and border radius.
  * **Export/Import:** Backup your entire dashboard configuration to a JSON file.

## 🛠️ Developer Guide

Hestia-Core operates on a bespoke, vanilla JS framework designed for zero-dependency modularity.

### 1\. Core Architecture

The application state is centralized in `js/state.js`. It utilizes a lightweight **Pub/Sub** pattern.

  * **State Tree:** The entire app config (apps, theme, settings) lives in a single `state` object.
  * **Reactivity:** Components do not poll for changes. Instead, they subscribe to state updates.
    ```javascript
    import { setState, subscribe } from "./state.js";

    // Update state (notifies listeners)
    setState('settings.theme.gapSize', '20px');

    // React to changes
    subscribe((state, path, value) => {
        if (path.startsWith('settings.theme')) renderGrid();
    });
    ```

### 2\. The App Lifecycle

Apps in Hestia extend the `BaseApp` class. They have two critical lifecycle phases:

#### Phase A: `render(app)`

  * **Role:** HTML Generation.
  * **Behavior:** Must return a `Promise<string>`. This method is `async`, allowing you to fetch data (APIs, RSS) *before* the card renders.
  * **Context:** No DOM access yet.

#### Phase B: `onMount(el, app)`

  * **Role:** Hydration & Events.
  * **Behavior:** Called immediately after the HTML is injected into the DOM.
  * **Context:** `el` is the `HTMLElement` of the card wrapper. Use this to attach event listeners, start timers (`setInterval`), or manipulate canvas elements.

**Example: A Digital Clock**

```javascript
export class ClockApp extends BaseApp {
    async render(app) {
        return `<div class="clock-face">Loading...</div>`;
    }

    onMount(el, app) {
        const face = el.querySelector('.clock-face');
        this.timer = setInterval(() => {
            face.innerText = new Date().toLocaleTimeString();
        }, 1000);
    }
}
```

### 3\. Registry & CSS Injection

Hestia uses a **Registry Singleton** (`js/registry.js`) to manage app definitions.

```javascript
registry.register('my-app', MyAppClass, { metadata });
```

  * **Metadata:** Defines the default grid size, display name, and configuration fields.
  * **Style Injection:** The `css` property in metadata is **scoped** and injected into the `<head>` dynamically.
      * The registry creates a `<style id="style-app-{type}">` tag.
      * This ensures CSS is loaded *once* per app type, preventing duplication even if you have 10 instances of the same app.

### 4\. Storage Engine

Hestia uses a hybrid storage strategy to bypass `localStorage` quota limits:

  * **Configuration (`localStorage`):**
      * Key: `HESTIA_DASHBOARD_STATE`
      * Stores: JSON structure of layout positions, settings, and text data.
  * **Binary Assets (`IndexedDB`):**
      * Database: `hestia-db` / Store: `images`
      * Role: Stores user-uploaded images as `Blob` objects.
      * Reference: The `localStorage` configuration only stores the image ID (e.g., `img_171923...`), which the `ImageApp` resolves asynchronously at runtime.

### 5\. Creating a Custom App

#### Step 1: Define the Class

Create `js/apps/helloWorldApp.js`.

```javascript
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

export class HelloWorldApp extends BaseApp {
    async render(app) {
        const msg = app.data.message || "Hello World";
        const align = app.data.align || "center";

        return `
            <div class="app-hello" style="text-align: ${align}">
                <h2>${msg}</h2>
            </div>`;
    }
}

registry.register('hello-world', HelloWorldApp, {
    label: 'Hello World',
    category: 'static',
    defaultSize: { cols: 2, rows: 1 },

    // Auto-generates the Edit Modal form
    settings: [
        { name: 'message', label: 'Message', type: 'text' },
        {
            name: 'align',
            label: 'Alignment',
            type: 'select',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' }
            ]
        }
    ],

    // Scoped CSS injected automatically
    css: `
        .app-hello {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--brand-primary);
        }
    `
});
```

#### Step 2: Register the Module

Import the file in `js/apps/appIndex.js` to execute the registration.

```javascript
import './helloWorldApp.js';
```

## 📄 License

This project is licensed under the **MIT License**.