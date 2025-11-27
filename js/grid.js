// js/grid.js
import { state } from "./state.js";
import { saveState } from "./storage.js";
import { createEl, qs, qsa } from "./dom.js";
import { registry } from "./registry.js";
import { VirtualGrid } from "./grid/virtualGrid.js";

// -----------------------------
// GRID RENDERING (Reconciliation)
// -----------------------------

/**
 * Re-renders the grid by updating existing nodes and creating new ones.
 * Uses reconciliation to avoid destroying DOM nodes (preserving iframes/canvas).
 */
export async function renderGrid() {
    const dashboard = qs('#dashboard');
    if (!dashboard) return;

    // 1. Render Background Lines
    renderGridLines();

    const apps = state.apps;

    // 2. Map Existing DOM Elements
    // We map them by ID so we can find them instantly
    const domMap = new Map();
    qsa('.app-card', dashboard).forEach(el => {
        const id = parseInt(el.dataset.id);
        if (id) domMap.set(id, el);
    });

    // 3. Reconcile: Create or Update
    for (const app of apps) {
        let el = domMap.get(app.id);

        if (el) {
            // --- UPDATE EXISTING ---
            // We only touch the DOM if the position changed.
            // This prevents jitter and allows CSS transitions to work.
            const currentX = parseInt(el.dataset.x);
            const currentY = parseInt(el.dataset.y);
            const currentW = parseInt(el.dataset.cols);
            const currentH = parseInt(el.dataset.rows);

            if (currentX !== app.x || currentY !== app.y || currentW !== app.cols || currentH !== app.rows) {
                applyGridPosition(el, app.x, app.y, app.cols, app.rows);
            }

            // Remove from map to indicate it has been processed
            domMap.delete(app.id);
        } else {
            // --- CREATE NEW ---
            el = await createAppElement(app);
            dashboard.appendChild(el);
        }
    }

    // 4. Cleanup: Remove elements that are no longer in state
    domMap.forEach(el => el.remove());
}

/**
 * Creates the DOM element for a single app card.
 */
async function createAppElement(app) {
    const el = createEl('div', {
        class: 'app-card',
        attrs: {
            id: `app-${app.id}`,
            'data-id': app.id
        }
    });

    // Apply initial position
    applyGridPosition(el, app.x, app.y, app.cols, app.rows);

    // Style basics
    if (app.data?.bgColor) el.style.backgroundColor = app.data.bgColor;
    if (app.data?.textColor) el.style.color = app.data.textColor;

    const appDef = registry.get(app.subtype);
    if (!appDef) {
        el.innerHTML = 'Unknown App';
        return el;
    }

    const appInstance = new appDef.Class();
    const innerHTML = await appInstance.render(app);

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
 * Helper to apply CSS Grid styles to an element
 */
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

/**
 * Helper to find the first empty slot for a new widget.
 * Uses VirtualGrid for efficient scanning.
 */
export function findEmptySlot(w, h) {
    const cols = parseInt(state.settings.theme.gridColumns) || 10;

    // Create a temporary grid to check for space (scan deep)
    const vGrid = new VirtualGrid(cols, 100, state.apps);

    for (let y = 1; y <= 100; y++) {
        for (let x = 1; x <= cols; x++) {
            // Boundary Check
            if (x + w - 1 > cols) continue;

            // Collision Check
            if (vGrid.isAreaFree(x, y, w, h)) {
                return { x, y };
            }
        }
    }
    return { x: 1, y: 1 };
}

export function saveGridState() {
    saveState();
}

export function sanitizeGrid() {
    // Deprecated in favor of VirtualGrid logic, but kept for compatibility
}