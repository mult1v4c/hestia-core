// storage.js
// Centralized and safe access to localStorage for your dashboard.
// This ensures consistent saving/loading of state across modules.
// Instead of interacting with localStorage directly, the app uses this module.

import { state, setState } from "./state.js";

const STORAGE_KEY = "HESTIA_DASHBOARD_STATE";

// Load state from localStorage. If corrupted or missing, fall back to defaults.
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      console.warn("[storage] No saved data found. Using default state.");
      return state;
    }

    const parsed = JSON.parse(raw);

    // Merge parsed data into the live state object while preserving structure.
    deepMerge(state, parsed);

    console.info("[storage] State loaded successfully.");
    return state;
  } catch (err) {
    console.error("[storage] Failed to load state, using defaults.", err);
    return state;
  }
}

// Save current state back to localStorage
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.info("[storage] State saved.");
  } catch (err) {
    console.error("[storage] Failed to save state.", err);
  }
}

// Clear everything and restore defaults
export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// Utility: Deep merge parsed data into the existing state object safely
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
