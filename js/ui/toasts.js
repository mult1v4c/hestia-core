// js/ui/toast.js
import { createEl, appendChildren, qs } from "../dom.js";

export function showToast(message, type = 'success') {
    let container = qs('#toast-container');

    // Create container if it doesn't exist (defensive coding)
    if (!container) {
        container = createEl('div', { attrs: { id: 'toast-container' }, class: 'toast-container' });
        document.body.appendChild(container);
    }

    const iconClass = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';

    const toast = createEl('div', {
        class: `toast ${type}`,
        html: `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`
    });

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('slide-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}