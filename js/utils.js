// js/utils.js
// Shared helper functions for logic and data manipulation.
// Pure functions only (no DOM creation here).

// -----------------------------
// ID GENERATION
// -----------------------------

// Generate simple unique IDs for apps
export function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// -----------------------------
// COLOR & CSS UTILITIES
// -----------------------------

// Ensure color is a valid CSS string
export function formatColor(c) {
  if (!c) return '#000000';
  const str = String(c).trim();

  // If it's already a valid format (Hex, RGB, HSL, var), return as is
  if (str.startsWith('#') || str.startsWith('rgb') || str.startsWith('hsl') || str.startsWith('var')) {
      return str;
  }

  // Otherwise assume it's a raw hex needing a hash
  return '#' + str;
}

// Helper to force HEX for <input type="color">
export function toHex(c) {
    if (!c) return '#000000';
    const str = String(c).trim();

    if (str.startsWith('#')) return str;

    // If it's rgb(r, g, b), convert to hex
    if (str.startsWith('rgb')) {
        const sep = str.indexOf(",") > -1 ? "," : " ";
        const rgb = str.substr(4).split(")")[0].split(sep);

        let r = (+rgb[0]).toString(16),
            g = (+rgb[1]).toString(16),
            b = (+rgb[2]).toString(16);

        if (r.length === 1) r = "0" + r;
        if (g.length === 1) g = "0" + g;
        if (b.length === 1) b = "0" + b;

        return "#" + r + g + b;
    }

    return '#' + str; // Fallback
}

// Ensure value has 'px' if it's a number
export function toPx(val) {
  if (val === undefined || val === null || val === '') return '0px';
  const str = String(val).trim();
  // Check if it's just numbers/dots, if so add px
  return /^[0-9.]+$/.test(str) ? str + 'px' : str;
}

// Validate hex color string
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
// FILE HANDLING
// -----------------------------

// Convert file to Base64 string with resize compression (Max 800px)
export function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // 1. Create a canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 2. Calculate new size (Max 800px width/height)
        const maxSize = 800;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 3. Draw image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 4. Compress to JPEG at 70% quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (error) => reject(error);
  });
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

// -----------------------------
// FONTAWESOME HELPER
// -----------------------------

export function resolveIconClass(input) {
    if (!input) return 'fa-solid fa-icons';

    // If user already typed "fa-" (e.g. "fa-solid fa-home"), trust them
    if (input.includes('fa-')) return input;

    const lower = input.toLowerCase().trim();

    // 1. Brands (Common social media & tech)
    const brands = [
        'youtube', 'github', 'facebook', 'twitter', 'x-twitter', 'instagram',
        'discord', 'linkedin', 'twitch', 'steam', 'spotify', 'apple', 'android',
        'windows', 'google', 'amazon', 'tiktok', 'reddit'
    ];

    if (brands.includes(lower)) {
        return `fa-brands fa-${lower}`;
    }

    // 2. Solid (Common UI elements)
    // Default to solid for everything else
    return `fa-solid fa-${lower}`;
}