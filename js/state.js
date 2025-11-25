// state.js
// Centralized application state management for your dashboard.
// This module keeps all global data in one place instead of scattered across the app.
// Other modules will import and modify this state instead of relying on window-level variables.

export const state = {
  apps: [], // All apps rendered on the dashboard
  ui: {
    editMode: false,
    activePopoverKey: null,
    activeModal: null,
  },
  settings: {
    theme: {
      background: "#1e1e1e",
      foreground: "#ffffff",
      accent: "#4caf50",
    },
  },
};

// Helper to update state consistently
export function setState(path, value) {
  const keys = path.split(".");
  let obj = state;

  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }

  obj[keys[keys.length - 1]] = value;
  return value;
}

// Example usage inside browser console or any module:
// setState("ui.editMode", true);
// console.log(state.ui.editMode);
