// js/grid.js
import { state } from "./state.js";
import { saveState } from "./storage.js";
import { createEl, qs, qsa } from "./dom.js";
import { registry } from "./registry.js";
import { VirtualGrid } from "./grid/virtualGrid.js";
import { showServiceError } from './apps/baseApp.js';

// -----------------------------
// GRID RENDERING (View Transitions API)
// -----------------------------

/**
 * @param {Object} dragInfo - { id: number, dropType: 'success' | 'fail' }
 */
export async function renderGrid(dragInfo = null) {
    const dashboard = qs('#dashboard');
    if (!dashboard) return;

    renderGridLines();

    // Helper to perform the actual DOM updates
    const updateDOM = async () => {

        // --- 1. FORCE CLEANUP (Moved outside the loop for safety) ---
        // This guarantees the floating card is reset, even if the state loop is busy.
        if (dragInfo && dragInfo.id) {
            const draggedEl = document.getElementById(`app-${dragInfo.id}`);
            if (draggedEl) {
                draggedEl.classList.remove('moving');
                draggedEl.style.position = '';
                draggedEl.style.width = '';
                draggedEl.style.height = '';
                draggedEl.style.left = '';
                draggedEl.style.top = '';
                draggedEl.style.zIndex = '';
            }
        }

        const apps = state.apps;
        const domMap = new Map();

        qsa('.app-card', dashboard).forEach(el => {
            const id = parseInt(el.dataset.id);
            if (id) domMap.set(id, el);
        });

        for (const app of apps) {
            let el = domMap.get(app.id);

            if (el) {
                // UPDATE EXISTING
                // Ensure Transition Name is set
                if (!el.style.viewTransitionName) {
                    el.style.viewTransitionName = `app-${app.id}`;
                }

                const currentX = parseInt(el.dataset.x);
                const currentY = parseInt(el.dataset.y);
                const currentW = parseInt(el.dataset.cols);
                const currentH = parseInt(el.dataset.rows);

                if (currentX !== app.x || currentY !== app.y || currentW !== app.cols || currentH !== app.rows) {
                    applyGridPosition(el, app.x, app.y, app.cols, app.rows);
                }

                // Content Check
                const dataHash = JSON.stringify(app.data || {}) + app.name;
                const currentHash = el.dataset.contentHash;

                if (app.data?.bgColor) el.style.backgroundColor = app.data.bgColor;
                if (app.data?.textColor) el.style.color = app.data.textColor;

                if (dataHash !== currentHash) {
                    await mountAppContent(el, app);
                    el.dataset.contentHash = dataHash;
                }

                domMap.delete(app.id);
            } else {
                // CREATE NEW
                el = await createAppElement(app);
                dashboard.appendChild(el);
            }
        }

        // Cleanup removed apps
        domMap.forEach(el => { el.appInstance?.dispose(); el.remove(); });
    };

    // --- THE ANIMATION TRIGGER ---
    if (document.startViewTransition) {
        let styleTag = null;

        // Success: Snap instantly. Fail: Animate back.
        if (dragInfo && dragInfo.id && dragInfo.dropType === 'success') {
            styleTag = document.createElement('style');
            styleTag.innerHTML = `
                ::view-transition-group(app-${dragInfo.id}) {
                    animation-duration: 0s !important;
                }
            `;
            document.head.appendChild(styleTag);
        }

        const transition = document.startViewTransition(() => updateDOM());

        await transition.updateCallbackDone;
        transition.finished.finally(() => {
            if (styleTag) styleTag.remove();
        });

    } else {
        await updateDOM();
    }
}

async function createAppElement(app) {
    const el = createEl('div', {
        class: 'app-card',
        attrs: {
            id: `app-${app.id}`,
            'data-id': app.id
        }
    });

    el.style.viewTransitionName = `app-${app.id}`;

    applyGridPosition(el, app.x, app.y, app.cols, app.rows);

    if (app.data?.bgColor) el.style.backgroundColor = app.data.bgColor;
    if (app.data?.textColor) el.style.color = app.data.textColor;

    el.dataset.contentHash = JSON.stringify(app.data || {}) + app.name;

    await mountAppContent(el, app);

    return el;
}

// ... (Rest of helpers remain unchanged) ...

async function mountAppContent(el, app) {
    el.appInstance?.dispose();
    const appDef = registry.get(app.subtype);
    let innerHTML = 'Unknown App';
    if (appDef) {
        const appInstance = new appDef.Class();
        el.appInstance = appInstance;
        try { innerHTML = await appInstance.render(app); }
        catch (error) { innerHTML = '<div class="app-content"></div>'; appInstance.renderError = error; }
        if (el.appInstance !== appInstance || appInstance.disposed) return;
        el.innerHTML = `
            ${innerHTML}
            <div class="resize-handle"></div>
            <div class="card-meta">${app.cols}x${app.rows}</div>
            <div class="edit-btn" title="Edit App"><i class="fa-solid fa-pencil"></i></div>
            <div class="delete-btn" title="Delete App"><i class="fa-solid fa-trash"></i></div>
        `;
        setTimeout(async () => {
            if (!el.isConnected || appInstance.disposed || el.appInstance !== appInstance) return;
            try {
                if (appInstance.renderError) throw appInstance.renderError;
                await appInstance.onMount?.(el, app);
            } catch (error) {
                if (!appInstance.disposed) showServiceError(el.querySelector('.app-content') || el, error);
            }
        }, 0);
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
    return null;
}

export function saveGridState() { saveState(); }
export function sanitizeGrid() {}
