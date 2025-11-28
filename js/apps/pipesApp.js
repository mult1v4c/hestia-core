// js/apps/pipesApp.js
import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";
import { resolveToHex } from "../utils.js";

export class PipesApp extends BaseApp {
    async render(app) {
        return `<canvas id="pipes-${app.id}" class="pipes-canvas"></canvas>`;
    }

    onMount(el, app) {
        const canvas = el.querySelector('canvas');
        const ctx = canvas.getContext('2d');

        // Configuration
        const gridSize = parseInt(app.data.gridSize) || 20;
        const speed = parseInt(app.data.speed) || 50;
        const pipeCount = parseInt(app.data.pipeCount) || 3;
        const turnChance = 0.1;
        // REMOVED: const showOutlines = ...

        // State
        let pipes = [];
        let interval;
        let w, h, cols, rows;

        const colors = [
            'var(--base08)', 'var(--base09)', 'var(--base0A)', 'var(--base0B)',
            'var(--base0C)', 'var(--base0D)', 'var(--base0E)', 'var(--base0F)'
        ];

        // --- 1. Resize Handler ---
        const resize = () => {
            if (!el.isConnected) return;
            const rect = el.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            w = rect.width;
            h = rect.height;
            cols = Math.floor(w / gridSize);
            rows = Math.floor(h / gridSize);

            // Clear screen
            ctx.fillStyle = resolveToHex('var(--bg-canvas)');
            ctx.fillRect(0, 0, w, h);

            pipes = [];
            for(let i=0; i<pipeCount; i++) spawnPipe();
        };

        // --- 2. Pipe Logic ---
        const spawnPipe = () => {
            pipes.push({
                x: Math.floor(Math.random() * cols),
                y: Math.floor(Math.random() * rows),
                dir: Math.floor(Math.random() * 4),
                color: colors[Math.floor(Math.random() * colors.length)],
                alive: true
            });
        };

        const step = () => {
            // Fade Effect (The background clear)
            const bgHex = resolveToHex('var(--bg-canvas)');
            ctx.fillStyle = bgHex + '20'; // '10' = Hex Transparency
            ctx.fillRect(0, 0, w, h);

            pipes.forEach((p, index) => {
                if (!p.alive) {
                    if (Math.random() > 0.95) {
                        pipes[index] = {
                            x: Math.floor(Math.random() * cols),
                            y: Math.floor(Math.random() * rows),
                            dir: Math.floor(Math.random() * 4),
                            color: colors[Math.floor(Math.random() * colors.length)],
                            alive: true
                        };
                    }
                    return;
                }

                const prevX = p.x;
                const prevY = p.y;

                // Move
                if (p.dir === 0) p.y--;
                else if (p.dir === 1) p.x++;
                else if (p.dir === 2) p.y++;
                else if (p.dir === 3) p.x--;

                // Bounds Check
                if (p.x < 0 || p.x >= cols || p.y < 0 || p.y >= rows) {
                    p.alive = false;
                    return;
                }

                const half = gridSize / 2;
                const startX = (prevX * gridSize) + half;
                const startY = (prevY * gridSize) + half;
                const endX = (p.x * gridSize) + half;
                const endY = (p.y * gridSize) + half;

                ctx.lineCap = 'butt';
                ctx.lineJoin = 'butt';

                const pipeColorHex = resolveToHex(p.color);
                const pipeWidth = gridSize / 2;

                // REMOVED: Outline drawing logic

                // 1. PATCH THE JOINT (The Fix!)
                // We draw a solid circle at the starting point.
                ctx.beginPath();
                ctx.fillStyle = pipeColorHex;
                // Radius is half of lineWidth (which is gridSize/2), so gridSize/4
                ctx.arc(startX, startY, pipeWidth / 2, 0, Math.PI * 2);
                ctx.fill();

                // 2. DRAW PIPE BODY
                ctx.beginPath();
                ctx.strokeStyle = pipeColorHex;
                ctx.lineWidth = pipeWidth;
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Turn logic
                if (Math.random() < turnChance) {
                    const turn = Math.random() > 0.5 ? 1 : -1;
                    p.dir = (p.dir + turn + 4) % 4;
                }
            });
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(el);

        interval = setInterval(step, speed);

        this.cleanup = () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }
}

registry.register('pipes', PipesApp, {
    label: 'Pipes Screensaver',
    category: 'static',
    defaultSize: { cols: 2, rows: 2 },
    settings: [
        { name: 'pipeCount', label: 'Number of Pipes', type: 'text', defaultValue: '3' },
        { name: 'gridSize', label: 'Thickness (px)', type: 'text', defaultValue: '20' },
        { name: 'speed', label: 'Speed (ms)', type: 'text', defaultValue: '50' }
        // REMOVED: Outlines setting
    ],
    css: `
        .pipes-canvas {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: block;
            background-color: var(--bg-canvas);
            z-index: 0;
            border-radius: var(--radius);
        }
    `
});