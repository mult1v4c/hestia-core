// js/apps/static/imageApp.js
import { BaseApp } from "../baseApp.js";
import { getImageUrl } from "../../imageStore.js";

export class ImageApp extends BaseApp {
    async render(app) {
        const data = app.data || {};
        let src = data.url;

        // Check if it's an IndexedDB ID (async lookup)
        if (src && src.startsWith('img_')) {
            const blobUrl = await getImageUrl(src);
            if (blobUrl) src = blobUrl;
        }

        // Fallback for missing images
        if (!src) {
            return `<div class="app-content" style="display:flex;justify-content:center;align-items:center;color:var(--text-muted);">
                        <i class="fa-solid fa-image" style="font-size:2rem;"></i>
                    </div>`;
        }

        return `<img src="${src}" alt="${app.name}" class="app-image-absolute" draggable="false">`;
    }
}