import { BaseApp } from "./baseApp.js";             // Required
import { registry } from "../registry.js";          // Required
import { resolveIconClass } from "../utils.js";     // Import helpers as needed

// 1. Define the Logic
export class HelloWorldApp extends BaseApp {

    // The 'render' method returns the HTML string for your card.
    // 'app' contains the saved data (position, size, settings).
    async render(app) {
        // Retrieve data from settings, or use a default
        const text = app.data.text || "Hello, World!";
        const align = app.data.align || "center";
        const iconInput = app.data.icon || "hand-peace";

        // Use Hestia's helper to get the full FontAwesome class
        const iconClass = resolveIconClass(iconInput);

        // We inject the alignment setting directly into the style attribute
        return `
            <div class="app-content app-type-hello" style="text-align: ${align};">
                <i class="${iconClass} hello-icon"></i>
                <h2>${text}</h2>
            </div>`;
    }}

// 2. Register the App
registry.register('hello-world', HelloWorldApp, {
    // metadata
    label: 'Hello World',   // Display name in the "Add App" list
    category: 'static',     // (Optional) Grouping
    defaultSize: { cols: 2, rows: 1 }, // Default grid size

    // Settings Array
    settings: [
        // Setting 1: Simple Text
        {
            name: 'text',
            label: 'Greeting Message',
            type: 'text',
            placeholder: 'e.g. Hello, World!'
        },

        // Setting 2: FontAwesome Icon (Text input treated as icon name)
        {
            name: 'icon',
            label: 'Icon Name',
            type: 'text',
            placeholder: 'e.g. rocket, heart, code'
        },

        // Setting 3: Dropdown Select
        {
            name: 'align',
            label: 'Text Alignment',
            type: 'select',
            defaultValue: 'center',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' }
            ]
        }
    ],
    // Scoped CSS (Injected automatically when the app is used)
    css: `
        .app-type-hello {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 15px;
            color: inherit; /* Inherits text color from card settings */
        }
        .hello-icon {
            font-size: 2.5rem;
            animation: wave 2s infinite;
            transform-origin: 70% 70%;
        }
        .hello-text {
            font-size: 1.2rem;
        }

        @keyframes wave {
            0% { transform: rotate( 0.0deg) }
            10% { transform: rotate(14.0deg) }
            20% { transform: rotate(-8.0deg) }
            30% { transform: rotate(14.0deg) }
            40% { transform: rotate(-4.0deg) }
            50% { transform: rotate(10.0deg) }
            60% { transform: rotate( 0.0deg) }
            100% { transform: rotate( 0.0deg) }
        }
    `
});