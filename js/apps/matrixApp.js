import { BaseApp } from "./baseApp.js";
import { registry } from "../registry.js";

export class MatrixApp extends BaseApp {
    async render(app) {
        return `<canvas id="matrix-${app.id}" class="matrix-canvas"></canvas>`;
    }

    onMount(el, app) {
        const canvas = el.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        let interval;

        // Settings
        const color = app.data.color || '#0F0';
        const speed = parseInt(app.data.speed) || 50;
        const fontSize = 14;

        // State
        let cols;
        let drops = [];

        const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        const resize = () => {
            if (!el.isConnected) return;
            const rect = el.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            cols = Math.ceil(canvas.width / fontSize);

            if (drops.length < cols) {
                for (let i = drops.length; i < cols; i++) {
                    drops[i] = Math.random() * -100; // Stagger starts
                }
            }
        };

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = color;
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < cols; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                ctx.fillText(text, x, y);

                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(el);

        interval = setInterval(draw, speed);

        this.cleanup = () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }
}

registry.register('matrix', MatrixApp, {
    label: 'Matrix Rain',
    category: 'static',
    defaultSize: { cols: 1, rows: 1 },
    settings: [
        { name: 'color', label: 'Matrix Color', type: 'color', defaultValue: '#00FF00' },
        { name: 'speed', label: 'Speed (Lower is Faster)', type: 'text', defaultValue: '50' }
    ],
    css: `
        .matrix-canvas {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: block;
            background-color: #000;
            z-index: 0; /* Ensure it stays behind controls */
        }
    `
});