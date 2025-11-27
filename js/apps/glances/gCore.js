import { resolveToHex } from "../../utils.js";

// Shared Config
// 60 points = 1 Minute of history (assuming 1s interval)
export const HISTORY_SIZE = 60;

// Helper: Format Bytes
export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper: Generic API Fetcher
export async function fetchGlances(url, apiVer, endpoint) {
    const target = `${url}/api/${apiVer}/${endpoint}`;
    const res = await fetch(target);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
}

// Helper: Shared Canvas Graph Drawer
export function drawGraph(canvas, ctx, dataPoints, colorVar, maxValOverride = null) {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Use save/restore to ensure clipping doesn't persist across frames
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1. Resolve Colors
    const style = getComputedStyle(document.documentElement);

    // Main Line Color
    const brandColor = style.getPropertyValue(colorVar).trim();
    const hexColor = resolveToHex(brandColor) || '#ffffff';

    // Grid Line Color (Derived from Border Dim)
    const gridBase = style.getPropertyValue('--border-dim').trim();
    const gridHex = resolveToHex(gridBase) || '#888888';

    // 2. Draw Background & Container (Smart Check)
    // We check if this canvas is inside a 'core-graph-cell' (PerCpu).
    // If so, we SKIP drawing the background because CSS handles it there.
    // For all other graphs (Main CPU, Mem, Net), we draw the container box.
    const isPerCpu = canvas.parentElement?.classList.contains('core-graph-cell');

    if (!isPerCpu) {
        ctx.beginPath();
        // Modern rounded corners
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, w, h, 4); // 4px radius matches theme
        } else {
            ctx.rect(0, 0, w, h);
        }

        // Fill Background (Darkened)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Stroke Border (Solid Dim)
        ctx.strokeStyle = gridHex;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Clip subsequent drawing (Grid/Fill) to this box
        ctx.clip();
    }

    // 3. Draw Grid Lines
    ctx.beginPath();
    ctx.strokeStyle = gridHex + '80'; // 50% opacity
    ctx.lineWidth = 1;

    // Horizontal Lines (3 internal lines)
    for (let i = 1; i < 4; i++) {
        const y = Math.floor((h / 4) * i);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }

    // Vertical Lines (11 internal lines -> 5s intervals)
    for (let i = 1; i < 12; i++) {
        const x = Math.floor((w / 12) * i);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    ctx.stroke();

    // 4. Scaling Logic
    let maxVal = 100;
    if (maxValOverride !== null) {
        maxVal = maxValOverride;
    }

    // 5. Draw Data Line
    ctx.beginPath();
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 2;
    const stepX = w / (HISTORY_SIZE - 1);

    dataPoints.forEach((val, i) => {
        const x = i * stepX;
        let yRatio = val / maxVal;
        if (yRatio > 1) yRatio = 1;
        if (yRatio < 0) yRatio = 0;

        const y = h - (yRatio * h);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 6. Draw Gradient Fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hexColor + '40');
    grad.addColorStop(1, hexColor + '00');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
}