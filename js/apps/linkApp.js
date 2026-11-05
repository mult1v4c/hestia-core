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
        const colorize = data.colorize === true || data.colorize === 'true'; // NEW

        // Custom Styles (Only applied in Standard mode)
        let customStyle = '';
        if (displayMode === 'standard') {
            const sizeVal = data.iconSize ? `height: ${data.iconSize}; font-size: ${data.iconSize};` : '';
            customStyle = sizeVal ? `style="${sizeVal}"` : '';
        }

        let iconInput = data.icon || 'fa-globe';
        let isImage = false;
        let imgSrc = '';

        // 1. Resolve Image Source
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
        } else if (iconInput.includes('/') || iconInput.includes('.')) {
            imgSrc = iconInput;
            isImage = true;
        }

        // 2. Render Icon HTML
        let iconHtml;
        if (isImage) {
            if (colorize) {
                // COLORIZED MODE: Render as a masked DIV
                // We inject the mask URL inline.
                // Note: We need to handle merging custom styles if they exist.
                let styleAttr = `style="-webkit-mask-image: url('${imgSrc}'); mask-image: url('${imgSrc}');"`;

                if (customStyle) {
                    // Extract inner style string from customStyle="style='...'"
                    const inner = customStyle.replace(/^style=["']|["']$/g, '');
                    styleAttr = `style="${inner} -webkit-mask-image: url('${imgSrc}'); mask-image: url('${imgSrc}');"`;
                }

                iconHtml = `<div class="link-app-icon colorized" ${styleAttr}></div>`;
            } else {
                // NORMAL MODE: Render as IMG
                iconHtml = `<img src="${imgSrc}" class="link-app-icon" alt="icon" ${customStyle}>`;
            }
        } else {
            // Font Awesome (Always takes text color)
            const iconClass = resolveIconClass(iconInput);
            iconHtml = `<i class="${iconClass}" ${customStyle}></i>`;
        }

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

        // NEW: Colorize Toggle
        {
            name: 'colorize',
            label: 'Colorize Icon (Match Text)',
            type: 'select',
            defaultValue: 'false',
            options: [
                { label: 'No (Original Colors)', value: 'false' },
                { label: 'Yes (Monochrome)', value: 'true' }
            ]
        },

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

        { name: 'iconSize', label: 'Icon Size (Standard Mode)', type: 'text', placeholder: 'e.g. 50px' },
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
            position: relative;
        }
        .app-card .app-type-link:hover { transform: scale(1.05); }

        /* --- STANDARD ICONS --- */
        .app-type-link i { font-size: 2.5rem; margin-bottom: 10px; transition: all 0.2s; }

        .link-app-icon {
            height: 2.5rem;
            width: auto;
            margin-bottom: 10px;
            object-fit: contain;
            pointer-events: none;
            transition: all 0.2s;
        }

        /* --- COLORIZED VARIANT (DIV Mask) --- */
        .link-app-icon.colorized {
            background-color: currentColor; /* The Magic: Takes text color */

            /* Default Aspect Ratio 1:1 if not set */
            width: 2.5rem;

            /* Mask Properties */
            -webkit-mask-size: contain;
            mask-size: contain;
            -webkit-mask-repeat: no-repeat;
            mask-repeat: no-repeat;
            -webkit-mask-position: center;
            mask-position: center;
        }

        .app-type-link span { font-size: 1rem; text-align: center; z-index: 1; }

        /* Large Icon Mode (No Text) */
        .app-card .app-type-link:not(.mode-cover) i:only-child { font-size: 5rem; margin: 0; }

        .app-card .app-type-link:not(.mode-cover) .link-app-icon:only-child {
            height: 5rem;
            width: 80%; /* For IMG */
            margin: 0;
        }

        /* Fix for Colorized DIV in Large Mode */
        .app-card .app-type-link:not(.mode-cover) .link-app-icon.colorized:only-child {
            width: 5rem; /* Force width to match height for square icons */
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
            object-fit: cover;
            z-index: 0;
        }

        /* Colorized Cover */
        .app-type-link.mode-cover .link-app-icon.colorized {
            -webkit-mask-size: cover;
            mask-size: cover;
            /* Optional: Lower opacity for backgrounds so text pops */
            opacity: 0.3;
        }

        /* Icon Cover */
        .app-type-link.mode-cover i {
            font-size: 6rem; margin: 0; opacity: 0.8; z-index: 0;
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

        .edit-mode .app-type-link { pointer-events: none; }
    `
});