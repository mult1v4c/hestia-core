// js/events.js
import { state, setState } from "./state.js";
import { qs, qsa, on } from "./dom.js";
import { applyGridPosition, checkCollision, saveGridState, renderGrid } from "./grid.js";
import { showToast } from "./ui/toasts.js";
import { saveState } from "./storage.js"; // Needed for edit mode toggle saves

// Drag State
let actItem = null;
let initX, initY;
let sGX, sGY, sC, sR; // Start Grid X, Y, Cols, Rows
let mode = null; // 'move' or 'resize'
let gridRect;

/**
 * Initialize all global event listeners
 */
export function initGlobalEvents() {
    const dashboard = qs('#dashboard');
    const gridLines = qs('#gridLines');

    if (!dashboard || !gridLines) {
        console.error("Dashboard or GridLines not found. Retrying in 100ms...");
        setTimeout(initGlobalEvents, 100);
        return;
    }

    // -----------------------------
    // DRAG & DROP / RESIZE LOGIC
    // -----------------------------

    dashboard.addEventListener('mousedown', e => {
        // Only allow interaction in Edit Mode
        if (!state.ui.editMode) return;

        // Ignore clicks on buttons/inputs inside cards
        if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;

        // Identify Target
        if (e.target.classList.contains('resize-handle')) {
            mode = 'resize';
            actItem = e.target.parentElement;
        } else if (e.target.closest('.app-card')) {
            mode = 'move';
            actItem = e.target.closest('.app-card');
        } else {
            return;
        }

        e.preventDefault();

        // Capture Initial State
        initX = e.clientX;
        initY = e.clientY;

        // Capture Element Grid State
        sGX = parseInt(actItem.dataset.x) || 1;
        sGY = parseInt(actItem.dataset.y) || 1;
        sC = parseInt(actItem.dataset.cols) || 1;
        sR = parseInt(actItem.dataset.rows) || 1;

        // Capture Grid Dimensions for Math
        gridRect = gridLines.getBoundingClientRect();

        actItem.classList.add('moving');

        // Bind Move/Up to Document to catch fast movements outside dashboard
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!actItem) return;

        const cols = state.settings.theme.gridColumns || 10;
        const rows = state.settings.theme.gridRows || 6;

        // Calculate Cell Size dynamically
        const cW = gridRect.width / cols;
        const cH = gridRect.height / rows;

        // Calculate Delta (How many cells did we move?)
        const gDx = Math.round((e.clientX - initX) / cW);
        const gDy = Math.round((e.clientY - initY) / cH);

        const maxC = cols + 1;
        const maxR = rows + 1;

        if (mode === 'move') {
            let nX = sGX + gDx;
            let nY = sGY + gDy;

            // Clamp to Grid Boundaries
            if (nX < 1) nX = 1;
            if (nY < 1) nY = 1;
            if (nX + sC > maxC) nX = maxC - sC;
            if (nY + sR > maxR) nY = maxR - sR;

            // Check Collision & Apply
            if (!checkCollision(actItem, nX, nY, sC, sR)) {
                applyGridPosition(actItem, nX, nY, sC, sR);
                actItem.classList.remove('collision');
            } else {
                actItem.classList.add('collision');
            }
        } else if (mode === 'resize') {
            let nC = sC + gDx;
            let nR = sR + gDy;

            // Clamp Minimum Size
            if (nC < 1) nC = 1;
            if (nR < 1) nR = 1;

            // Clamp Maximum Size (Grid Boundary)
            if (sGX + nC > maxC) nC = maxC - sGX;
            if (sGY + nR > maxR) nR = maxR - sGY;

            // Check Collision & Apply
            if (!checkCollision(actItem, sGX, sGY, nC, nR)) {
                applyGridPosition(actItem, sGX, sGY, nC, nR);
                actItem.classList.remove('collision');
            } else {
                actItem.classList.add('collision');
            }
        }
    }

    function onMouseUp() {
        if (actItem) {
            actItem.classList.remove('moving', 'collision');
            saveGridState(); // Persist changes
        }

        actItem = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

// -----------------------------
// UI TOGGLE HANDLERS
// -----------------------------

export function toggleEditMode() {
    const isEdit = !state.ui.editMode;
    setState('ui.editMode', isEdit);

    const dashboard = qs('#dashboard');
    const editBtn = qs('#editBtn');
    const addBtn = qs('#addBtn');
    const clearBtn = qs('#clearBtn');

    if (isEdit) {
        // Enter Edit Mode
        dashboard.classList.add('edit-mode');

        editBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
        editBtn.title = 'Save Layout';
        editBtn.classList.remove('btn-primary');
        editBtn.style.borderColor = "var(--brand-primary)";

        addBtn.disabled = false;
        if(clearBtn) clearBtn.disabled = false;

        showToast("Edit Mode Enabled");
    } else {
        // Exit Edit Mode
        dashboard.classList.remove('edit-mode');

        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.title = 'Edit Layout';
        editBtn.classList.add('btn-primary');

        addBtn.disabled = true;
        if(clearBtn) clearBtn.disabled = true;

        saveState();
        showToast("Layout Saved");
    }
}