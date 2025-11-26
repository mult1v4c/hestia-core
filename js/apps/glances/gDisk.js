import { fetchGlances, drawGraph, HISTORY_SIZE, formatBytes } from "./gCore.js";
import { resolveToHex } from "../../utils.js";

export function initDisk(el, config) {
    const { url, apiVer, dataPoints } = config;
    const bodyEl = el.querySelector('.glances-body');
    let lastIo = null;

    // 1. Setup DOM
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

    // Resize Observer
    const wrapper = el.querySelector('.disk-header-section');
    if (wrapper) {
        new ResizeObserver(() => {
            canvas.width = wrapper.clientWidth;
            canvas.height = wrapper.clientHeight;
            if (dataPoints.length > 0) {
                const peak = Math.max(...dataPoints, 1024 * 1024);
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

        grid.innerHTML = '';

        // --- DEDUPLICATION LOGIC ---
        // Keep track of devices we've already drawn to avoid duplicates
        const seenDevices = new Set();

        fsList.forEach(fs => {
            const dev = fs.device_name;

            // 1. Filter out Loopback devices (Snaps)
            if (dev.startsWith('/dev/loop')) return;

            // 2. Must be a physical device
            if (!dev.startsWith('/dev/')) return;

            // 3. Deduplicate!
            // If we have already seen 'nvme0n1p2', skip this entry
            if (seenDevices.has(dev)) return;
            seenDevices.add(dev);

            // --- DISPLAY LOGIC ---
            // Clean up device name: "/dev/nvme0n1p2" -> "nvme0n1p2"
            let prettyName = dev.replace('/dev/', '');

            // For the sub-label, since mount points are messy in Docker (/etc/hosts),
            // we will just show "Physical Vol" or "Partition"
            let subLabel = "Volume";
            if (fs.mnt_point === '/') subLabel = 'Root';

            const card = document.createElement('div');
            card.className = 'disk-card';

            card.innerHTML = `
                <div class="disk-pie-wrapper">
                    <canvas width="50" height="50"></canvas>
                    <div class="disk-percent">${Math.round(fs.percent)}%</div>
                </div>
                <div class="disk-info">
                    <div class="disk-name" title="${dev}">${prettyName}</div>
                    <div class="disk-meta">${subLabel}</div>
                    <div class="disk-meta">${formatBytes(fs.used)} / ${formatBytes(fs.size)}</div>
                </div>
            `;

            grid.appendChild(card);

            const pCanvas = card.querySelector('canvas');
            const pCtx = pCanvas.getContext('2d');

            // Color Logic
            let colorVar = '--cyan';
            if (fs.percent > 90) colorVar = '--red';
            else if (fs.percent > 75) colorVar = '--orange';

            drawPie(pCtx, fs.percent, colorVar, '--bg-highlight');
        });

        if (grid.children.length === 0) {
             grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; opacity:0.5; font-size:0.8rem; padding-top:10px;">No volumes found</div>';
        }
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