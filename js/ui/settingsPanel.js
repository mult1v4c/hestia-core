import { state } from "../state.js";
import { saveState, exportStateToFile, importStateFromFile } from "../storage.js";
import { applyTheme, applyBase16Theme, applyCustomPreset, renderPresetOptions, saveCustomPreset } from "./theme.js";
import { qs, qsa } from "../dom.js";
import { showToast } from "./toasts.js";
import { openColorPicker } from "./colorPicker.js";
import { formatColor, toHex, resolveToHex } from "../utils.js";
import { renderGridLines, sanitizeGrid } from "../grid.js";
import { logger } from "../logger.js";
import { DEFAULT_THEME } from "../constants.js";

export function initSettingsPanel() {
    const settingsBtn = qs('#settingsBtn');
    const closeBtn = qs('.settings-modal-header .fa-xmark')?.parentElement;
    if (settingsBtn) settingsBtn.onclick = toggleSettingsPanel;
    if (closeBtn) closeBtn.onclick = toggleSettingsPanel;

    const exportBtn = qs('button[title="Download current theme and layout"]');
    if (exportBtn) exportBtn.onclick = exportStateToFile;

    const importBtn = qs('button[title="Load theme and layout from a file"]');
    const importInput = qs('#file-import');
    if (importBtn && importInput) {
        importBtn.onclick = () => importInput.click();
        importInput.onchange = async (e) => {
            try {
                await importStateFromFile(e.target.files[0]);
                window.location.reload();
            } catch (err) {
                showToast("Import failed: " + err, "error");
            }
        };
    }

    const resetBtn = qs('button[onclick="confirmReset()"]');
    if (resetBtn) resetBtn.onclick = () => window.confirmReset();

    renderPresetOptions();
    wireUpInputs();

    // Wait a tick for DOM updates
    requestAnimationFrame(syncInputs);
}

function toggleSettingsPanel() {
    const panel = qs('#settingsPanel');
    const isActive = panel.classList.contains('active');
    if (isActive) {
        panel.classList.remove('active');
        saveState();
        showToast("Settings saved!", "success");
    } else {
        panel.classList.add('active');
        requestAnimationFrame(syncInputs);
    }
}

function wireUpInputs() {
    // 1. Text Inputs (General settings like Title, Font)
    qsa('.setting-val').forEach(input => {
        if (input.id === 'newThemeName') return;
        const key = input.id.replace('input-', '');
        input.onchange = (e) => updateSetting(key, e.target.value);
    });

    // 2. Toggles (Shadows, Outlines)
    qsa('.toggle-switch input').forEach(input => {
        const key = input.id.replace('input-', '');
        input.onchange = (e) => updateSetting(key, e.target.checked);
    });

    // 3. Color Previews (Click to Open Popover)
    qsa('.color-preview').forEach(preview => {
        if (preview.id.includes('modal')) return;
        const key = preview.id.replace('preview-', '');

        preview.onclick = () => {
            openColorPicker(preview, (colorVar) => {
                // Selected from Palette (saves "var(--base00)")
                updateSetting(key, colorVar);
            }, () => {
                // Clicked "Custom..." -> Open Native Picker
                // MATCH HTML ID: "native-input-bgCanvas"
                const native = qs(`#native-input-${key}`);
                if (native) native.click();
            });
        };
    });

    // 4. Native Pickers (Hidden)
    qsa('.hidden-native-picker').forEach(picker => {
        // MATCH HTML ID: "native-input-bgCanvas" -> Key: "bgCanvas"
        const key = picker.id.replace('native-input-', '');
        picker.onchange = (e) => updateSetting(key, e.target.value);
    });

    // 5. Preset Select
    const presetSelect = qs('#presetSelect');
    if (presetSelect) {
        presetSelect.onchange = (e) => {
            const [type, name] = e.target.value.split(':');
            if (type === 'base16') applyBase16Theme(name);
            if (type === 'custom') applyCustomPreset(name);
            syncInputs();
        };
    }

    // 6. Save Preset Btn
    const savePresetBtn = qs('button[title="Save Preset"]');
    if (savePresetBtn) {
        savePresetBtn.onclick = () => {
            saveCustomPreset(qs('#newThemeName').value);
        };
    }

    // 7. Reset Icons
    qsa('.reset-icon').forEach(icon => {
        const key = icon.id.replace('reset-', '');
        icon.onclick = () => resetSetting(key);
    });
}

/**
 * Returns the default value for a setting.
 * If a Base16 palette is active, returns the "var(--baseXX)" string so reset comparison works.
 */
function resolveThemeDefault(key) {
    const theme = state.settings.theme;
    const activePal = theme.activePalette;

    if (activePal && window.HESTIA_PALETTES && window.HESTIA_PALETTES[activePal]) {
        const palette = window.HESTIA_PALETTES[activePal];
        const mapping = {
            'bgCanvas': 'base00', 'bgSurface': 'base01', 'bgHighlight': 'base02',
            'borderDim': 'base02', 'borderBright': 'base03',
            'textMain': 'base05', 'textMuted': 'base04', 'textFaint': 'base03', 'textInverse': 'base00',
            'brandPrimary': 'base0B', 'brandSecondary': 'base0D', 'brandTertiary': 'base0E',
            'statusError': 'base08', 'statusWarning': 'base09', 'statusSuccess': 'base0B'
        };
        const baseKey = mapping[key];
        if (baseKey && palette[baseKey]) {
            // CRITICAL FIX: Return Variable format to match stored state
            return `var(--${baseKey})`;
        }
    }
    return DEFAULT_THEME[key];
}

function updateSetting(key, value) {
    if (typeof value === 'string' && !isNaN(value) && value.trim() !== '' &&
       (key.includes('Size') || key.includes('Padding') || key.includes('Radius'))) {
         value += 'px';
    }
    state.settings.theme[key] = value;
    applyTheme(state.settings.theme);
    syncInputs();
    if (key === 'gridColumns' || key === 'gridRows') {
        renderGridLines();
        sanitizeGrid();
    }
}

function resetSetting(key) {
    let def = resolveThemeDefault(key);
    if (def === undefined) def = DEFAULT_THEME[key];

    // Check if it's a toggle
    const toggle = qs(`#input-${key}`);
    if (toggle && toggle.type === 'checkbox') {
        updateSetting(key, (String(def) === 'true'));
    } else {
        updateSetting(key, def);
    }
}

// --- THE CORE SYNC FUNCTION ---
function syncInputs() {
    const theme = state.settings.theme;

    // A. Sync General Inputs (Text & Toggles)
    // These match elements with id="input-..."
    qsa('[id^="input-"]').forEach(input => {
        // Skip if it's one of the modal inputs (prevent partial match)
        if (input.id.includes('modal')) return;

        const key = input.id.replace('input-', '');
        let val = theme[key];
        let def = resolveThemeDefault(key);
        if (def === undefined) def = input.getAttribute('data-default');

        // Apply Value to DOM
        if (val !== undefined) {
            if (input.type === 'checkbox') input.checked = (String(val) === 'true');
            else input.value = val;
        }

        // Update Reset Button Visibility
        const resetBtn = qs(`#reset-${key}`);
        if (resetBtn) {
            let isDiff = false;

            if (input.type === 'checkbox') {
                // Boolean Comparison
                isDiff = (input.checked !== (String(def) === 'true'));
            } else {
                // Standard String Comparison (Case-insensitive)
                const currentStr = String(val || '').trim().toLowerCase();
                const defaultStr = String(def || '').trim().toLowerCase();
                isDiff = (currentStr !== defaultStr);
            }

            if (isDiff) resetBtn.classList.add('visible');
            else resetBtn.classList.remove('visible');
        }
    });

    // B. Sync Color Previews (CRITICAL FIX FOR COLORS)
    // We loop over the previews because the inputs are gone from the HTML
    qsa('.color-preview').forEach(preview => {
        if (preview.id.includes('modal')) return; // Skip App Editor previews

        const key = preview.id.replace('preview-', '');
        let val = theme[key];
        let def = resolveThemeDefault(key);

        // Fallback to default if value is missing for display
        if (!val) val = def;

        // 1. Update the colored square visual
        if (val) preview.style.backgroundColor = formatColor(val);

        // 2. Sync the hidden native picker
        const native = qs(`#native-input-${key}`);
        if (native && val) {
            native.value = resolveToHex(val);
        }

        // 3. Update Reset Button (SMART HEX COMPARISON)
        const resetBtn = qs(`#reset-${key}`);
        if (resetBtn) {
            // Resolve variables (var(--base00)) to actual Hex (#181818)
            // This ensures visually identical colors are treated as "Same"
            const currentHex = resolveToHex(val).toLowerCase();
            const defaultHex = resolveToHex(def).toLowerCase();

            // Only show reset if the actual colors differ
            if (currentHex !== defaultHex) resetBtn.classList.add('visible');
            else resetBtn.classList.remove('visible');
        }
    });
}