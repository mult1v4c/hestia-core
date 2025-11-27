import { BaseApp } from "./baseApp.js";
import { resolveIconClass } from "../utils.js";
import { registry } from "../registry.js";
import { getImageUrl } from "../imageStore.js";

export class LinkApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        const url = data.url || '#';
        const hideLabel = data.hideLabel === true || data.hideLabel === 'true';
        const displayMode = data.display || 'standard'; // 'standard' | 'cover'

        // Custom Styles (Only applied in Standard mode)
        let customStyle = '';
        if (displayMode === 'standard') {
            const sizeVal = data.iconSize ? `height: ${data.iconSize}; font-size: ${data.iconSize};` : '';
            customStyle = sizeVal ? `style="${sizeVal}"` : '';
        }

        let iconInput = data.icon || 'fa-globe';
        let isImage = false;
        let imgSrc = '';

        // 1. Check if it's a Saved Image (IndexedDB)
        if (iconInput.startsWith('img_')) {
            try {
                const dbUrl = await getImageUrl(iconInput);
                if (dbUrl) {
                    imgSrc = dbUrl;
                    isImage = true;
                }
            } catch (e) {
                console.warn("[LinkApp] Failed to load image", e);
            }
        }
        // 2. Check if it's a URL
        else if (iconInput.includes('/') || iconInput.includes('.')) {
            imgSrc = iconInput;
            isImage = true;
        }

        // 3. Render HTML
        let iconHtml;
        if (isImage) {
            iconHtml = `<img src="${imgSrc}" class="link-app-icon" alt="icon" ${customStyle}>`;
        } else {
            const iconClass = resolveIconClass(iconInput);
            iconHtml = `<i class="${iconClass}" ${customStyle}></i>`;
        }

        // Add specific class for cover mode
        const modeClass = displayMode === 'cover' ? 'mode-cover' : '';

        return `
            <a href="${url}" target="_blank" class="app-content app-type-link ${modeClass}">
                ${iconHtml}
                ${!hideLabel ? `<span>${app.name}</span>` : ''}
            </a>`;
    }
}

registry.register('link', LinkApp, {
    label: 'Link Button',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        { name: 'url', label: 'URL', type: 'text', placeholder: 'https://...' },
        { name: 'icon', label: 'Icon', type: 'image-source', placeholder: 'fa-fire OR https://...' },

        // New: Display Mode Selection
        {
            name: 'display',
            label: 'Display Mode',
            type: 'select',
            defaultValue: 'standard',
            options: [
                { label: 'Standard (Icon + Text)', value: 'standard' },
                { label: 'Cover (Full Card)', value: 'cover' }
            ]
        },

        { name: 'iconSize', label: 'Icon Size (Standard Mode)', type: 'text', placeholder: 'e.g. 50px (ignored in Cover mode)' },
        { name: 'hideLabel', label: 'Hide Text Label', type: 'select', options: [{label:'No', value:'false'}, {label:'Yes', value:'true'}], defaultValue: 'false'}
    ],
    css: `
        .app-type-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: inherit;
            height: 100%;
            width: 100%;
            transition: color 0.2s;
            position: relative; /* For absolute children */
        }
        .app-card .app-type-link:hover { transform: scale(1.05); }

        /* --- STANDARD MODE --- */
        .app-type-link i { font-size: 2.5rem; margin-bottom: 10px; transition: all 0.2s; }
        .link-app-icon {
            height: 2.5rem;
            width: auto;
            margin-bottom: 10px;
            object-fit: contain;
            pointer-events: none;
            transition: all 0.2s;
        }
        .app-type-link span { font-size: 1rem; text-align: center; z-index: 1; }

        /* Large Icon Mode (No Text) */
        .app-card .app-type-link:not(.mode-cover) i:only-child {
            font-size: 5rem;
            margin-bottom: 0;
        }
        .app-card .app-type-link:not(.mode-cover) .link-app-icon:only-child {
            height: 5rem;
            width: 80%;
            margin-bottom: 0;
        }

        /* --- COVER MODE --- */
        .app-type-link.mode-cover {
            padding: 0 !important;
            border-radius: var(--radius);
            overflow: hidden;
        }

        /* Image Cover */
        .app-type-link.mode-cover .link-app-icon {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            margin: 0;
            object-fit: cover; /* This makes it fill the card */
            z-index: 0;
        }

        /* Icon Cover (Big Centered) */
        .app-type-link.mode-cover i {
            font-size: 6rem; /* Huge size */
            margin: 0;
            opacity: 0.8;
            z-index: 0;
        }

        /* Text Overlay */
        .app-type-link.mode-cover span {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            color: white;
            padding: 6px 4px;
            font-size: 0.85rem;
            text-shadow: 0 1px 2px black;
        }

        .edit-mode .app-type-link {
            pointer-events: none;
        }
    `
});