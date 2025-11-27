// js/events.js
import { state, setState } from "./state.js";
import { qs } from "./dom.js";
import { saveGridState, renderGrid } from "./grid.js";
import { VirtualGrid } from "./grid/virtualGrid.js";
import { showToast } from "./ui/toasts.js";

// Drag State
let actItem = null;
let initX, initY;
let sGX, sGY, sC, sR; // Start Grid X, Y, Cols, Rows
let mode = null;
let gridRect;
let updateFrame = null;

export function initGlobalEvents() {
    const dashboard = qs('#dashboard');
    const gridLines = qs('#gridLines');

    if (!dashboard || !gridLines) {
        setTimeout(initGlobalEvents, 100);
        return;
    }

    dashboard.addEventListener('mousedown', e => {
        if (!state.ui.editMode) return;
        if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;

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

        initX = e.clientX;
        initY = e.clientY;

        sGX = parseInt(actItem.dataset.x);
        sGY = parseInt(actItem.dataset.y);
        sC = parseInt(actItem.dataset.cols);
        sR = parseInt(actItem.dataset.rows);

        gridRect = gridLines.getBoundingClientRect();
        actItem.classList.add('moving');

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!actItem) return;
        if (updateFrame) return;

        updateFrame = requestAnimationFrame(() => {
            handleDrag(e);
            updateFrame = null;
        });
    }

    function handleDrag(e) {
        const cols = state.settings.theme.gridColumns || 10;
        const rows = state.settings.theme.gridRows || 6;
        const cW = gridRect.width / cols;
        const cH = gridRect.height / rows;

        const gDx = Math.round((e.clientX - initX) / cW);
        const gDy = Math.round((e.clientY - initY) / cH);

        if (mode === 'move') {
            let nX = sGX + gDx;
            let nY = sGY + gDy;

            if (nX < 1) nX = 1;
            if (nY < 1) nY = 1;
            if (nX + sC - 1 > cols) nX = cols - sC + 1;
            if (nY + sR - 1 > rows) nY = rows - sR + 1;

            const currentApp = state.apps.find(a => a.id === parseInt(actItem.dataset.id));
            if (currentApp.x === nX && currentApp.y === nY) return;

            // --- SWAP LOGIC START ---
            const vGrid = new VirtualGrid(cols, rows, state.apps);
            const targetId = vGrid.getAppAt(nX, nY);

            // 1. FREE MOVE: Is the target slot completely empty?
            if (vGrid.isAreaFree(nX, nY, sC, sR, currentApp.id)) {
                currentApp.x = nX;
                currentApp.y = nY;
                renderGrid();
            }
            // 2. SWAP: We hit another card. Can we swap?
            else if (targetId && targetId !== currentApp.id) {
                const targetApp = state.apps.find(a => a.id === targetId);

                // Check A: Does the target card fit in OUR old spot?
                // We exclude currentApp.id because it is leaving that spot.
                const canTargetMove = vGrid.isAreaFree(currentApp.x, currentApp.y, targetApp.cols, targetApp.rows, [currentApp.id, targetApp.id]);

                // Check B: Do WE fit in the target's spot?
                // We exclude targetApp.id because it is moving away.
                // We exclude currentApp.id because we are moving in.
                const canSourceMove = vGrid.isAreaFree(targetApp.x, targetApp.y, currentApp.cols, currentApp.rows, [currentApp.id, targetApp.id]);

                if (canTargetMove && canSourceMove) {
                    // Perform Swap
                    const oldX = currentApp.x;
                    const oldY = currentApp.y;

                    // We take their exact spot (snap to grid), not just mouse position
                    currentApp.x = targetApp.x;
                    currentApp.y = targetApp.y;

                    targetApp.x = oldX;
                    targetApp.y = oldY;

                    renderGrid();
                }
            }
            // --- SWAP LOGIC END ---

        } else if (mode === 'resize') {
            let nC = sC + gDx;
            let nR = sR + gDy;

            if (nC < 1) nC = 1;
            if (nR < 1) nR = 1;
            if (sGX + nC - 1 > cols) nC = cols - sGX + 1;
            if (sGY + nR - 1 > rows) nR = rows - sGY + 1;

            const currentApp = state.apps.find(a => a.id === parseInt(actItem.dataset.id));
            if (currentApp.cols === nC && currentApp.rows === nR) return;

            const vGrid = new VirtualGrid(cols, rows, state.apps);

            if (vGrid.isAreaFree(sGX, sGY, nC, nR, currentApp.id)) {
                currentApp.cols = nC;
                currentApp.rows = nR;
                renderGrid();
            }
        }
    }

    function onMouseUp() {
        if (actItem) {
            actItem.classList.remove('moving');
            saveGridState();
        }
        actItem = null;
        if (updateFrame) cancelAnimationFrame(updateFrame);
        updateFrame = null;

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

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
        editBtn.title = 'Save Layout';
        editBtn.classList.remove('btn-primary');
        editBtn.style.borderColor = "var(--brand-primary)";
        addBtn.disabled = false;
        if(clearBtn) clearBtn.disabled = false;
        showToast("Edit Mode Enabled");
    } else {
        dashboard.classList.remove('edit-mode');
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.title = 'Edit Layout';
        editBtn.classList.add('btn-primary');
        addBtn.disabled = true;
        if(clearBtn) clearBtn.disabled = true;
        saveGridState();
        showToast("Layout Saved");
    }
}