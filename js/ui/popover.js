// js/ui/popover.js
import { qs, createEl } from "../dom.js";

let activePopover = null;

/**
 * Open a generic popover at a specific target element
 * @param {HTMLElement} targetEl - The element to anchor to (e.g., color swatch)
 * @param {HTMLElement|string} content - The content to show inside
 * @param {object} options - { offsetTop, offsetLeft, className }
 */
export function openPopover(targetEl, content, options = {}) {
    closePopover(); // Close existing

    const popover = createEl('div', {
        class: `palette-popover active ${options.className || ''}`
    });

    if (typeof content === 'string') {
        popover.innerHTML = content;
    } else {
        popover.appendChild(content);
    }

    document.body.appendChild(popover);

    // Positioning Logic
    const rect = targetEl.getBoundingClientRect();
    const top = rect.bottom + (options.offsetTop || 5) + window.scrollY;
    let left = rect.left + (options.offsetLeft || 0) + window.scrollX;

    // Boundary check (prevent overflow right)
    if (left + 200 > window.innerWidth) {
        left = window.innerWidth - 210;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

    activePopover = { el: popover, trigger: targetEl };

    // Delay adding click listener to prevent immediate closure
    setTimeout(() => {
        document.addEventListener('click', outsideClickListener);
    }, 0);
}

export function closePopover() {
    if (activePopover && activePopover.el) {
        activePopover.el.remove();
        activePopover = null;
        document.removeEventListener('click', outsideClickListener);
    }
}

function outsideClickListener(e) {
    if (!activePopover) return;

    // Check if click is inside popover or on the trigger element
    if (activePopover.el.contains(e.target) || activePopover.trigger.contains(e.target)) {
        return;
    }

    closePopover();
}