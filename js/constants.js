// js/constants.js
// Default configuration values

export const DEFAULT_THEME = {
    activePalette: "default-dark",

    // Geometry
    gridColumns: 10,
    gridRows: 6,
    gridPadding: "20px",
    gapSize: "10px",
    borderRadius: "5px",
    fontFamily: "Courier New",

    // UI Toggles
    outlines: true,
    shadow: false,
    titleBarIcon: "fa-fire",
    titleBarText: "HESTIA",

    // Semantic Colors (Defaults)
    bgCanvas: "#181818",
    bgSurface: "#282828",
    bgHighlight: "#383838",

    borderDim: "#383838",
    borderBright: "#585858",

    textMain: "#d8d8d8",
    textMuted: "#b8b8b8",
    textFaint: "#585858",
    textInverse: "#181818",

    brandPrimary: "#a1b56c",
    brandSecondary: "#7cafc2",
    brandTertiary: "#ba8baf",

    statusError: "#ab4642",
    statusWarning: "#dc9656",
    statusSuccess: "#a1b56c",
};

export const DEFAULT_APPS = [
    {
        "id": 1763998798882,
        "name": "Untitled",
        "subtype": "image",
        "type": "static",
        "x": 7, "y": 3, "cols": 1, "rows": 2,
        "data": {
            "url": "assets/cat.jpg",
        }
    },
    {
        "id": 1763998868976,
        "name": "Welcome to <i class=\"fa-solid fa-fire\"></i> Hestia!",
        "subtype": "text",
        "type": "static",
        "x": 5, "y": 3, "cols": 2, "rows": 2,
        "data": {
            "content": "Start by exploring the buttons.\n\nClick <i class=\"fa-solid fa-pen-to-square\"></i> to enter Edit Mode. \nClick <i class=\"fa-solid fa-floppy-disk\"></i> to exit Edit Mode and save.\n\nClick <i class=\"fa-solid fa-plus\"></i> to add apps.\n\nClick <i class=\"fa-solid fa-broom\"></i> to clear the dashboard\n\nClick <i class=\"fa-solid fa-gear\"></i> to change dashboard settings.",
            "bgColor": "#f9dab0",
            "textColor": "#181818"
        }
    },
    {
        "id": 1763998884008,
        "name": "Youtube",
        "subtype": "link",
        "type": "static",
        "x": 4, "y": 3, "cols": 1, "rows": 1,
        "data": {
            "url": "https://youtube.com",
            "icon": "fa-brands fa-youtube",
            "bgColor": "#ab4642",
            "textColor": "#f8f8f8"
        }
    },
    {
        "id": 1763998911851,
        "name": "Github",
        "subtype": "link",
        "type": "static",
        "x": 4, "y": 4, "cols": 1, "rows": 1,
        "data": {
            "url": "http://github.com/mult1v4c/hestia-core",
            "icon": "fa-brands fa-github",
            "bgColor": "#181818",
            "textColor": "var(--text-main)"
        }
    }
];