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

// Resolve a CSS variable (or any color string) to a specific HEX value
export function resolveToHex(colorStr) {
    if (!colorStr) return '#000000';
    const str = String(colorStr).trim();

    // If it is a CSS variable var(--name)
    if (str.startsWith('var(')) {
        const varName = str.match(/var\(([^)]+)\)/)?.[1];
        if (varName) {
            // Get the actual computed style from the DOM root
            const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            if (resolved) return toHex(resolved);
        }
    }

    return toHex(str);
}

// Helper to force HEX for <input type="color">
export function toHex(c) {
    if (!c) return '#000000';
    const str = String(c).trim();

    if (str.startsWith('#')) {
        // Handle short hex #fff -> #ffffff
        if (str.length === 4) {
            return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
        }
        return str;
    }

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

    return '#000000'; // Fallback
}

// Ensure color is a valid CSS string (for style attributes)
export function formatColor(c) {
  if (!c) return '#000000';
  const str = String(c).trim();
  if (str.startsWith('#') || str.startsWith('rgb') || str.startsWith('hsl') || str.startsWith('var')) {
      return str;
  }
  return '#' + str;
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

/**
 * Escapes HTML characters to prevent XSS and layout breaking.
 * Use this whenever you render user-generated text.
 */
export function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Parses raw text into safe HTML with specific features enabled.
 * - Escapes HTML tags (Security)
 * - Converts :icon-name: shortcodes into FontAwesome tags
 */
export function formatRichText(text) {
    if (text === undefined || text === null) return '';

    // 1. Sanitize (Basic XSS prevention)
    let safeText = escapeHtml(text);

    // 2. Parse Icon Shortcodes
    // Pattern: :icon-name: (e.g. :rocket:, :fa-brands fa-github:)
    // We reuse the existing resolveIconClass helper!
    safeText = safeText.replace(/:([a-z0-9-\s]+):/g, (match, iconName) => {
        // Resolve full class (handles 'github' -> 'fa-brands fa-github')
        const fullClass = resolveIconClass(iconName.trim());
        // Return the HTML icon tag
        return `<i class="${fullClass}"></i>`;
    });

    return safeText;
}

/**
 * Simple Markdown Parser
 * Converts raw text -> Safe HTML
 */
export function parseMarkdown(text) {
    if (!text) return '';

    // 1. Sanitize
    let html = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 2. Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 3. Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // 4. Code Blocks
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // 5. Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');

    // 6. Icons
    html = html.replace(/:([a-z0-9-\s]+):/gim, (match, iconName) => {
        if (typeof resolveIconClass === 'function') {
            const fullClass = resolveIconClass(iconName.trim());
            return `<i class="${fullClass}"></i>`;
        }
        return match;
    });

    // --- 7. CHECKBOXES  ---

    // 7A. Checked [x] (With Dash "- [x]")
    html = html.replace(/^\s*-\s+\[\s*[xX]\s*\]\s?(.*$)/gim,
        '<div class="task-done"><i class="fa-regular fa-square-check"></i> <span>$1</span></div>');

    // 7B. Checked [x] (No Dash "[x]")
    html = html.replace(/^\s*\[\s*[xX]\s*\]\s?(.*$)/gim,
        '<div class="task-done"><i class="fa-regular fa-square-check"></i> <span>$1</span></div>');

    // 7C. Unchecked [ ] (With Dash "- [ ]")
    html = html.replace(/^\s*-\s+\[\s*\]\s?(.*$)/gim,
        '<div class="task-todo"><i class="fa-regular fa-square"></i> <span>$1</span></div>');

    // 7D. Unchecked [ ] (No Dash "[ ]")
    html = html.replace(/^\s*\[\s*\]\s?(.*$)/gim,
        '<div class="task-todo"><i class="fa-regular fa-square"></i> <span>$1</span></div>');


    // --- 8. LISTS (Safe) ---
    html = html.replace(/^\s*-\s+(.*$)/gim, (match, content) => {
        // Double check: if content starts with a checkbox div, don't wrap it again
        if (content.startsWith('<div class="task')) return match;
        return `<div class="list-item">• ${content}</div>`;
    });

    // 9. Horizontal Rule
    html = html.replace(/^\s*---\s*$/gim, '<hr>');

    // 10. Line Breaks
    html = html.replace(/\n/g, '<br>');

    html = html.replace(/(<\/div>|<\/h[1-6]>|<hr>)\s*<br>/g, '$1');

    return html;
}