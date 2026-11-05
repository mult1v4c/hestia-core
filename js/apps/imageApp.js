import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { getImageUrl } from "../imageStore.js"; // Import the DB helper

export class ImageApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        let src = data.src || '';
        const fitMode = data.fit || 'cover';

        // 1. Resolve Database Images
        if (src.startsWith('img_')) {
            try {
                const dbUrl = await getImageUrl(src);
                if (dbUrl) src = dbUrl;
            } catch (e) {
                console.error("Failed to load image", e);
            }
        }

        // 2. Empty State
        if (!src) {
            return `
                <div class="app-content app-type-image empty">
                    <i class="fa-regular fa-image" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <span>No Image Set</span>
                </div>`;
        }

        // 3. Image State
        return `
            <div class="app-content app-type-image">
                <img src="${src}" class="app-image-absolute ${fitMode}" alt="${app.name || 'Image'}" loading="lazy">
            </div>`;
    }
}

registry.register('image', ImageApp, {
    label: 'Image Frame',
    category: 'static',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        // We use a special custom type 'image-source' here now
        { name: 'src', label: 'Image Source', type: 'image-source' },
        { name: 'fit',
            label: 'Display Style',
            type: 'select',
            options: [
                { label: 'Photo (Fill Area)', value: 'cover' },
                { label: 'Logo / SVG (Fit w/ Padding)', value: 'contain' }
            ],
            defaultValue: 'cover'
        }
    ],
    css: `
        .app-image-absolute {
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 0; pointer-events: none;
            border-radius: var(--radius);
        }

        .app-image-absolute.cover {
            object-fit: cover;
            padding: 0;
        }

        .app-image-absolute.contain {
            object-fit: contain;
            padding: 15px;
            box-sizing: border-box;
        }

        .app-type-image.empty {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            height: 100%; width: 100%;
            background: var(--bg-highlight); color: var(--text-muted);
            border-radius: var(--radius);
        }
    `
});