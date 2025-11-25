//
// components.js
// Small, reusable UI render functions (stateless).
// These do NOT store state. They produce DOM nodes.
//

import { createEl, appendChildren } from "./dom.js";

// -----------------------------------
// Generic Labeled Field Component
// -----------------------------------
export function labeledField(labelText, inputEl) {
    const wrapper = createEl("div", { class: "field" });
    const label = createEl("label", { text: labelText });

    appendChildren(wrapper, label, inputEl);
    return wrapper;
}

// -----------------------------------
// Button Component
// -----------------------------------
export function button(text, opts = {}) {
    return createEl("button", {
        class: opts.class || "btn",
        text,
        attrs: opts.attrs,
        on: opts.on
    });
}

// -----------------------------------
// Switch / Toggle Component
// -----------------------------------
export function toggleSwitch(value, onChange) {
    const wrapper = createEl("label", { class: "switch" });
    const input = createEl("input", {
        attrs: { type: "checkbox" }
    });

    const slider = createEl("span", { class: "slider" });

    input.checked = value;

    input.addEventListener("change", () => {
        onChange(input.checked);
    });

    appendChildren(wrapper, input, slider);
    return wrapper;
}

// -----------------------------------
// Section Header Component
// -----------------------------------
export function sectionHeader(text) {
    return createEl("h2", {
        class: "section-header",
        text
    });
}

// -----------------------------------
// Divider Component
// -----------------------------------
export function divider() {
    return createEl("hr", { class: "divider" });
}

// -----------------------------------
// Card Component
// -----------------------------------
export function card(titleText, contentEls = []) {
    const card = createEl("div", { class: "card" });
    const title = createEl("div", {
        class: "card-title",
        text: titleText
    });
    const body = createEl("div", { class: "card-body" });

    appendChildren(body, ...contentEls);
    appendChildren(card, title, body);

    return card;
}

// -----------------------------------
// Icon Component (simple)
// -----------------------------------
export function icon(name) {
    const el = createEl("span", {
        class: `icon icon-${name}`
    });
    return el;
}
