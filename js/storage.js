import { state, setState } from "./state.js";
import { DEFAULT_THEME, DEFAULT_APPS } from "./constants.js"; // Import defaults!

const STORAGE_KEY = "HESTIA_DASHBOARD_STATE";
const LEGACY_THEME_KEY = "hestia_theme";
const LEGACY_APPS_KEY = "hestia_apps";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      // Deep merge with state to ensure structure
      deepMerge(state, parsed);

      // Safety Check: If apps array is empty/missing in saved data, force defaults
      if (!parsed.apps || !Array.isArray(parsed.apps) || parsed.apps.length === 0) {
          // Only override if it's truly empty and we expect defaults (e.g. first load)
          // If user intentionally deleted all apps, we might want to respect that.
          // But for now, assuming "missing" means error.
          if (!parsed.apps) state.apps = [...DEFAULT_APPS];
      }

      // Safety Check: Theme
      if (!state.settings.theme || Object.keys(state.settings.theme).length === 0) {
          state.settings.theme = { ...DEFAULT_THEME };
      }

      console.info("[storage] State loaded.");
      return state;
    }

    // Migration Path (Legacy)
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    const legacyApps = localStorage.getItem(LEGACY_APPS_KEY);

    if (legacyTheme || legacyApps) {
      console.warn("[storage] Migrating legacy data...");
      if (legacyTheme) {
        const themeData = JSON.parse(legacyTheme);
        if(themeData.theme) state.settings.theme = { ...DEFAULT_THEME, ...themeData.theme };
        if(themeData.custom_presets) state.settings.custom_presets = themeData.custom_presets;
      }
      if (legacyApps) {
        state.apps = JSON.parse(legacyApps);
      }
      saveState();
      return state;
    }

    // No saved data? Use Defaults
    console.warn("[storage] No save found. Loading defaults.");
    state.apps = [...DEFAULT_APPS]; // Clone array
    state.settings.theme = { ...DEFAULT_THEME };

    saveState(); // Save immediately so we have a baseline
    return state;

  } catch (err) {
    console.error("[storage] Failed to load state.", err);
    // Fallback on error
    state.apps = [...DEFAULT_APPS];
    state.settings.theme = { ...DEFAULT_THEME };
    return state;
  }
}

export function saveState() {
  try {
    const persistencePayload = {
      apps: state.apps,
      settings: state.settings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistencePayload));
  } catch (err) {
    console.error("[storage] Failed to save state.", err);
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
  localStorage.removeItem(LEGACY_APPS_KEY);
  window.location.reload();
}

export function exportStateToFile() {
  const exportData = {
    apps: state.apps,
    settings: state.settings,
    timestamp: Date.now(),
    version: "2.0"
  };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hestia_config_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importStateFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject("No file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.settings) state.settings = data.settings;
        if (data.apps) state.apps = data.apps;
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