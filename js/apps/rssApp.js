import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

export class RssApp extends BaseApp {
    async render(app) {
        const title = app.data.customTitle || "RSS FEED";

        return `
            <div class="app-content app-type-rss">
                <div class="rss-header">
                    <div class="rss-header-left">
                        <i class="fa-solid fa-rss"></i>
                        <span class="rss-title">${title}</span>
                    </div>
                    <i class="fa-solid fa-rotate-right rss-refresh-btn" title="Refresh Feed"></i>
                </div>
                <div class="rss-list">Loading...</div>
            </div>`;
    }

    async onMount(el, app) {
        const rawUrls = app.data.url || "";
        const urls = rawUrls.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
        const intervalTime = parseInt(app.data.interval) || 60000 * 15;

        if (urls.length === 0) {
            el.querySelector('.rss-list').innerHTML = '<div style="opacity:0.5; text-align:center; padding:10px;">No URL set</div>';
            return;
        }

        const fetchFeed = async () => {
            const listEl = el.querySelector('.rss-list');
            const refreshBtn = el.querySelector('.rss-refresh-btn');

            // Visual loading state
            if (refreshBtn) refreshBtn.classList.add('fa-spin');

            let allItems = [];
            let errors = 0;

            await Promise.all(urls.map(async (url) => {
                try {
                    const xmlStr = await fetchWithFallback(url);
                    const items = parseRss(xmlStr);
                    allItems = allItems.concat(items);
                } catch (err) {
                    console.error(`[RSS] Failed to load ${url}:`, err);
                    errors++;
                }
            }));

            // Remove loading state
            if (refreshBtn) refreshBtn.classList.remove('fa-spin');

            if (allItems.length === 0) {
                listEl.innerHTML = `<div style="opacity:0.6; text-align:center; padding:10px; font-size:0.8rem;">
                    ${errors > 0 ? "Blocked by CORS.<br>Trying Proxy..." : "No items found."}
                </div>`;
                return;
            }

            // Sort Newest First
            allItems.sort((a, b) => b.dateObj - a.dateObj);

            let html = '';
            allItems.slice(0, 50).forEach(item => {
                // Image Logic: Thumb -> Favicon -> None
                let imgHtml = '';

                if (item.image) {
                    imgHtml = `<div class="rss-thumb" style="background-image: url('${item.image}')"></div>`;
                } else {
                    const iconUrl = `https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`;
                    imgHtml = `<img src="${iconUrl}" class="rss-icon" loading="lazy" onerror="this.style.opacity='0'">`;
                }

                html += `
                    <a href="${item.link}" target="_blank" class="rss-item">
                        ${imgHtml}
                        <div class="rss-item-main">
                            <div class="rss-item-title">${item.title}</div>
                            <div class="rss-item-meta">
                                <span class="rss-date">${item.dateDisplay}</span>
                                <span class="rss-domain badge">${item.domain}</span>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right rss-arrow"></i>
                    </a>
                `;
            });

            listEl.innerHTML = html;
        };

        // Manual Refresh Handler
        const btn = el.querySelector('.rss-refresh-btn');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation(); // Prevent card drag/click
                fetchFeed();
            };
        }

        // Initial Load
        fetchFeed();

        // Auto Refresh
        setInterval(fetchFeed, intervalTime);
    }
}

// --- HELPERS ---

async function fetchWithFallback(url) {
    try {
        const res = await fetch(url);
        if (res.ok) return await res.text();
        throw new Error("Direct fetch failed");
    } catch (e) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Proxy fetch failed");
        return await res.text();
    }
}

function parseRss(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const nodes = Array.from(xml.querySelectorAll("item, entry"));

    return nodes.map(node => {
        const title = getVal(node, "title");
        let link = getVal(node, "link");
        if (!link) link = node.querySelector("link")?.getAttribute("href");

        const dateStr = getVal(node, "pubDate") || getVal(node, "updated") || getVal(node, "dc:date");
        const dateObj = dateStr ? new Date(dateStr) : new Date(0);

        let domain = "";
        try { domain = new URL(link).hostname.replace('www.', ''); } catch(e){}

        // --- IMAGE HUNTING ---
        let image = "";

        // 1. YouTube Special (Use mqdefault for 16:9 no-bars)
        if (link && (link.includes("youtube.com") || link.includes("youtu.be"))) {
            const videoIdMatch = link.match(/(?:v=|youtu\.be\/)([\w-]+)/);
            if (videoIdMatch) {
                // mqdefault = 320x180 (16:9, NO black bars)
                // hqdefault = 480x360 (4:3, HAS black bars)
                image = `https://i.ytimg.com/vi/${videoIdMatch[1]}/mqdefault.jpg`;
            }
        }

        // 2. Standard RSS Tags
        if (!image) {
            const media = node.querySelector("content, thumbnail");
            if (media && media.getAttribute("url")) image = media.getAttribute("url");
        }

        if (!image) {
            const enclosure = node.querySelector("enclosure[type^='image']");
            if (enclosure) image = enclosure.getAttribute("url");
        }

        // 3. Description Parse
        if (!image) {
            const desc = getVal(node, "description") || getVal(node, "content:encoded") || getVal(node, "content");
            if (desc) {
                const imgMatch = desc.match(/src=["'](.*?)["']/);
                if (imgMatch) image = imgMatch[1];
            }
        }

        return {
            title,
            link,
            dateObj,
            dateDisplay: dateObj.toLocaleDateString(undefined, { month:'short', day:'numeric' }),
            domain,
            image
        };
    });
}

function getVal(parent, tag) {
    const el = parent.querySelector(tag);
    return el ? el.textContent.trim() : "";
}

registry.register('rss', RssApp, {
    label: 'RSS Reader',
    category: 'data',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        {
            name: 'url',
            label: 'Feed URLs',
            type: 'textarea',
            placeholder: 'https://site1.com/rss\nhttps://site2.com/feed'
        },
        { name: 'customTitle', label: 'Header Title', type: 'text', placeholder: 'My Feeds' },
        { name: 'interval', label: 'Refresh (ms)', type: 'text', defaultValue: '900000' }
    ],
    css: `
        .app-type-rss {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
            overflow: hidden; padding: 0; background: var(--bg-surface);
            z-index: 1;
        }

        .rss-header {
            padding: 8px 10px; border-bottom: 1px solid var(--border-dim);
            background: var(--bg-surface);
            display: flex; justify-content: space-between; align-items: center;
            flex-shrink: 0; color: var(--brand-secondary);
        }

        .rss-header-left { display: flex; align-items: center; gap: 8px; }
        .rss-title { font-weight: bold; font-size: 0.8rem; letter-spacing: 1px; color: var(--text-main); text-transform: uppercase; }

        .rss-refresh-btn {
            cursor: pointer; opacity: 0.7; transition: opacity 0.2s, transform 0.3s;
            padding: 4px; /* Hitbox */
        }
        .rss-refresh-btn:hover { opacity: 1; color: var(--brand-primary); }

        .rss-list {
            flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column;
        }
        .rss-list::-webkit-scrollbar { width: 4px; }

        .rss-item {
            display: flex; align-items: center;
            padding: 10px; border-bottom: 1px solid var(--border-dim);
            text-decoration: none; color: var(--text-main);
            transition: background 0.2s;
        }
        .rss-item:hover { background: var(--bg-highlight); }
        .rss-item:last-child { border-bottom: none; }

        /* Thumbnails (Article/Video Image) */
        .rss-thumb {
            width: 40px; height: 40px;
            border-radius: 4px; margin-right: 12px;
            /* Ensure it fills the square */
            background-size: cover;
            background-position: center;
            background-color: rgba(255,255,255,0.05);
            flex-shrink: 0;
        }

        /* Favicon Fallback */
        .rss-icon {
            width: 24px; height: 24px;
            border-radius: 4px; margin-right: 12px; margin-left: 8px;
            object-fit: cover; flex-shrink: 0;
        }

        .rss-item-main { flex: 1; min-width: 0; padding-right: 10px; }

        .rss-item-title {
            font-size: 0.85rem; font-weight: bold; line-height: 1.3; margin-bottom: 4px;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        .rss-item-meta { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--text-muted); }

        .rss-domain.badge {
            background: rgba(255,255,255,0.1); border: none; font-weight: normal;
            font-size: 0.65rem; opacity: 0.8;
        }

        .rss-arrow { font-size: 0.7rem; color: var(--text-muted); opacity: 0.5; }
    `
});