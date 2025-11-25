// js/ui/modal.js
import { qs, on } from "../dom.js";

const els = {
    overlay: qs('#modalOverlay'),
    title: qs('#modalTitle'),
    content: qs('#modalContent'),
    cancel: qs('#modalCancel'),
    confirm: qs('#modalConfirm')
};

let currentAction = null;

export function initModal() {
    if (els.cancel) els.cancel.onclick = closeModal;
    if (els.overlay) {
        on(document, 'mousedown', '#modalOverlay', (e) => {
            if (e.target === els.overlay) closeModal();
        });
    }

    if (els.confirm) {
        els.confirm.onclick = () => {
            if (currentAction) currentAction();
            closeModal();
        };
    }
}

export function showModal(title, html, confirmIcon, action, isDestructive = false) {
    if (!els.overlay) return;

    els.title.innerText = title;
    els.content.innerHTML = html;

    // Update Confirm Button Style
    els.confirm.innerHTML = confirmIcon || '<i class="fa-solid fa-check"></i>';
    els.confirm.classList.remove('btn-primary', 'btn-error');
    els.confirm.classList.add(isDestructive ? 'btn-error' : 'btn-primary');

    currentAction = action;
    els.overlay.classList.add('active');

    // Auto-focus first input
    const input = els.content.querySelector('input');
    if (input) setTimeout(() => input.focus(), 50);
}

export function closeModal() {
    if (els.overlay) els.overlay.classList.remove('active');
    currentAction = null;
}