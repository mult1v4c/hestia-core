// js/storage.js
// Centralized state persistence.
// Handles localStorage interaction and File Import/Export.

import { state } from "./state.js";

const STORAGE_KEY = "HESTIA_DASHBOARD_STATE";

// Old keys for migration
const LEGACY_THEME_KEY = "hestia_theme";
const LEGACY_APPS_KEY = "hestia_apps";

// Load state from localStorage.
// Checks for legacy data first, migrates it, then checks new key.
export function loadState() {
  try {
    // 1. Check for modern storage key
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      deepMerge(state, parsed);
      console.info("[storage] State loaded successfully.");
      return state;
    }

    // 2. Check for Legacy keys (Migration Path)
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    const legacyApps = localStorage.getItem(LEGACY_APPS_KEY);

    if (legacyTheme || legacyApps) {
      console.warn("[storage] Legacy data found. Migrating to new format...");

      if (legacyTheme) {
        const themeData = JSON.parse(legacyTheme);
        // Map old structure to new structure if needed, or direct merge
        if(themeData.theme) state.settings.theme = themeData.theme;
        if(themeData.custom_presets) state.settings.custom_presets = themeData.custom_presets;
      }

      if (legacyApps) {
        state.apps = JSON.parse(legacyApps);
      }

      // Save to new format immediately so we don't migrate next time
      saveState();

      // Optional: Clean up old keys
      // localStorage.removeItem(LEGACY_THEME_KEY);
      // localStorage.removeItem(LEGACY_APPS_KEY);

      return state;
    }

    console.warn("[storage] No saved data found. Using defaults.");
    return state;

  } catch (err) {
    console.error("[storage] Failed to load state.", err);
    return state;
  }
}

// Save current global state to localStorage
export function saveState() {
  try {
    // We only save specific parts of state to avoid bloating
    const persistencePayload = {
      apps: state.apps,
      settings: state.settings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistencePayload));
    // console.debug("[storage] State saved.");
  } catch (err) {
    console.error("[storage] Failed to save state.", err);
  }
}

// Clear everything and reload
export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
  localStorage.removeItem(LEGACY_APPS_KEY);
  window.location.reload();
}

// -----------------------------
// IMPORT / EXPORT
// -----------------------------

export function exportStateToFile() {
  const exportData = {
    apps: state.apps,
    settings: state.settings,
    timestamp: Date.now(),
    version: "1.0"
  };

  const json = JSON.stringify(exportData, null, 2); // Pretty print
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `hestia-core_config_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importStateFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("No file provided");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Basic validation
        if (!data.apps && !data.settings && !data.theme) {
          throw new Error("Invalid Hestia configuration file.");
        }

        // Handle both new export format and potentially legacy exports
        if (data.settings) {
            state.settings = data.settings;
        } else if (data.theme) {
            // Handle legacy export format
            state.settings.theme = data.theme;
        }

        if (data.apps) {
            state.apps = data.apps;
        }

        // Persist immediately
        saveState();
        resolve(state);

      } catch (error) {
        console.error("Import failed:", error);
        reject(error);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// -----------------------------
// HELPER
// -----------------------------

// Deep merge parsed data into the existing state object safely
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}