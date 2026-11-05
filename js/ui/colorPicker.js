import { state } from "../state.js";
import { formatColor } from "../utils.js";
import { createEl } from "../dom.js";
import { openPopover, closePopover } from "./popover.js";

export function openColorPicker(targetEl, onSelect, onCustom) {
    // Get both the HEX values (for display) and KEYS (for saving)
    const paletteData = getActivePaletteData();

    const container = createEl('div');
    const grid = createEl('div', { class: 'popover-grid' });

    if (paletteData.length > 0) {
        paletteData.forEach(item => {
            const swatch = createEl('div', {
                class: 'palette-swatch',
                // We display the color visually
                style: { backgroundColor: item.hex },
                attrs: { title: item.var }, // Tooltip shows var(--base00)
                on: {
                    click: () => {
                        onSelect(item.var);
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
                if (onCustom) onCustom(); // Opens native picker
            }
        }
    });

    footer.appendChild(customBtn);
    container.appendChild(footer);

    openPopover(targetEl, container, { offsetLeft: -75 });
}

function getActivePaletteData() {
    const activeKey = state.settings.theme.activePalette;
    const palettes = window.HESTIA_PALETTES || {};

    if (activeKey && palettes[activeKey]) {
        const p = palettes[activeKey];
        // Base16 standard keys
        const keys = ['base00','base01','base02','base03','base04','base05','base06','base07',
                      'base08','base09','base0A','base0B','base0C','base0D','base0E','base0F'];

        return keys
            .filter(k => p[k])
            .map(k => ({
                key: k,
                hex: formatColor(p[k]),
                var: `var(--${k})` // Save color variable
            }));
    }
    return [];
}