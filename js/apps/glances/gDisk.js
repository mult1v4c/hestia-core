//
import { fetchGlances, drawGraph, HISTORY_SIZE, formatBytes } from "./gCore.js";
import { resolveToHex } from "../../utils.js";

export function initDisk(el, config) {
    const { url, apiVer, dataPoints } = config;
    const bodyEl = el.querySelector('.glances-body');
    let lastIo = null;

    // 1. Setup DOM
    // Removed inline styles, added 'disk-header-section' class
    bodyEl.innerHTML = `
        <div class="disk-header-section">
            <canvas class="glances-graph"></canvas>
            <div class="disk-io-overlay">
                <span id="io-read">R: --</span>
                <span id="io-write">W: --</span>
            </div>
        </div>
        <div class="disk-grid" id="disk-grid">Scanning...</div>
    `;

    const canvas = el.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const titleEl = el.querySelector('.metric-title');
    const valEl = el.querySelector('.metric-value');

    // Resize Observer for Graph
    // We observe the new container class
    const wrapper = el.querySelector('.disk-header-section');
    if (wrapper) {
        new ResizeObserver(() => {
            canvas.width = wrapper.clientWidth;
            canvas.height = wrapper.clientHeight;
            // Redraw graph if data exists
            if (dataPoints.length > 0) {
                const peak = Math.max(...dataPoints, 1024 * 1024); // Min 1MB scale
                drawGraph(canvas, ctx, dataPoints, '--purple', peak * 1.2);
            }
        }).observe(wrapper);
    }

    // 2. Return Update Function
    return async () => {
        const [diskIoData, fsData] = await Promise.all([
            fetchGlances(url, apiVer, 'diskio'),
            fetchGlances(url, apiVer, 'fs')
        ]);

        // --- PART A: Total I/O Speed (Graph) ---
        const ioList = Array.isArray(diskIoData) ? diskIoData : Object.values(diskIoData);
        let totalRead = 0;
        let totalWrite = 0;

        ioList.forEach(d => {
            totalRead += d.read_bytes;
            totalWrite += d.write_bytes;
        });

        const now = Date.now();

        if (lastIo) {
            const timeDiff = (now - lastIo.time) / 1000;
            if (timeDiff > 0) {
                const rSpeed = Math.max(0, (totalRead - lastIo.read) / timeDiff);
                const wSpeed = Math.max(0, (totalWrite - lastIo.write) / timeDiff);
                const totalSpeed = rSpeed + wSpeed;

                titleEl.innerText = "DISK I/O";
                valEl.innerText = formatBytes(totalSpeed) + '/s';

                el.querySelector('#io-read').innerText = `R: ${formatBytes(rSpeed)}/s`;
                el.querySelector('#io-write').innerText = `W: ${formatBytes(wSpeed)}/s`;

                dataPoints.push(totalSpeed);
                if (dataPoints.length > HISTORY_SIZE) dataPoints.shift();

                const peak = Math.max(...dataPoints, 1024 * 1024);
                drawGraph(canvas, ctx, dataPoints, '--purple', peak * 1.2);
            }
        } else {
            titleEl.innerText = "DISK I/O";
            valEl.innerText = "Calc...";
        }

        lastIo = { read: totalRead, write: totalWrite, time: now };

        // --- PART B: File System Usage (Pie Grid) ---
        const fsList = Array.isArray(fsData) ? fsData : Object.values(fsData);
        const grid = el.querySelector('#disk-grid');

        // Only rebuild if count changes to prevent flicker,
        // but for now simple rebuild is safer for responsive grid
        grid.innerHTML = '';

        fsList.forEach(fs => {
            // Filter out tiny loops/snaps if needed, but showing all for now
            if (fs.size < 1024 * 1024 * 100) return; // Skip < 100MB partitions (usually noise)

            const card = document.createElement('div');
            card.className = 'disk-card';

            // Shorten name
            const name = fs.mnt_point === '/' ? 'Root' : fs.mnt_point;

            card.innerHTML = `
                <div class="disk-pie-wrapper">
                    <canvas width="50" height="50"></canvas>
                    <div class="disk-percent">${Math.round(fs.percent)}%</div>
                </div>
                <div class="disk-info">
                    <div class="disk-name" title="${fs.mnt_point}">${name}</div>
                    <div class="disk-meta">${formatBytes(fs.used)} / ${formatBytes(fs.size)}</div>
                </div>
            `;

            grid.appendChild(card);

            const pCanvas = card.querySelector('canvas');
            const pCtx = pCanvas.getContext('2d');
            drawPie(pCtx, fs.percent, '--cyan', '--bg-highlight');
        });
    };
}

function drawPie(ctx, percent, colorVar, bgVar) {
    const w = 50, h = 50;
    const x = w / 2, y = h / 2, radius = 20;
    const start = -Math.PI / 2;
    const slice = (Math.PI * 2) * (percent / 100);

    const brandColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue(bgVar).trim();

    ctx.clearRect(0,0,w,h);

    // Background
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = resolveToHex(bgColor) || '#333';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Fill
    ctx.beginPath();
    ctx.arc(x, y, radius, start, start + slice);
    ctx.strokeStyle = resolveToHex(brandColor) || '#0ff';
    ctx.lineWidth = 6;
    ctx.stroke();
}