// js/grid.js
import { state } from "./state.js";
import { saveState } from "./storage.js";
import { createEl, qs, qsa } from "./dom.js";
import { registry } from "./registry.js";
import { VirtualGrid } from "./grid/virtualGrid.js";

// -----------------------------
// GRID RENDERING (Reconciliation)
// -----------------------------

export async function renderGrid() {
    const dashboard = qs('#dashboard');
    if (!dashboard) return;

    renderGridLines();

    const apps = state.apps;
    const domMap = new Map();
    qsa('.app-card', dashboard).forEach(el => {
        const id = parseInt(el.dataset.id);
        if (id) domMap.set(id, el);
    });

    for (const app of apps) {
        let el = domMap.get(app.id);

        if (el) {
            // --- UPDATE EXISTING ---

            // 1. Position Check
            const currentX = parseInt(el.dataset.x);
            const currentY = parseInt(el.dataset.y);
            const currentW = parseInt(el.dataset.cols);
            const currentH = parseInt(el.dataset.rows);

            if (currentX !== app.x || currentY !== app.y || currentW !== app.cols || currentH !== app.rows) {
                applyGridPosition(el, app.x, app.y, app.cols, app.rows);
            }

            // 2. Content & Style Check (Fix for "Edits not showing")
            // We create a signature of the data to see if it changed
            const dataHash = JSON.stringify(app.data || {}) + app.name;
            const currentHash = el.dataset.contentHash;

            // Always update basic styles (fast)
            if (app.data?.bgColor) el.style.backgroundColor = app.data.bgColor;
            if (app.data?.textColor) el.style.color = app.data.textColor;

            // If content changed, re-mount the inner app
            if (dataHash !== currentHash) {
                await mountAppContent(el, app);
                el.dataset.contentHash = dataHash;
            }

            domMap.delete(app.id);
        } else {
            // --- CREATE NEW ---
            el = await createAppElement(app);
            dashboard.appendChild(el);
        }
    }

    domMap.forEach(el => el.remove());
}

async function createAppElement(app) {
    const el = createEl('div', {
        class: 'app-card',
        attrs: {
            id: `app-${app.id}`,
            'data-id': app.id
        }
    });

    applyGridPosition(el, app.x, app.y, app.cols, app.rows);

    // Initial Styles
    if (app.data?.bgColor) el.style.backgroundColor = app.data.bgColor;
    if (app.data?.textColor) el.style.color = app.data.textColor;

    // Initial Hash
    el.dataset.contentHash = JSON.stringify(app.data || {}) + app.name;

    await mountAppContent(el, app);

    return el;
}

// Extracted logic to allow re-mounting existing apps
async function mountAppContent(el, app) {
    const appDef = registry.get(app.subtype);

    let innerHTML = 'Unknown App';
    if (appDef) {
        const appInstance = new appDef.Class();
        innerHTML = await appInstance.render(app);

        // Re-inject structure
        el.innerHTML = `
            ${innerHTML}
            <div class="resize-handle"></div>
            <div class="card-meta">${app.cols}x${app.rows}</div>
            <div class="edit-btn" title="Edit App"><i class="fa-solid fa-pencil"></i></div>
            <div class="delete-btn" title="Delete App"><i class="fa-solid fa-trash"></i></div>
        `;

        // Trigger Lifecycle
        if (appInstance.onMount) {
            setTimeout(() => appInstance.onMount(el, app), 0);
        }
    } else {
        el.innerHTML = innerHTML;
    }
}

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

export function findEmptySlot(w, h) {
    const cols = parseInt(state.settings.theme.gridColumns) || 10;
    const rows = parseInt(state.settings.theme.gridRows) || 6;
    const vGrid = new VirtualGrid(cols, rows, state.apps);

    for (let y = 1; y <= rows; y++) {
        for (let x = 1; x <= cols; x++) {
            if (x + w - 1 > cols || y + h - 1 > rows) continue;
            if (vGrid.isAreaFree(x, y, w, h)) return { x, y };
        }
    }
    return { x: 1, y: 1 };
}

export function saveGridState() {
    saveState();
}

export function sanitizeGrid() {}