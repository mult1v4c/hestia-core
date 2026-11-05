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
import { parseMarkdown } from "./utils.js";
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

    wireUpNoteEditing();

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

// Updated to support the new NoteApp class name
function wireUpRenaming() {
    document.addEventListener('dblclick', (e) => {
        if (!state.ui.editMode) return;

        // Find a title or name element inside an app card
        // Updated: .app-type-text h4 -> .app-type-note h4
        const titleEl = e.target.closest('.card-title') ||
                        e.target.closest('.app-type-link span') ||
                        e.target.closest('.app-type-note h4');

        if (titleEl && titleEl.closest('.app-card')) {
            const card = titleEl.closest('.app-card');

            // Logic to determine WHAT we are renaming
            // If it's a note header, we update data.title. Otherwise we update app.name
            const isNoteHeader = titleEl.matches('.app-type-note h4');

            makeContentEditable(titleEl, card, (newText, app) => {
                if (isNoteHeader) {
                    app.data.title = newText; // Update Note Title
                } else {
                    app.name = newText;       // Update Generic App Name
                }
            });
        }
    });
}

function wireUpNoteEditing() {
    document.addEventListener('dblclick', (e) => {
        if (state.ui.editMode) return;

        // 1. Find the viewer
        const paper = e.target.closest('.note-paper');
        if (!paper) return;

        const card = paper.closest('.app-card');
        if (!card) return;

        const id = parseInt(card.dataset.id);
        const app = state.apps.find(a => a.id === id);
        if (!app) return;
        if (!app.data) app.data = {};

        // 2. CREATE THE EDITOR (Textarea)
        const textarea = document.createElement('textarea');
        textarea.className = 'note-editor';
        textarea.value = app.data.text || ''; // Load RAW text
        textarea.placeholder = "Type Markdown here... (# Title, **bold**, :icon:)";

        // 3. SWAP: Hide Viewer, Show Editor
        paper.style.display = 'none';
        paper.parentElement.appendChild(textarea);
        textarea.focus();

        // 4. SAVE ON BLUR
        const finish = () => {
            const newText = textarea.value;

            // Clean up DOM
            textarea.remove();
            paper.style.display = ''; // Show viewer again

            // Save State
            if (app.data.text !== newText) {
                app.data.text = newText;
                saveGridState();
                showToast("Note saved", "success");
            }

            // Render Markdown
            paper.innerHTML = parseMarkdown(newText);
        };

        textarea.addEventListener('blur', finish);

        // Optional: Save on Ctrl+Enter
        textarea.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
                finish();
            }
        });
    });
}

function makeContentEditable(el, card, customSaveCallback) {
    el.contentEditable = true;
    el.focus();
    el.classList.add('editing');

    const finish = () => {
        el.contentEditable = false;
        el.classList.remove('editing');
        el.removeEventListener('blur', finish);
        el.removeEventListener('keydown', onKey);

        const newText = el.innerText.trim();
        const id = parseInt(card.dataset.id);
        const app = state.apps.find(a => a.id === id);

        if (app) {
            if (customSaveCallback) {
                // Use custom logic (like for Note Titles)
                customSaveCallback(newText, app);
                saveGridState();
                showToast("Updated", "success");
            } else if (newText !== app.name) {
                // Default: Update App Name
                app.name = newText;
                saveGridState();
                showToast("Renamed app", "success");
            }
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