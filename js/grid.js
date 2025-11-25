// js/grid.js
import { state, setState } from "./state.js";
import { saveState } from "./storage.js";
import { createEl, qs, qsa } from "./dom.js";
import { showToast } from "./ui/toasts.js";

// IMPORT THE REGISTRY
import { registry } from "./registry.js";

let cachedApps = [];

// -----------------------------
// GRID RENDERING
// -----------------------------

/**
 * Re-renders the entire grid based on the current state.
 */
export async function renderGrid() {
    const dashboard = qs('#dashboard');
    if (!dashboard) return;

    const apps = state.apps;

    // 1. Render Grid Background (Lines)
    renderGridLines();

    // 2. Clear existing apps from DOM to prevent duplication
    const existingCards = qsa('.app-card', dashboard);
    existingCards.forEach(el => el.remove());

    // 3. Render Apps
    for (const app of apps) {
        const el = await createAppElement(app);
        dashboard.appendChild(el);

    }
}

/**
 * Creates the DOM element for a single app card.
 */
async function createAppElement(app) {
    const el = createEl('div', {
        class: 'app-card',
        attrs: {
            id: `app-${app.id}`,
            'data-id': app.id,
            'data-x': app.x,
            'data-y': app.y,
            'data-cols': app.cols,
            'data-rows': app.rows,
            'data-name': app.name,
        },
        style: {
            backgroundColor: app.data.bgColor || 'var(--bg-surface)',
            color: app.data.textColor || 'var(--text-main)',
            gridColumn: `${app.x} / span ${app.cols}`,
            gridRow: `${app.y} / span ${app.rows}`
        }
    });

    // --- FIX: USE NEW REGISTRY LOGIC ---
    // 1. Get the App Definition
    const appDef = registry.get(app.subtype);

    if (!appDef) {
        console.error(`App type not found: ${app.subtype}`);
        el.innerHTML = 'Unknown App';
        return el;
    }

    // 2. Instantiate and Render
    const appInstance = new appDef.Class();
    const innerHTML = await appInstance.render(app);
    // -----------------------------------

    el.innerHTML = `
        ${innerHTML}
        <div class="resize-handle"></div>
        <div class="card-meta">${app.cols}x${app.rows}</div>
        <div class="edit-btn" title="Edit App"><i class="fa-solid fa-pencil"></i></div>
        <div class="delete-btn" title="Delete App"><i class="fa-solid fa-trash"></i></div>
    `;

    if (appInstance.onMount) {
        setTimeout(() => appInstance.onMount(el, app), 0);
    }

    return el;
}

/**
 * Draws the background grid lines based on settings.
 */
export function renderGridLines() {
    const gridLines = qs('#gridLines');
    if (!gridLines) return;

    const cols = parseInt(state.settings.theme.gridColumns) || 10;
    const rows = parseInt(state.settings.theme.gridRows) || 6;
    const count = cols * rows;

    if (gridLines.childElementCount !== count) {
        gridLines.innerHTML = '';
        for (let i = 0; i < count; i++) {
            gridLines.appendChild(createEl('div', { class: 'grid-cell' }));
        }
    }
}

// -----------------------------
// LOGIC & MATH
// -----------------------------

export function applyGridPosition(el, x, y, w, h) {
    el.style.gridColumn = `${x} / span ${w}`;
    el.style.gridRow = `${y} / span ${h}`;
    el.dataset.x = x;
    el.dataset.y = y;
    el.dataset.cols = w;
    el.dataset.rows = h;

    const meta = el.querySelector('.card-meta');
    if (meta) meta.innerText = `${w}x${h}`;
}

export function checkCollision(targetEl, x, y, w, h) {
    cachedApps = Array.from(qsa('.app-card')).map(app => ({
        el: app,
        x: parseInt(app.dataset.x) || 0,
        y: parseInt(app.dataset.y) || 0,
        cols: parseInt(app.dataset.cols) || 1,
        rows: parseInt(app.dataset.rows) || 1
    }));

    const tL = x;
    const tR = x + w;
    const tT = y;
    const tB = y + h;

    for (const app of cachedApps) {
        if (app.el === targetEl) continue;

        if (tL < app.x + app.cols &&
            tR > app.x &&
            tT < app.y + app.rows &&
            tB > app.y) {
            return true;
        }
    }
    return false;
}

export function saveGridState() {
    const cards = qsa('.app-card');
    const newApps = [];
    const currentAppsMap = new Map(state.apps.map(a => [a.id, a]));

    cards.forEach(card => {
        const id = parseInt(card.dataset.id);
        const existing = currentAppsMap.get(id);

        if (existing) {
            newApps.push({
                ...existing,
                x: parseInt(card.dataset.x),
                y: parseInt(card.dataset.y),
                cols: parseInt(card.dataset.cols),
                rows: parseInt(card.dataset.rows)
            });
        }
    });

    setState('apps', newApps);
    saveState();
}

export function sanitizeGrid() {
    const cols = parseInt(state.settings.theme.gridColumns) || 10;
    const rows = parseInt(state.settings.theme.gridRows) || 6;

    let movedCount = 0;

    const newApps = state.apps.map(app => {
        let { x, y, cols: w, rows: h } = app;
        let changed = false;

        if (x > cols) { x = cols; changed = true; }
        if (y > rows) { y = rows; changed = true; }

        if (x + w - 1 > cols) { w = Math.max(1, cols - x + 1); changed = true; }
        if (y + h - 1 > rows) { h = Math.max(1, rows - y + 1); changed = true; }

        if (changed) {
            movedCount++;
            return { ...app, x, y, cols: w, rows: h };
        }
        return app;
    });

    if (movedCount > 0) {
        setState('apps', newApps);
        saveState();
        renderGrid();

        if (hasOverlaps(newApps)) {
            showToast(`Grid resized. ${movedCount} apps moved (Overlap detected!)`, "warning");
        } else {
            showToast(`Grid resized. ${movedCount} apps adjusted to fit.`, "success");
        }
    }
}

function hasOverlaps(apps) {
    for (let i = 0; i < apps.length; i++) {
        const A = apps[i];
        for (let j = i + 1; j < apps.length; j++) {
            const B = apps[j];
            if (A.x < B.x + B.cols &&
                A.x + A.cols > B.x &&
                A.y < B.y + B.rows &&
                A.y + A.rows > B.y) {
                return true;
            }
        }
    }
    return false;
}