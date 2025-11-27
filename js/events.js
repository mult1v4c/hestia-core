import { state, setState } from "./state.js";
import { qs } from "./dom.js";
import { renderGrid, applyGridPosition, saveGridState } from "./grid.js";
import { VirtualGrid } from "./grid/virtualGrid.js";
import { showToast } from "./ui/toasts.js";
import { logger } from "./logger.js"; // Import Logger

// Drag State
let actItem = null;
let ghosts = [];
let dragOffsetX, dragOffsetY;
let gridRect;
let updateFrame = null;
let lastMoveResult = null;
let mode = null; // 'move' or 'resize'

// Resize State
let initResizeX, initResizeY;
let startCols, startRows;

export function initGlobalEvents() {
    const dashboard = qs('#dashboard');
    // NOTE: We don't cache gridLines here anymore to prevent stale references

    if (!dashboard) {
        setTimeout(initGlobalEvents, 100);
        return;
    }

    dashboard.addEventListener('mousedown', e => {
        if (!state.ui.editMode) return;
        if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;

        const card = e.target.closest('.app-card');
        if (!card) return;

        // Prevent default browser dragging/selection
        e.preventDefault();

        actItem = card;

        // REFRESH GRID RECT: Always get the fresh element
        const gridLines = qs('#gridLines');
        if (gridLines) {
            gridRect = gridLines.getBoundingClientRect();
        } else {
            console.error("GridLines missing!");
            return;
        }

        // 1. CHECK MODE
        if (e.target.closest('.resize-handle')) {
            mode = 'resize';
            initResizeX = e.clientX;
            initResizeY = e.clientY;
            startCols = parseInt(actItem.dataset.cols) || 1;
            startRows = parseInt(actItem.dataset.rows) || 1;
        } else {
            mode = 'move';
            // Setup Drag Visuals
            const rect = actItem.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;

            actItem.classList.add('moving');
            actItem.style.width = rect.width + 'px';
            actItem.style.height = rect.height + 'px';
            actItem.style.position = 'fixed';
            actItem.style.left = rect.left + 'px';
            actItem.style.top = rect.top + 'px';
            actItem.style.zIndex = '1000';
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!actItem) return;

        // Update visual position immediately (smoothness)
        if (mode === 'move') {
            actItem.style.left = (e.clientX - dragOffsetX) + 'px';
            actItem.style.top = (e.clientY - dragOffsetY) + 'px';
        }

        // Throttle logic with RAF
        if (updateFrame) return;

        updateFrame = requestAnimationFrame(() => {
            try {
                if (mode === 'move') handleMoveLogic(e);
                else if (mode === 'resize') handleResizeLogic(e);
            } catch (err) {
                // LOG THE HIDDEN BUG
                console.error("Critical Drag Error:", err);
                // Emergency cleanup to prevent "stuck" state
                onMouseUp();
            } finally {
                // CRITICAL: Always release the lock
                updateFrame = null;
            }
        });
    }

    function handleMoveLogic(e) {
        const cols = state.settings.theme.gridColumns || 10;
        const rows = state.settings.theme.gridRows || 6;

        const cW = gridRect.width > 0 ? gridRect.width / cols : 100;
        const cH = gridRect.height > 0 ? gridRect.height / rows : 100;

        const rawX = e.clientX - dragOffsetX - gridRect.left;
        const rawY = e.clientY - dragOffsetY - gridRect.top;

        let nX = Math.round(rawX / cW) + 1;
        let nY = Math.round(rawY / cH) + 1;

        const appId = parseInt(actItem.dataset.id);
        const sourceApp = state.apps.find(a => a.id === appId);

        if (!sourceApp) return;

        const vGrid = new VirtualGrid(cols, rows, state.apps);
        const result = vGrid.checkMove(sourceApp, nX, nY);

        lastMoveResult = result;
        renderGhosts(result, sourceApp);
    }

    function handleResizeLogic(e) {
        const cols = state.settings.theme.gridColumns || 10;
        const rows = state.settings.theme.gridRows || 6;
        const cW = gridRect.width > 0 ? gridRect.width / cols : 100;
        const cH = gridRect.height > 0 ? gridRect.height / rows : 100;

        const deltaX = Math.round((e.clientX - initResizeX) / cW);
        const deltaY = Math.round((e.clientY - initResizeY) / cH);

        let newCols = Math.max(1, startCols + deltaX);
        let newRows = Math.max(1, startRows + deltaY);

        const x = parseInt(actItem.dataset.x);
        const y = parseInt(actItem.dataset.y);

        if (x + newCols - 1 > cols) newCols = cols - x + 1;
        if (y + newRows - 1 > rows) newRows = rows - y + 1;

        const vGrid = new VirtualGrid(cols, rows, state.apps);
        const appId = parseInt(actItem.dataset.id);

        if (vGrid.isAreaFree(x, y, newCols, newRows, appId)) {
            actItem.style.gridColumnEnd = `span ${newCols}`;
            actItem.style.gridRowEnd = `span ${newRows}`;
            actItem.dataset.newCols = newCols;
            actItem.dataset.newRows = newRows;
        }
    }

    function renderGhosts(result, sourceApp) {
        ghosts.forEach(g => g.remove());
        ghosts = [];

        const dashboard = qs('#dashboard');

        const mainGhost = createGhost(
            result.targetX || sourceApp.x,
            result.targetY || sourceApp.y,
            sourceApp.cols,
            sourceApp.rows,
            result.possible ? 'valid' : 'invalid'
        );
        dashboard.appendChild(mainGhost);
        ghosts.push(mainGhost);

        if (result.possible && result.displaced && result.displaced.length > 0) {
            result.displaced.forEach(disp => {
                const g = createGhost(
                    disp.nx,
                    disp.ny,
                    disp.app.cols,
                    disp.app.rows,
                    'displaced'
                );
                dashboard.appendChild(g);
                ghosts.push(g);
            });
        }
    }

    function createGhost(x, y, w, h, type) {
        const el = document.createElement('div');
        el.className = `grid-ghost ghost-${type}`;
        applyGridPosition(el, x, y, w, h);
        return el;
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Safety: Cancel any pending frame
        if (updateFrame) {
            cancelAnimationFrame(updateFrame);
            updateFrame = null;
        }

        ghosts.forEach(g => g.remove());
        ghosts = [];

        if (!actItem) return;

        const appId = parseInt(actItem.dataset.id);
        const app = state.apps.find(a => a.id === appId);

        if (!app) {
            console.error("App state missing for ID", appId);
            // Reset visual state
            actItem.classList.remove('moving');
            actItem.style = '';
            if (actItem.dataset.x) applyGridPosition(actItem, actItem.dataset.x, actItem.dataset.y, actItem.dataset.cols, actItem.dataset.rows);
            actItem = null;
            return;
        }

        if (mode === 'move') {
            actItem.classList.remove('moving');
            actItem.style.position = '';
            actItem.style.width = '';
            actItem.style.height = '';
            actItem.style.left = '';
            actItem.style.top = '';
            actItem.style.zIndex = '';

            if (lastMoveResult && lastMoveResult.possible) {
                app.x = lastMoveResult.targetX;
                app.y = lastMoveResult.targetY;

                if (lastMoveResult.displaced) {
                    lastMoveResult.displaced.forEach(disp => {
                        const target = state.apps.find(a => a.id === disp.app.id);
                        if (target) {
                            target.x = disp.nx;
                            target.y = disp.ny;
                        }
                    });
                }
                saveGridState();
                renderGrid();
            } else {
                applyGridPosition(actItem, app.x, app.y, app.cols, app.rows);
                renderGrid();
            }
        }
        else if (mode === 'resize') {
            if (actItem.dataset.newCols && actItem.dataset.newRows) {
                app.cols = parseInt(actItem.dataset.newCols);
                app.rows = parseInt(actItem.dataset.newRows);
                delete actItem.dataset.newCols;
                delete actItem.dataset.newRows;
                saveGridState();
            }
            actItem.style.gridColumnEnd = '';
            actItem.style.gridRowEnd = '';
            applyGridPosition(actItem, app.x, app.y, app.cols, app.rows);
            renderGrid();
        }

        actItem = null;
        lastMoveResult = null;
        mode = null;
    }
}

// Basic toggle
export function toggleEditMode() {
    const isEdit = !state.ui.editMode;
    setState('ui.editMode', isEdit);
    const dashboard = qs('#dashboard');
    const editBtn = qs('#editBtn');
    const addBtn = qs('#addBtn');
    const clearBtn = qs('#clearBtn');

    if (isEdit) {
        dashboard.classList.add('edit-mode');
        editBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
        addBtn.disabled = false;
        if(clearBtn) clearBtn.disabled = false;
        showToast("Edit Mode Enabled");
    } else {
        dashboard.classList.remove('edit-mode');
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        addBtn.disabled = true;
        if(clearBtn) clearBtn.disabled = true;
        saveGridState();
        showToast("Layout Saved");
    }
}