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
    shadow: true,
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

    brandPrimary: "#ab4642",
    brandSecondary: "#dc9656",
    brandTertiary: "#f7ca88",

    statusError: "#ab4642",
    statusWarning: "#dc9656",
    statusSuccess: "#a1b56c",
};

export const DEFAULT_APPS = [
    {
      "id": 1764067661194,
      "name": "Note app",
      "subtype": "note",
      "type": "static",
      "x": 5,
      "y": 2,
      "cols": 2,
      "rows": 2,
      "data": {
        "bgColor": "var(--bg-surface)",
        "textColor": "var(--text-main)",
        "title": "Welcome to 🔥 Hestia!",
        "text": "*To start:*\n[ :fa-solid fa-pen-to-square: ] Enter Edit Mode\n[ :fa-solid fa-floppy-disk: ] Save changes and exit\n\n*While in Edit mode:*\n[ :fa-solid fa-plus: ] Add app.\n[ :fa-solid fa-eraser: ] clear all apps.\n[ :fa-solid fa-gear: ] change dashboard settings.\n\n[ :fa-solid fa-arrow-pointer: ] Double-click note to edit"
      }
    },
    {
      "id": 1764068167057,
      "name": "Image",
      "subtype": "image",
      "type": "static",
      "x": 7,
      "y": 2,
      "cols": 2,
      "rows": 3,
      "data": {
        "src": "assets/img.jpg",
        "bgColor": "var(--bg-surface)",
        "textColor": "var(--text-main)",
        "fit": "cover"
      }
    },
    {
      "id": 1764071158714,
      "name": "Untitled",
      "subtype": "clock",
      "type": "static",
      "x": 3,
      "y": 2,
      "cols": 2,
      "rows": 1,
      "data": {
        "format": "24",
        "bgColor": "var(--bg-surface)",
        "textColor": "var(--text-main)"
      }
    },
    {
      "id": 1764071405510,
      "name": "Untitled",
      "subtype": "calendar",
      "type": "static",
      "x": 3,
      "y": 3,
      "cols": 2,
      "rows": 2,
      "data": {
        "bgColor": "var(--bg-surface)",
        "textColor": "var(--text-main)"
      }
    },
    {
      "id": 1764071478849,
      "name": "Paris",
      "subtype": "weather",
      "type": "static",
      "x": 3,
      "y": 5,
      "cols": 2,
      "rows": 1,
      "data": {
        "lat": "",
        "lon": "",
        "bgColor": "var(--bg-surface)",
        "textColor": "var(--text-main)"
      }
    },
    {
      "id": 1764083611404,
      "name": "Github",
      "subtype": "link",
      "type": "static",
      "x": 7,
      "y": 5,
      "cols": 1,
      "rows": 1,
      "data": {
        "url": "https://github.com/mult1v4c/hestia-core",
        "icon": "github",
        "bgColor": "var(--base06)",
        "textColor": "var(--base01)",
        "hideLabel": "false"
      }
    },
    {
      "id": 1764085472564,
      "name": "Untitled",
      "subtype": "note",
      "type": "static",
      "x": 5,
      "y": 4,
      "cols": 2,
      "rows": 2,
      "data": {
        "title": "",
        "bgColor": "var(--bg-surface)",
        "textColor": "var(--text-main)",
        "text": "# Basic Markdown\n---\n## Heading 2\n### Heading 3\nNormal Text / *Italic* / **Bold**\n`$ code` / [Links](http://127.0.0.1)\n- [ ] Item\n- [x] Item\n- List\n- List"
      }
    },
    {
      "id": 1764090614585,
      "name": "Youtube",
      "subtype": "link",
      "type": "static",
      "x": 8,
      "y": 5,
      "cols": 1,
      "rows": 1,
      "data": {
        "url": "https://www.youtube.com/watch?v=Y6ljFaKRTrI",
        "icon": "youtube",
        "hideLabel": "true",
        "bgColor": "var(--base08)",
        "textColor": "var(--base06)"
      }
    }
  ]