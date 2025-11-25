// js/constants.js
// Default configuration values

export const DEFAULT_THEME = {
    activePalette: "default-dark",
    bgCanvas: "#181818",
    bgHighlight: "#383838",
    bgSurface: "#282828",
    borderBright: "#585858",
    borderDim: "#383838",
    brandPrimary: "#a1b56c",
    brandSecondary: "#7cafc2",
    brandTertiary: "#ba8baf",
    statusError: "#ab4642",
    statusWarning: "#dc9656",
    statusSuccess: "#a1b56c",
    textFaint: "#585858",
    textInverse: "#181818",
    textMain: "#d8d8d8",
    textMuted: "#b8b8b8",
    fontFamily: "Courier New",
    titleBarIcon: "fa-fire",
    titleBarText: "HESTIA",
    gridColumns: 10,
    gridRows: 6,
    gridPadding: "20px",
    gapSize: "10px",
    borderRadius: "5px",
    outlines: true,
    shadow: false,
};

export const DEFAULT_APPS = [
    {
        id: 1763998868976,
        name: "Welcome",
        subtype: "text",
        type: "static",
        x: 5, y: 3, cols: 2, rows: 2,
        data: {
            content: "Welcome to Hestia!\nClick the pencil icon to edit.",
            bgColor: "#f9dab0",
            textColor: "#181818"
        }
    }
];