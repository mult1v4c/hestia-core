// js/ui/modal.js
import { qs, on } from "../dom.js";

const els = {
    overlay: () => qs('#modalOverlay'),
    title: () => qs('#modalTitle'),
    content: () => qs('#modalContent'),
    cancel: () => qs('#modalCancel'),
    confirm: () => qs('#modalConfirm')
};

let currentAction = null;

export function initModal() {
    // Bind global close events
    const cancelBtn = els.cancel();
    const overlay = els.overlay();
    const confirmBtn = els.confirm();

    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (overlay) {
        on(document, 'mousedown', '#modalOverlay', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (currentAction) currentAction();
            closeModal();
        };
    }
}

export function showModal(title, html, confirmIcon, action, isDestructive = false) {
    const overlay = els.overlay();
    const confirmBtn = els.confirm();

    if (!overlay) return;

    els.title().innerText = title;
    els.content().innerHTML = html;

    // Update Confirm Button Style
    confirmBtn.innerHTML = confirmIcon || '<i class="fa-solid fa-check"></i>';
    confirmBtn.classList.remove('btn-primary', 'btn-error');
    confirmBtn.classList.add(isDestructive ? 'btn-error' : 'btn-primary');

    currentAction = action;
    overlay.classList.add('active');

    // Auto-focus first input
    const input = els.content().querySelector('input');
    if (input) setTimeout(() => input.focus(), 50);
}

export function closeModal() {
    const overlay = els.overlay();
    if (overlay) overlay.classList.remove('active');
    currentAction = null;
}