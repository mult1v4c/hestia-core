# 🔥 Project Hestia v0.1.0

![Preview](assets/preview.gif)

Welcome to **Project Hestia**\! This is a modular, grid-based dashboard that runs entirely in the browser (no complex backend required) but includes powerful integrations for your homelab services.

This was made for personal use but as I made more features available, I thought this could be shared with anyone willing to learn how the framework operates.

Inspired by the likes of Homarr, Dash., and Homepage.

## ✨ Features

  * **🎨 Deep Theming:**
      * Full **Base16** palette support (Dracula, Nord, Monokai, etc.).
      * Customize every pixel: gap sizes, corner radii, fonts, and shadows.
      * Create and save your own custom presets directly in the UI.
  * **⚡ Snappy Grid System:**
      * Powered by the **View Transitions API** for butter-smooth animations when moving or resizing widgets.
      * Drag-and-drop layout with auto-saving.
  * **💾 Smart Persistence:**
      * **No Database Required:** Configuration saves to `localStorage`.
      * **IndexedDB Support:** Upload high-res images directly to the dashboard without hitting storage quotas.
  * **🐳 Homelab Integrations:**
      * Connects to **Glances**, **Pi-hole**, **Deluge**, and **Jellyfin**.
      * Includes a pre-configured Nginx proxy to handle CORS issues automatically.

## 📦 Included Apps

Hestia comes with a suite of built-in apps. You can add as many as you like\!

### 🏠 Essentials

  * **Clock:** Digital clock with 12h/24h formats.
  * **Weather:** Live local weather powered by [Open-Meteo](https://open-meteo.com/).
  * **Calendar:** A simple monthly view.
  * **Notes:** Sticky notes with full **Markdown** support (Lists, Checkboxes, Headers).
  * **Links:** Bookmarks with "Cover" mode and "Colorize" options to match your theme.

### 📊 Data & Homelab

  * **Glances:** Detailed server monitoring (CPU, Mem, Disk I/O, Network, Sensors). Supports Docker container lists\!
  * **Pi-hole:** View total queries, blocked count, and ratio.
  * **Deluge:** Monitor download/upload speeds and active torrent queues.
  * **Jellyfin:** Shows "Now Playing" backdrop or a shelf of "Latest Added" media.
  * **System Fetch:** A "Neofetch-style" info card for your browser or server.

### 🎨 Visuals

  * **Image Frame:** Display photos or logos (upload or URL).
  * **Matrix Rain:** The classic falling code effect.
  * **Pipes:** A retro 3D pipes screensaver widget.

-----

## 🚀 Getting Started

### Option 1: Docker Compose (Recommended)

This is the fastest way to get Hestia (and its homelab proxies) online. The Compose file wires up Nginx, health checks, and optional proxy snippets for you.

1.  Clone the repository:

    ```bash
    git clone https://github.com/mult1v4c/hestia-core
    cd hestia-core
    ```

2.  Copy the default environment file and tweak anything you need (host port, proxy targets, etc.):

    ```bash
    cp compose.env.example .env
    # edit .env to point at your Pi-hole / Deluge / Jellyfin hosts
    ```

3.  (Optional) Drop any extra Nginx snippets into `config/nginx/` if you need to proxy additional apps.

4.  Build and start the stack:

    ```bash
    docker compose up -d
    ```

    > Need Hestia to reach services defined in another Compose project? Add its network name under `services.hestia.networks` in `compose.yaml`, or connect the container later with `docker network connect`.

5.  Visit `http://localhost:8080` (or whatever `HOST_PORT` you set).

### Option 2: Docker CLI

Prefer raw `docker build`/`docker run`? The classic workflow still works and now ships with the same dynamic config generator used by Compose.

```bash
docker build -t hestia-core .
docker run -d -p 8080:80 --name hestia --env-file .env hestia-core
```

Set any of the variables shown in `compose.env.example` (e.g., `PIHOLE_PROXY_TARGET`) to customize the generated Nginx config before starting the container.

### Option 3: Static / Manual

Since Hestia is vanilla JavaScript, you can run it on any web server.

```bash
# Example using Python
python3 -m http.server 8000
```

*Note: Without the Nginx proxy included in the Dockerfile, some external APIs (like Deluge or Pi-hole) might block connections due to CORS policies.*

-----

## ⚙️ Configuration Guide

### Using the Proxy (Docker Only)

Hestia's container publishes a small reverse proxy for the integrations, so the UI can talk to your homelab services without CORS issues. When configuring apps inside the dashboard, point them at these relative paths:

  * **Pi-hole URL:** `/pi-api/admin/api.php` (instead of `http://192.168.x.x/...`)
  * **Deluge URL:** `/deluge-api/json`
  * **Jellyfin URL:** `/jellyfin-api/`

All of the proxy blocks are generated from environment variables at container start-up. The most common knobs live in `.env`:

| Variable | Purpose |
| --- | --- |
| `ENABLE_PIHOLE_PROXY` | Toggle the Pi-hole proxy block without editing Nginx. |
| `PIHOLE_PROXY_TARGET` | Upstream URL for your Pi-hole instance (e.g., `https://10.0.0.2`). |
| `DELUGE_PROXY_TARGET` | RPC endpoint for Deluge (default `http://deluge:8112/`). |
| `JELLYFIN_PROXY_TARGET` | Base URL for Jellyfin (default `http://jellyfin:8096/`). |

> Leave `DELUGE_HOST_HEADER` and `JELLYFIN_HOST_HEADER` blank unless you need to override them—the entrypoint falls back to Nginx's `$host` variable automatically.

You can also change the exposed paths (`*_PROXY_PATH`) or disable any integration with `ENABLE_*_PROXY=false`. For additional services, drop custom `.conf` snippets into `config/nginx/`—they are loaded automatically on container start.

---

## Data Backup

You can export your entire theme and grid layout to a JSON file via the **Settings Panel** (Gear Icon). This is great for backing up your setup or sharing themes with friends\!

> [!Warning]
> **CHECK YOUR JSON FILES BEFORE SHARING!**
> The export function will export ALL of the dashboard settings, including themes, color palettes, and app data and settings. **Which means API keys, IP addresses, and passwords included**.
> I've included safeguards to clean keys, user IDs, and other sensitive information. But still check to make sure!


-----

## 🛠️ Developer Guide

Want to build your own widget? Hestia uses a simple class-based system.

1.  **Create a file:** `js/apps/myApp.js`
2.  **Extend BaseApp:**

<!-- end list -->

```javascript
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

class MyApp extends BaseApp {
    // 1. Render HTML
    async render(app) {
        return `
            <div class="my-app">
                Hello ${app.data.name || 'World'}!
            </div>
        `;
    }

    // 2. Logic after DOM insertion
    onMount(el, app) {
        console.log("I am alive!");
    }
}

// 3. Register
registry.register('my-app', MyApp, {
    label: 'My Cool App',
    category: 'static',
    defaultSize: { cols: 2, rows: 1 },
    settings: [
        { name: 'name', label: 'Who to greet?', type: 'text' }
    ],
    css: `.my-app { color: var(--brand-primary); font-weight: bold; }`
});
```

3.  **Import it:** Add `import './myApp.js';` to `js/apps/appIndex.js`.

-----

## 📄 License

Project Hestia is open-source and licensed under the **MIT License**.