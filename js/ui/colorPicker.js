// js/ui/colorPicker.js
import { state } from "../state.js";
import { formatColor } from "../utils.js";
import { createEl } from "../dom.js";
import { openPopover, closePopover } from "./popover.js";

/**
 * Open the Base16 color grid.
 * @param {HTMLElement} targetEl - The element that triggered this (preview swatch)
 * @param {Function} onSelect - Callback(hexColor) when user picks a color
 * @param {Function} onCustom - Callback() when user clicks "Custom..."
 */
export function openColorPicker(targetEl, onSelect, onCustom) {
    const palette = getActivePaletteColors();

    const container = createEl('div');
    const grid = createEl('div', { class: 'popover-grid' });

    if (palette.length > 0) {
        palette.forEach(color => {
            const swatch = createEl('div', {
                class: 'palette-swatch',
                style: { backgroundColor: color },
                on: {
                    click: () => {
                        onSelect(color);
                        closePopover();
                    }
                }
            });
            grid.appendChild(swatch);
        });
    } else {
        grid.innerHTML = `<div style="padding:10px; grid-column:span 4; color:var(--text-muted); font-size:0.8rem;">No Base16 palette active.</div>`;
    }

    container.appendChild(grid);

    // Footer with Custom Button
    const footer = createEl('div', { class: 'popover-footer' });
    const customBtn = createEl('button', {
        class: 'btn',
        text: 'Custom...',
        on: {
            click: () => {
                closePopover();
                if (onCustom) onCustom();
            }
        }
    });

    footer.appendChild(customBtn);
    container.appendChild(footer);

    openPopover(targetEl, container, { offsetLeft: -75 }); // Centerish align
}

// Helper: Extract colors from the currently active Base16 palette
function getActivePaletteColors() {
    const activeKey = state.settings.theme.activePalette;
    const palettes = window.HESTIA_PALETTES || {}; // Loaded via script in HTML for now

    if (activeKey && palettes[activeKey]) {
        const p = palettes[activeKey];
        const keys = ['base00','base01','base02','base03','base04','base05','base06','base07',
                      'base08','base09','base0A','base0B','base0C','base0D','base0E','base0F'];

        return keys.filter(k => p[k]).map(k => formatColor(p[k]));
    }
    return [];
}