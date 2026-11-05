// js/ui/theme.js
import { toPx, formatColor } from "../utils.js";
import { state, setState } from "../state.js";
import { saveState } from "../storage.js";
import { qs, createEl } from "../dom.js";
import { showToast } from "./toasts.js";

// ---------------------------
// Core Theme Application
// ---------------------------

export function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;

    // 1. INJECT RAW BASE COLORS (Critical for var(--baseXX) references)
    if (theme.activePalette && window.HESTIA_PALETTES) {
        const palette = window.HESTIA_PALETTES[theme.activePalette];
        if (palette) {
            Object.keys(palette).forEach(key => {
                // Inject --base00, --base01, etc.
                if (key.startsWith('base')) {
                    root.style.setProperty(`--${key}`, formatColor(palette[key]));
                }
            });
        }
    }

    // 2. Apply Semantic Colors
    const colorProps = [
        'bgCanvas', 'bgSurface', 'bgHighlight',
        'borderDim', 'borderBright',
        'textMain', 'textMuted', 'textFaint', 'textInverse',
        'brandPrimary', 'brandSecondary', 'brandTertiary',
        'statusError', 'statusWarning', 'statusSuccess'
    ];

    colorProps.forEach(key => {
        if (theme[key]) {
            const cssVar = '--' + key.replace(/([A-Z])/g, "-$1").toLowerCase();
            root.style.setProperty(cssVar, theme[key]);
        }
    });

    // 3. Apply Geometry
    root.style.setProperty('--gap-size', toPx(theme.gapSize));
    root.style.setProperty('--radius', toPx(theme.borderRadius));
    root.style.setProperty('--grid-padding', toPx(theme.gridPadding));
    root.style.setProperty('--grid-cols', theme.gridColumns || 10);
    root.style.setProperty('--grid-rows', theme.gridRows || 6);
    root.style.setProperty('--font-main-stack', theme.fontFamily || "Courier New");

    // 4. Toggles
    if (theme.shadow) document.body.classList.add('shadow-on');
    else document.body.classList.remove('shadow-on');

    const dashboard = qs('#dashboard');
    if (dashboard) {
        if (theme.outlines) dashboard.classList.add('show-outlines');
        else dashboard.classList.remove('show-outlines');
    }

    // 5. Header Info
    const headerTitle = qs('#headerTitle');
    const iconClass = theme.titleBarIcon || "fa-fire";
    if(headerTitle) {
        headerTitle.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${theme.titleBarText || "HESTIA"}`;
    }
}

// ---------------------------
// Base16 / Preset Logic
// ---------------------------

export function applyBase16Theme(paletteName) {
    const palette = window.HESTIA_PALETTES?.[paletteName];
    if (!palette) return;

    // Map Base16 to Semantic Keys
    const mapping = {
        'bgCanvas': 'base00', 'bgSurface': 'base01', 'bgHighlight': 'base02',
        'borderDim': 'base02', 'borderBright': 'base03',
        'textMain': 'base05', 'textMuted': 'base04', 'textFaint': 'base03', 'textInverse': 'base00',
        'brandPrimary': 'base0B', 'brandSecondary': 'base0D', 'brandTertiary': 'base0E',
        'statusError': 'base08', 'statusWarning': 'base09', 'statusSuccess': 'base0B'
    };

    const newTheme = { ...state.settings.theme };

    for (const [semanticKey, baseKey] of Object.entries(mapping)) {
        if (palette[baseKey]) {
            newTheme[semanticKey] = `var(--${baseKey})`;
        }
    }

    // Update state and apply
    newTheme.activePalette = paletteName;
    setState('settings.theme', newTheme);
    applyTheme(newTheme);
    saveState();
}

export function applyCustomPreset(presetName) {
    const preset = state.settings.custom_presets?.[presetName];
    if (!preset) return;

    // Merge preset colors into current theme
    const newTheme = { ...state.settings.theme, ...preset };
    newTheme.activePalette = null; // Custom presets detach from Base16

    setState('settings.theme', newTheme);
    applyTheme(newTheme);
    saveState();
}

// ---------------------------
// UI Renderers
// ---------------------------

export function renderPresetOptions() {
    const select = qs('#presetSelect');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select a Theme...</option>';

    // Base16 Group
    const groupBase16 = createEl('optgroup', { attrs: { label: "Base16 Palettes" } });
    const palettes = window.HESTIA_PALETTES || {};

    Object.keys(palettes).sort().forEach(slug => {
        const opt = createEl('option', {
            text: palettes[slug].name,
            attrs: { value: "base16:" + slug }
        });
        groupBase16.appendChild(opt);
    });
    select.appendChild(groupBase16);

    // Custom Group
    const groupCustom = createEl('optgroup', { attrs: { label: "Custom Presets" } });
    const customPresets = state.settings.custom_presets || {};

    for (const key of Object.keys(customPresets)) {
        const opt = createEl('option', {
            text: key,
            attrs: { value: "custom:" + key }
        });
        groupCustom.appendChild(opt);
    }
    if (groupCustom.children.length > 0) select.appendChild(groupCustom);

    // Set current value
    const currentPal = state.settings.theme.activePalette;
    if (currentPal && palettes[currentPal]) {
        select.value = "base16:" + currentPal;
    }
}

export function saveCustomPreset(name) {
    if (!name) {
        showToast("Please enter a theme name.", "error");
        return;
    }

    // Only save colors, not geometry
    const theme = state.settings.theme;
    const colorSubset = {};
    const props = [
        'bgCanvas', 'bgSurface', 'bgHighlight', 'borderDim', 'borderBright',
        'textMain', 'textMuted', 'textFaint', 'textInverse',
        'brandPrimary', 'brandSecondary', 'brandTertiary',
        'statusError', 'statusWarning', 'statusSuccess'
    ];
    props.forEach(p => colorSubset[p] = theme[p]);

    // Update state
    const presets = { ...state.settings.custom_presets, [name]: colorSubset };
    setState('settings.custom_presets', presets);

    // Refresh UI
    renderPresetOptions();
    const select = qs('#presetSelect');
    if(select) select.value = "custom:" + name;

    saveState();
    showToast("Custom preset saved!", "success");
}