import { resolveToHex } from "../../utils.js";

// Shared Config
export const HISTORY_SIZE = 40;

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
    ctx.clearRect(0, 0, w, h);

    // Resolve Theme Color
    const brandColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    const hexColor = resolveToHex(brandColor) || '#ffffff';

    // Scaling Logic
    let maxVal = 100; // Default ceiling (Percentage)
    if (maxValOverride !== null) {
        maxVal = maxValOverride;
    }

    // Draw Line
    ctx.beginPath();
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 2;
    const stepX = w / (HISTORY_SIZE - 1);

    dataPoints.forEach((val, i) => {
        const x = i * stepX;
        // Map value to canvas height (Inverted Y)
        const y = h - ((val / maxVal) * h);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Gradient Fill
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hexColor + '40');
    grad.addColorStop(1, hexColor + '00');
    ctx.fillStyle = grad;
    ctx.fill();
}