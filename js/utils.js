// utils.js
// Shared helper functions used across the entire dashboard.
// This file keeps small, reusable logic in one place to avoid duplication.

// -----------------------------
// DOM HELPERS
// -----------------------------

// Create an element with attributes and children easily
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.substring(2), value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (!Array.isArray(children)) children = [children];
  for (const child of children) {
    if (child instanceof Node) {
      element.appendChild(child);
    } else if (child != null) {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

// Query helpers
export const qs = (sel, parent = document) => parent.querySelector(sel);
export const qsa = (sel, parent = document) => [...parent.querySelectorAll(sel)];

// -----------------------------
// ID GENERATION
// -----------------------------

// Generate simple unique IDs for apps or elements
export function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// -----------------------------
// COLOR UTILITIES
// -----------------------------

// Validate hex color
export function isHexColor(str) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str);
}

// Normalize shorthand hex (#fff → #ffffff)
export function normalizeHex(hex) {
  if (!isHexColor(hex)) return null;
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toLowerCase();
}

// -----------------------------
// EVENT HELPERS
// -----------------------------

// Debounce (limit how often something triggers)
export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Throttle (limit rapid-fire events like mousemove)
export function throttle(fn, limit = 100) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}

// -----------------------------
// SAFE JSON
// -----------------------------

export function safeJSONparse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
