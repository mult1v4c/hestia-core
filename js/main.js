// js/index.js
import { state, setState } from "./state.js";
import { loadState, saveState, resetState } from "./storage.js";
import { qs, on } from "./dom.js";
import { applyTheme } from "./ui/theme.js";
import { renderGrid, saveGridState } from "./grid.js";
import { initModal, showModal } from "./ui/modal.js";
import { showToast } from "./ui/toasts.js";
import { initGlobalEvents, toggleEditMode } from "./events.js";
import { DEFAULT_THEME, DEFAULT_APPS } from "./constants.js";
import { initSettingsPanel } from "./ui/settingsPanel.js";
import { initAppEditor } from "./ui/appEditor.js";
import { logger } from "./logger.js";
import './apps/appIndex.js';

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    logger.info("Hestia-Core: Booting...");

    // 1. Load Data
    const savedState = loadState();

    // Population Safety Check: If apps are missing, load defaults
    if (savedState.apps === undefined) {
         setState('apps', DEFAULT_APPS);
    }

    // Theme Safety Check
    if (!savedState.settings || !savedState.settings.theme) {
         setState('settings.theme', DEFAULT_THEME);
    }

    // Load Palettes (From external script)
    if (window.HESTIA_PALETTES) {
        state.palettes = window.HESTIA_PALETTES;
    }

    // 2. Apply Theme
    applyTheme(state.settings.theme);

    // 3. Render Dashboard
    await renderGrid();

    // 4. Initialize UI Modules
    initModal();
    initGlobalEvents();
    initSettingsPanel();
    initAppEditor();

    // 5. Wire up Header Buttons
    wireUpToolbar();

    // 6. Wire up Inline Renaming (Feature Parity)
    wireUpRenaming();

    logger.success("Hestia-Core: Ready.");

    // Expose for debugging
    window.__APP__ = { state, renderGrid, toggleEditMode, logger };
});

function wireUpToolbar() {
    const editBtn = qs('#editBtn');
    if (editBtn) editBtn.onclick = toggleEditMode;

    const clearBtn = qs('#clearBtn');
    if (clearBtn) {
        clearBtn.onclick = () => {
             if (!state.ui.editMode) return;
             showModal(
                "Clear Dashboard",
                "<p>Are you sure you want to remove <strong>ALL</strong> apps? This cannot be undone.</p>",
                '<i class="fa-solid fa-eraser"></i>',
                async () => {
                    setState('apps', []);
                    saveState();
                    await renderGrid();
                    showToast("Dashboard cleared!", "success");
                },
                true
            );
        };
    }

    // Global Reset Helper (called by settings panel)
    window.confirmReset = () => {
         showModal(
            "Reset Dashboard",
            `<p>Are you sure you want to wipe <strong>ALL</strong> saved themes, presets, and app layout?</p>`,
            `<i class="fa-solid fa-bomb"></i>`,
            () => resetState(),
            true
        );
    };
}

function wireUpRenaming() {
    // Feature Parity: Double click text to rename app in Edit Mode
    document.addEventListener('dblclick', (e) => {
        if (!state.ui.editMode) return;

        // Find a title or name element inside an app card
        const titleEl = e.target.closest('.card-title') ||
                        e.target.closest('.app-type-link span') ||
                        e.target.closest('.app-type-text h4');

        if (titleEl && titleEl.closest('.app-card')) {
            const card = titleEl.closest('.app-card');
            makeContentEditable(titleEl, card);
        }
    });
}

function makeContentEditable(el, card) {
    el.contentEditable = true;
    el.focus();
    el.classList.add('editing');

    const finish = () => {
        el.contentEditable = false;
        el.classList.remove('editing');
        el.removeEventListener('blur', finish);
        el.removeEventListener('keydown', onKey);

        // Save new name
        const newName = el.innerText.trim();
        const id = parseInt(card.dataset.id);
        const app = state.apps.find(a => a.id === id);

        if (app && newName !== app.name) {
            app.name = newName;
            saveGridState(); // Persist to storage
            showToast("Renamed app", "success");
        }
    };

    const onKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finish();
        }
    };

    el.addEventListener('blur', finish);
    el.addEventListener('keydown', onKey);
}