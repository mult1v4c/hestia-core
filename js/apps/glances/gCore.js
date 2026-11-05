import { resolveToHex } from "../../utils.js";

// Shared Config
// 60 points = 1 Minute of history (assuming 1s interval)
export const HISTORY_SIZE = 60;

import { requestJson } from '../baseApp.js';

export async function fetchGlances(url, apiVer, endpoint) {
    const base = url.trim().replace(/\/+$/, '').replace(/\/api\/\d+$/, '');
    return requestJson(`${base}/api/${apiVer}/${endpoint}`);
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
export function asList(data) {
    return Array.isArray(data) ? data : Object.values(data || {});
}

export function formatBytes(value, decimals = 1) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const index = Math.max(0, Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024))));
    return `${Number((bytes / 1024 ** index).toFixed(decimals))} ${units[index]}`;
}

// Glances exposes interval deltas, or explicit rates in newer versions.
// Do not differentiate interval samples a second time.
export function sampleRate(sample, field) {
    const rate = sample[`${field}_rate_per_sec`];
    if (rate != null && Number.isFinite(Number(rate))) return Math.max(0, Number(rate));
    const seconds = Number(sample.time_since_update);
    const value = sample[field];
    return seconds > 0 && value != null && Number.isFinite(Number(value)) ? Math.max(0, Number(value) / seconds) : null;
}

export function storageVolumes(raw) {
    const volumes = new Map();
    const pseudo = /^(tmpfs|devtmpfs|proc|sysfs|overlay|squashfs|ramfs|cgroup2?|autofs|devfs|debugfs|tracefs|securityfs|fusectl|mqueue|hugetlbfs)$/i;
    for (const fs of asList(raw)) {
        if (!fs || typeof fs !== 'object') continue;
        const device = String(fs.device_name || fs.mnt_point || 'Volume');
        const mount = String(fs.mnt_point || '');
        const size = Number(fs.size ?? fs.total);
        const used = Number(fs.used ?? (size - Number(fs.free)));
        if (pseudo.test(fs.fs_type || '') || /^\/dev\/(loop|ram)\d/.test(device) || /^\/snap(?:\/|$)/.test(mount)) continue;
        if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(used)) continue;
        // Bind mounts repeat a filesystem. Keep partitions, pools and network shares separate.
        const key = `${device}|${fs.fs_type || ''}`;
        const entry = { device, mount, size, used: Math.max(0, Math.min(size, used)), name: device.replace(/^\/dev\//, '') };
        entry.percent = Math.max(0, Math.min(100, Number.isFinite(Number(fs.percent)) && fs.percent != null ? Number(fs.percent) : entry.used / size * 100));
        if (!volumes.has(key) || mount === '/' || mount.length < volumes.get(key).mount.length) volumes.set(key, entry);
    }
    return [...volumes.values()];
}


// Fixed automatic colors: a sensor/drive keeps its color as values change.
const colors = ['#66c2ff', '#ffb454', '#a8df8e', '#e795ed', '#ff7b86', '#5edbc4', '#ded575', '#b3a3ff'];

export function createSeriesGraph(wrapper, { addCleanup, unit = '', floor = 1 } = {}) {
    wrapper.innerHTML = '<div class="series-plot"><canvas class="glances-graph"></canvas></div><div class="series-scale"></div><div class="series-legend"></div>';
    const plot = wrapper.querySelector('.series-plot');
    const canvas = wrapper.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const legend = wrapper.querySelector('.series-legend');
    const scale = wrapper.querySelector('.series-scale');
    const history = new Map();
    const assignments = new Map();
    let entries = [];
    let rangeLabel = value => `${Math.round(value)}${unit}`;
    const redraw = () => {
        const ratio = window.devicePixelRatio || 1;
        const w = plot.clientWidth, h = plot.clientHeight;
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (!w || !h) return;
        const values = [...history.values()].flat().filter(Number.isFinite);
        const min = Math.min(0, ...values);
        const max = Math.max(floor, ...values) * 1.1;
        ctx.strokeStyle = 'rgba(150,150,150,.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        for (let i = 1; i < 4; i++) { ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4); }
        ctx.stroke();
        for (const entry of entries) {
            ctx.beginPath();
            ctx.strokeStyle = entry.color;
            ctx.lineWidth = 1.7;
            ctx.setLineDash(entry.dashed ? [5, 3] : []);
            let pen = false;
            history.get(entry.id).forEach((value, index) => {
                if (!Number.isFinite(value)) { pen = false; return; }
                const x = index / (HISTORY_SIZE - 1) * w;
                const y = h - 2 - (value - min) / (max - min) * (h - 4);
                if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
                pen = true;
                // A new series should be visible even with only one sample.
                ctx.fillStyle = entry.color;
                ctx.fillRect(x - 1, y - 1, 2, 2);
            });
            ctx.stroke();
        }
        ctx.setLineDash([]);
        scale.textContent = `${rangeLabel(min)} – ${rangeLabel(max)} · last ${HISTORY_SIZE} samples`;
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(plot);
    addCleanup?.(() => observer.disconnect());
    return (samples, formatter = rangeLabel) => {
        rangeLabel = formatter;
        const present = new Set(samples.map(sample => sample.id));
        for (const key of history.keys()) if (!present.has(key)) history.delete(key);
        entries = samples.map(sample => {
            const key = sample.colorKey || sample.id;
            if (!assignments.has(key)) {
                const index = assignments.size;
                assignments.set(key, colors[index] || `hsl(${(index * 137.508) % 360} 70% 65%)`);
            }
            const points = history.get(sample.id) || Array(HISTORY_SIZE).fill(null);
            points.push(Number.isFinite(sample.value) ? sample.value : null);
            points.shift();
            history.set(sample.id, points);
            return { ...sample, color: assignments.get(key) };
        });
        legend.replaceChildren();
        if (!entries.length) legend.textContent = 'No data available';
        for (const entry of entries) {
            const row = document.createElement('span');
            const swatch = document.createElement('i');
            swatch.style.borderTop = `2px ${entry.dashed ? 'dashed' : 'solid'} ${entry.color}`;
            row.append(swatch, document.createTextNode(`${entry.label}: ${entry.value == null ? '—' : formatter(entry.value)}`));
            row.title = row.textContent;
            legend.appendChild(row);
        }
        redraw();
    };
}
