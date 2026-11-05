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
        const gridSize = Math.max(4, Math.min(100, parseInt(app.data.gridSize) || 20));
        const speed = Math.max(16, parseInt(app.data.speed) || 50);
        const pipeCount = Math.max(1, Math.min(50, parseInt(app.data.pipeCount) || 3));
        const turnChance = 0.1;

        // State
        let pipes = [];
        let segments = [];
        let frame = 0;
        const lifetime = 80;
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

            cols = Math.ceil(w / gridSize);
            rows = Math.ceil(h / gridSize);

            // Clear screen
            ctx.clearRect(0, 0, w, h);
            segments = [];
            frame = 0;

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
            if (!el.isConnected) return;
            frame++;
            ctx.clearRect(0, 0, w, h);
            segments = segments.filter(segment => frame - segment.born < lifetime);

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

                segments.push({ startX, startY, endX, endY, color: p.color, born: frame });

                // Turn logic
                if (Math.random() < turnChance) {
                    const turn = Math.random() > 0.5 ? 1 : -1;
                    p.dir = (p.dir + turn + 4) % 4;
                }
            });
            // Redraw bounded history over a transparent canvas. Old pixels vanish completely.
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = gridSize / 2;
            for (const segment of segments) {
                ctx.globalAlpha = Math.pow(1 - (frame - segment.born) / lifetime, 2);
                ctx.strokeStyle = resolveToHex(segment.color);
                ctx.beginPath();
                ctx.moveTo(segment.startX, segment.startY);
                ctx.lineTo(segment.endX, segment.endY);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
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
    label: 'Pipes',
    category: 'static',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        { name: 'pipeCount', label: 'Number of Pipes', type: 'text', defaultValue: '3' },
        { name: 'gridSize', label: 'Thickness (px)', type: 'text', defaultValue: '20' },
        { name: 'speed', label: 'Speed (ms)', type: 'text', defaultValue: '50' }
    ],
    css: `
        .pipes-canvas {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: block;
            background-color: transparent;
            z-index: 0;
            border-radius: var(--radius);
        }
    `
});