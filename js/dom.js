// js/dom.js
// Utility helpers for DOM interaction and rendering.
// No side effects. Pure helpers.

// -------------------------
// Query Helpers
// -------------------------

/**
 * Shorthand for querySelector
 */
export function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Shorthand for querySelectorAll (returns array)
 */
export function $all(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
}

// Aliases for consistency with the refactor map
export const qs = $;
export const qsa = $all;

/**
 * Shorthand for getElementById (fastest)
 */
export function getById(id) {
    return document.getElementById(id);
}

// -------------------------
// Element Creation
// -------------------------

/**
 * Create an element with options
 * @param {string} tag
 * @param {Object} opts
 * @returns HTMLElement
 */
export function createEl(tag, opts = {}) {
    const el = document.createElement(tag);

    if (opts.class) el.className = opts.class;
    if (opts.text) el.textContent = opts.text;
    if (opts.html) el.innerHTML = opts.html;

    if (opts.attrs) {
        Object.entries(opts.attrs).forEach(([k, v]) => {
            el.setAttribute(k, v);
        });
    }

    if (opts.style) {
        Object.assign(el.style, opts.style);
    }

    if (opts.on) {
        Object.entries(opts.on).forEach(([event, handler]) => {
            el.addEventListener(event, handler);
        });
    }

    return el;
}

// -------------------------
// Render Helpers
// -------------------------

/**
 * Replace the content of an element safely
 */
export function renderInto(el, content) {
    if (!el) return;

    // Accept string or Node
    if (typeof content === "string") {
        el.innerHTML = content;
    } else {
        el.innerHTML = "";
        el.appendChild(content);
    }
}

/**
 * Append multiple children
 */
export function appendChildren(parent, ...children) {
    children.forEach(child => {
        if (child) parent.appendChild(child);
    });
}

// -------------------------
// Visibility Helpers
// -------------------------

export function show(el) {
    if (el) el.style.display = "";
}

export function hide(el) {
    if (el) el.style.display = "none";
}

export function toggle(el, showState) {
    if (!el) return;
    if (typeof showState === "boolean") {
        el.style.display = showState ? "" : "none";
    } else {
        el.style.display = el.style.display === "none" ? "" : "none";
    }
}

// -------------------------
// Class Helpers
// -------------------------

export function addClass(el, cls) {
    if (el) el.classList.add(cls);
}

export function removeClass(el, cls) {
    if (el) el.classList.remove(cls);
}

export function toggleClass(el, cls) {
    if (el) el.classList.toggle(cls);
}

// -------------------------
// Event Binding Helpers
// -------------------------

/**
 * Bind an event to a selector (live binding using event delegation)
 */
export function on(parent, eventType, selector, handler) {
    parent.addEventListener(eventType, e => {
        const target = e.target.closest(selector);
        if (target && parent.contains(target)) {
            handler(e, target);
        }
    });
}