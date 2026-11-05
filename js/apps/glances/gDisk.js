import { fetchGlances, formatBytes } from './gCore.js';
import { asList, sampleRate, storageVolumes } from './gCore.js';
import { createSeriesGraph } from './gCore.js';
import { resolveToHex, escapeHtml } from '../../utils.js';

export function diskSamples(raw) {
    return asList(raw).flatMap(d => {
        const name = d.disk_name || d.name;
        if (!name) return [];
        return [
            { id: `${name}:read`, colorKey: name, label: `${name} R`, value: sampleRate(d, 'read_bytes') },
            { id: `${name}:write`, colorKey: name, label: `${name} W`, value: sampleRate(d, 'write_bytes'), dashed: true }
        ];
    });
}

export function initDisk(el, config) {
    const body = el.querySelector('.glances-body');
    body.classList.add('disk-body');
    body.innerHTML = '<div class="disk-header-section series-widget"></div><div class="disk-grid"></div>';
    const update = createSeriesGraph(body.firstElementChild, { addCleanup: config.addCleanup, floor: 1024 });
    return async () => {
        const [io, fs] = await Promise.all([
            fetchGlances(config.url, config.apiVer, 'diskio'),
            fetchGlances(config.url, config.apiVer, 'fs')
        ]);
        const samples = diskSamples(io);
        el.querySelector('.metric-title').textContent = 'DISK I/O';
        // Listing devices avoids double-counting parent disks and their partitions.
        el.querySelector('.metric-value').textContent = `${samples.length / 2} drives`;
        update(samples, value => `${formatBytes(value)}/s`);
        const grid = el.querySelector('.disk-grid');
        grid.replaceChildren();
        for (const volume of storageVolumes(fs)) {
            const card = document.createElement('div');
            card.className = 'disk-card';
            card.innerHTML = `<div class="disk-pie-wrapper"><canvas width="50" height="50"></canvas><div class="disk-percent">${Math.round(volume.percent)}%</div></div>
                <div class="disk-info"><div class="disk-name" title="${escapeHtml(volume.device)}">${escapeHtml(volume.name)}</div>
                <div class="disk-meta">${escapeHtml(volume.mount)}</div><div class="disk-meta">${formatBytes(volume.used)} / ${formatBytes(volume.size)}</div></div>`;
            grid.appendChild(card);
            drawPie(card.querySelector('canvas').getContext('2d'), volume.percent, volume.percent > 90 ? '--red' : volume.percent > 75 ? '--orange' : '--cyan', '--bg-highlight');
        }
        if (!grid.children.length) grid.textContent = 'No storage volumes reported';
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
