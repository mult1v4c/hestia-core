// js/ui/toasts.js
import { createEl, qs } from "../dom.js";

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 */
export function showToast(message, type = 'success') {
    let container = qs('#toast-container');

    if (!container) {
        container = createEl('div', { attrs: { id: 'toast-container' }, class: 'toast-container' });
        document.body.appendChild(container);
    }

    const iconMap = {
        error: 'fa-circle-exclamation',
        success: 'fa-circle-check',
        warning: 'fa-triangle-exclamation'
    };

    const iconClass = iconMap[type] || 'fa-info-circle';

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