// js/state.js
// Centralized application state management with Pub/Sub.
// This allows other modules to subscribe to changes (e.g., Grid redraws when Theme changes).

// Initial State Tree
export const state = {
  apps: [], // List of app objects

  // Loaded Palettes (will be populated from palettes.js or API)
  palettes: {},

  ui: {
    editMode: false,
    activePopoverKey: null,
    activeModal: null,

    // Transient state for the App Editor modal color pickers
    modalAppBgColor: null,
    modalAppTextColor: null,
    activeAppColorKey: null,
  },

  settings: {
    theme: {
      activePalette: "default-dark",
      // Colors and Geometry defaults will be merged here
      bgCanvas: "#181818",
      bgSurface: "#282828",
      textMain: "#d8d8d8",
      gapSize: "10px",
      gridColumns: 10,
      gridRows: 6,
      // ... other defaults
    },
    custom_presets: {}
  },
};

// -------------------------
// Pub/Sub System
// -------------------------
const listeners = new Set();

/**
 * Subscribe to state changes.
 * @param {Function} listener - Callback function(state, path, value)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of a change.
 */
function notify(path, value) {
  listeners.forEach(fn => fn(state, path, value));
}

// -------------------------
// State Modifiers
// -------------------------

/**
 * Update a specific path in the state and notify listeners.
 * Supports dot notation: setState('ui.editMode', true)
 */
export function setState(path, value) {
  const keys = path.split(".");
  let obj = state;

  // Traverse to the nested object
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) obj[keys[i]] = {}; // Create if missing
    obj = obj[keys[i]];
  }

  // Set value
  const key = keys[keys.length - 1];
  const oldValue = obj[key];

  if (oldValue !== value) {
    obj[key] = value;
    // console.debug(`[State] Updated ${path}:`, value);
    notify(path, value);
  }

  return value;
}

/**
 * Get a value from state using dot notation.
 */
export function getState(path) {
  if (!path) return state;

  const keys = path.split(".");
  let obj = state;

  for (const key of keys) {
    if (obj === undefined) return undefined;
    obj = obj[key];
  }

  return obj;
}