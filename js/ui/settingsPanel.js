import { state } from "../state.js";
import { saveState, exportStateToFile, importStateFromFile } from "../storage.js";
import { applyTheme, applyBase16Theme, applyCustomPreset, renderPresetOptions, saveCustomPreset } from "./theme.js";
import { qs, qsa } from "../dom.js";
import { showToast } from "./toasts.js";
import { openColorPicker } from "./colorPicker.js";
import { formatColor } from "../utils.js";
import { renderGridLines, sanitizeGrid } from "../grid.js";

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
    syncInputs();
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
        syncInputs();
    }
}

function wireUpInputs() {
    qsa('.setting-val').forEach(input => {
        if (input.id === 'newThemeName') return;
        const key = input.id.replace('input-', '');
        input.onchange = (e) => updateSetting(key, e.target.value);
    });
    qsa('.toggle-switch input').forEach(input => {
        const key = input.id.replace('input-', '');
        input.onchange = (e) => updateSetting(key, e.target.checked);
    });
    qsa('.color-preview').forEach(preview => {
        if (preview.id.includes('modal')) return;
        const key = preview.id.replace('preview-', '');
        preview.onclick = () => {
            openColorPicker(preview, (color) => {
                updateSetting(key, color);
            }, () => {
                const native = qs(`#input-${key}.hidden-native-picker`);
                if (native) native.click();
            });
        };
    });
    qsa('.hidden-native-picker').forEach(picker => {
        const key = picker.id.replace('input-', '');
        picker.onchange = (e) => updateSetting(key, e.target.value);
    });
    const presetSelect = qs('#presetSelect');
    if (presetSelect) {
        presetSelect.onchange = (e) => {
            const [type, name] = e.target.value.split(':');
            if (type === 'base16') applyBase16Theme(name);
            if (type === 'custom') applyCustomPreset(name);
            syncInputs();
        };
    }
    const savePresetBtn = qs('button[title="Save Preset"]');
    if (savePresetBtn) {
        savePresetBtn.onclick = () => {
            saveCustomPreset(qs('#newThemeName').value);
        };
    }
    qsa('.reset-icon').forEach(icon => {
        const key = icon.id.replace('reset-', '');
        icon.onclick = () => resetSetting(key);
    });
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
    const input = qs(`#input-${key}`);
    const def = input.getAttribute('data-default');
    if (!def) return;
    const isBool = input.type === 'checkbox';
    updateSetting(key, isBool ? (def === 'true') : def);
}

function syncInputs() {
    const theme = state.settings.theme;

    qsa('[id^="input-"]').forEach(input => {
        if (input.classList.contains('hidden-native-picker')) return;

        const key = input.id.replace('input-', '');
        let val = theme[key];

        // Force fallback if value is missing in state
        if (val === undefined) {
            // Try to get default from data-attribute, else empty string
            val = input.getAttribute('data-default') || '';
        }

        if (val !== undefined) {
            if (input.type === 'checkbox') {
                input.checked = val;
            } else {
                input.value = val;
            }

            const preview = qs(`#preview-${key}`);
            if (preview) {
                preview.style.backgroundColor = formatColor(val);
            }

            const native = qs(`#input-${key}.hidden-native-picker`);
            if (native) native.value = formatColor(val);

            const resetBtn = qs(`#reset-${key}`);
            if (resetBtn) {
                const def = input.getAttribute('data-default');
                const isDiff = input.type === 'checkbox' ? (input.checked !== (def === 'true')) : (String(val) !== def);
                if (isDiff) resetBtn.classList.add('visible');
                else resetBtn.classList.remove('visible');
            }
        }
    });
}