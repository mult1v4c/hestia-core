// js/theme.js
import { toPx } from "./utils.js"; // Assuming you move toPx to utils.js

export function applyTheme(theme) {
    const root = document.documentElement;

    // 1. Apply Semantic Colors
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

    // 2. Apply Geometry
    root.style.setProperty('--gap-size', toPx(theme.gapSize));
    root.style.setProperty('--radius', toPx(theme.borderRadius));
    root.style.setProperty('--grid-padding', toPx(theme.gridPadding));
    root.style.setProperty('--grid-cols', theme.gridColumns || 10);
    root.style.setProperty('--grid-rows', theme.gridRows || 6);
    root.style.setProperty('--font-main-stack', theme.fontFamily || "Courier New");

    // 3. Toggles
    if (theme.shadow) document.body.classList.add('shadow-on');
    else document.body.classList.remove('shadow-on');

    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        if (theme.outlines) dashboard.classList.add('show-outlines');
        else dashboard.classList.remove('show-outlines');
    }
}