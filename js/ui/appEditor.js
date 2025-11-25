import { state, setState } from "../state.js";
import { qs, qsa, createEl } from "../dom.js";
import { showModal } from "./modal.js";
import { showToast } from "./toasts.js";
import { openColorPicker } from "./colorPicker.js";
import { renderGrid } from "../grid.js";
import { saveState } from "../storage.js";
import { formatColor, toHex } from "../utils.js";
import { registry } from "../registry.js";
import { saveImage } from "../imageStore.js"; // Import DB Saver

// ---------------------------------------------------------
// 1. THE FORM GENERATOR
// ---------------------------------------------------------

function generateEditorHtml(appType, currentData = {}) {
    const appDef = registry.get(appType);
    if (!appDef) return '<div class="error">Unknown App Type</div>';

    const defaults = {
        name: currentData.name || '',
        bgColor: currentData.data?.bgColor || 'var(--bg-surface)',
        textColor: currentData.data?.textColor || 'var(--text-main)',
    };

    let html = `
    <div id="editor-container" style="display:flex; flex-direction:column; gap:15px;">
        <div class="form-group">
            <label class="label-muted">App Name</label>
            <input type="text" id="core-name" class="modal-input" value="${defaults.name}" placeholder="My App">
        </div>

        <div style="display:flex; gap:20px;">
            <div style="flex:1;">
                <label class="label-muted">Background</label>
                <div class="color-wrapper">
                    <div class="color-preview" id="preview-core-bgColor" style="background:${defaults.bgColor}"></div>
                    <input type="text" id="core-bgColor" class="modal-input modal-input-color" value="${defaults.bgColor}">
                    <input type="color" id="native-core-bgColor" class="hidden-native" value="${toHex(defaults.bgColor)}">
                </div>
            </div>
            <div style="flex:1;">
                <label class="label-muted">Text Color</label>
                <div class="color-wrapper">
                    <div class="color-preview" id="preview-core-textColor" style="background:${defaults.textColor}"></div>
                    <input type="text" id="core-textColor" class="modal-input modal-input-color" value="${defaults.textColor}">
                    <input type="color" id="native-core-textColor" class="hidden-native" value="${toHex(defaults.textColor)}">
                </div>
            </div>
        </div>

        <hr style="border:0; border-top:1px solid var(--border-dim); margin:5px 0;">

        <div id="dynamic-fields-area">
            ${generateDynamicFields(appDef, currentData.data || {})}
        </div>
    </div>

    <style>
        .label-muted { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; display:block; }
        .color-wrapper { display: flex; align-items: center; gap: 8px; }
        .color-preview { width: 30px; height: 30px; border-radius: 4px; border: 1px solid var(--border-dim); cursor: pointer; }
        .hidden-native { width: 0; height: 0; opacity: 0; position: absolute; }
        .image-source-controls { display: flex; gap: 15px; margin-bottom: 8px; font-size: 0.9rem; }
        .image-source-controls label { cursor: pointer; display: flex; align-items: center; gap: 5px; }
    </style>
    `;

    return html;
}

function generateDynamicFields(appDef, appData) {
    const settings = appDef.metadata.settings || [];
    let html = '';

    settings.forEach(field => {
        if (field.name === 'bgColor' || field.name === 'textColor') return;

        const value = appData[field.name] || field.defaultValue || '';

        html += `<div class="form-group" style="margin-bottom:10px;">`;
        html += `<label class="label-muted">${field.label}</label>`;

        if (field.type === 'textarea') {
            html += `<textarea class="modal-input dynamic-input" data-key="${field.name}" rows="4">${value}</textarea>`;
        }
        else if (field.type === 'select') {
            html += `<select class="modal-input dynamic-input" data-key="${field.name}">`;
            field.options.forEach(opt => {
                const sel = opt.value === value ? 'selected' : '';
                html += `<option value="${opt.value}" ${sel}>${opt.label}</option>`;
            });
            html += `</select>`;
        }
        else if (field.type === 'image-source') {
            // Special UI for Image Source (Link vs Upload)
            const isDB = value.startsWith('img_');
            const showLink = !isDB;

            html += `
            <div class="image-source-wrapper" data-key="${field.name}">
                <div class="image-source-controls">
                    <label><input type="radio" name="source_type_${field.name}" value="link" ${showLink ? 'checked' : ''}> Link</label>
                    <label><input type="radio" name="source_type_${field.name}" value="upload" ${isDB ? 'checked' : ''}> Upload</label>
                </div>

                <input type="text" class="modal-input source-input-link"
                       value="${isDB ? '' : value}"
                       placeholder="https://..."
                       style="${showLink ? '' : 'display:none'}">

                <div class="source-input-file" style="${!showLink ? '' : 'display:none'}">
                    <input type="file" class="modal-input" accept="image/*">
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">
                        ${isDB ? 'Currently using saved image.' : ''}
                    </div>
                </div>

                <input type="hidden" class="dynamic-input" data-key="${field.name}" value="${value}">
            </div>`;
        }
        else {
            html += `<input type="text" class="modal-input dynamic-input" data-key="${field.name}" value="${value}" placeholder="${field.placeholder || ''}">`;
        }
        html += `</div>`;
    });

    return html;
}

// ---------------------------------------------------------
// 2. INTERACTION HANDLERS
// ---------------------------------------------------------

function attachInteractions() {
    setupColorPicker('core-bgColor');
    setupColorPicker('core-textColor');

    // Attach Image Source Toggles
    qsa('.image-source-wrapper').forEach(wrapper => {
        const radios = wrapper.querySelectorAll('input[type="radio"]');
        const linkInput = wrapper.querySelector('.source-input-link');
        const fileInput = wrapper.querySelector('.source-input-file');

        radios.forEach(radio => {
            radio.onchange = (e) => {
                if (e.target.value === 'link') {
                    linkInput.style.display = 'block';
                    fileInput.style.display = 'none';
                } else {
                    linkInput.style.display = 'none';
                    fileInput.style.display = 'block';
                }
            };
        });
    });
}

function setupColorPicker(id) {
    const input = qs(`#${id}`);
    const preview = qs(`#preview-${id}`);
    const native = qs(`#native-${id}`);
    if (!input || !preview) return;

    preview.onclick = () => {
        openColorPicker(preview, (hex) => {
            input.value = hex;
            preview.style.background = hex;
            if (native) native.value = toHex(hex);
        }, () => { if (native) native.click(); });
    };

    input.onchange = (e) => {
        const val = formatColor(e.target.value);
        preview.style.background = val;
        if (native) native.value = toHex(val);
    };

    if (native) {
        native.oninput = (e) => {
            input.value = e.target.value;
            preview.style.background = e.target.value;
        };
    }
}

// ---------------------------------------------------------
// 3. MAIN ENTRY POINTS
// ---------------------------------------------------------

export function initAppEditor() {
    const addBtn = qs('#addBtn');
    if (addBtn) addBtn.onclick = promptNewApp;

    const dashboard = qs('#dashboard');
    if (dashboard) {
        dashboard.addEventListener('click', (e) => {
            const target = e.target;
            const card = target.closest('.app-card');
            if (!card) return;
            if (target.closest('.edit-btn')) promptEditApp(card);
            if (target.closest('.delete-btn')) promptDeleteApp(card);
        });
    }
}

function promptNewApp() {
    const allApps = registry.getAll();
    if (allApps.length === 0) return showToast("No apps registered!", "error");

    let currentType = allApps[0].type || 'link';

    const renderModalContent = () => {
        let typeSelectHtml = `<div class="form-group" style="margin-bottom:15px;">
            <label class="label-muted">App Type</label>
            <select id="new-app-type-select" class="modal-input">`;

        Object.entries(registry.apps).forEach(([key, val]) => {
            const sel = key === currentType ? 'selected' : '';
            typeSelectHtml += `<option value="${key}" ${sel}>${val.metadata.label || val.metadata.name}</option>`;
        });
        typeSelectHtml += `</select></div>`;
        return typeSelectHtml + generateEditorHtml(currentType);
    };

    showModal("Add New App", renderModalContent(), '<i class="fa-solid fa-plus"></i>', () => {
        saveApp(null, currentType);
    });

    attachInteractions();

    const typeSelect = qs('#new-app-type-select');
    if (typeSelect) {
        typeSelect.onchange = (e) => {
            currentType = e.target.value;
            const contentDiv = qs('#modalContent');
            if (contentDiv) {
                contentDiv.innerHTML = renderModalContent();
                attachInteractions();
                qs('#new-app-type-select').onchange = typeSelect.onchange;
            }
        };
    }
}

function promptEditApp(card) {
    if (!state.ui.editMode) return;
    const id = parseInt(card.dataset.id);
    const app = state.apps.find(a => a.id === id);
    if (!app) return;

    showModal(`Edit ${app.name}`, generateEditorHtml(app.subtype, app), '<i class="fa-solid fa-floppy-disk"></i>', () => {
        saveApp(id, app.subtype);
    });

    attachInteractions();
}

function promptDeleteApp(card) {
    if (!state.ui.editMode) return;
    const id = parseInt(card.dataset.id);
    showModal("Delete App", `<p>Delete <strong>this app</strong>?</p>`, `<i class="fa-solid fa-trash"></i>`, async () => {
        const newApps = state.apps.filter(a => a.id !== id);
        setState('apps', newApps);
        saveState();
        await renderGrid();
        showToast("App deleted", "success");
    }, true);
}

// ---------------------------------------------------------
// 4. SAVE LOGIC (UPDATED FOR ASYNC UPLOADS)
// ---------------------------------------------------------

async function saveApp(existingId, type) {
    // 1. Core Data
    const name = qs('#core-name').value.trim() || "Untitled";
    const bgColor = qs('#core-bgColor').value;
    const textColor = qs('#core-textColor').value;

    // 2. Dynamic Data
    const dynamicData = {};
    const promises = []; // To track async uploads

    // Handle Standard Inputs
    qsa('.dynamic-input').forEach(input => {
        const key = input.dataset.key;
        if (key) dynamicData[key] = input.value;
    });

    // Handle Image Sources (Link vs Upload)
    const imageWrappers = qsa('.image-source-wrapper');
    for (const wrapper of imageWrappers) {
        const key = wrapper.dataset.key;
        const mode = wrapper.querySelector('input[type="radio"]:checked').value;

        if (mode === 'link') {
            const linkVal = wrapper.querySelector('.source-input-link').value;
            dynamicData[key] = linkVal;
        } else {
            // Upload Mode
            const fileInput = wrapper.querySelector('input[type="file"]');
            if (fileInput.files.length > 0) {
                // Save New File
                try {
                    const file = fileInput.files[0];
                    const id = await saveImage(file); // Store in IndexedDB
                    dynamicData[key] = id;
                } catch (e) {
                    showToast("Failed to upload image", "error");
                    return;
                }
            } else {
                // No new file, keep existing ID (from hidden input)
                // Use the hidden input's value which we stored in initial dynamicData extraction
                // But specifically: if it was a URL before, and we switched to upload but didn't pick a file,
                // we technically have "no image".
                // Logic: If current hidden value is 'img_...', keep it. Else empty.
                const original = wrapper.querySelector('.dynamic-input').value;
                if (original && original.startsWith('img_')) {
                    dynamicData[key] = original;
                } else {
                    dynamicData[key] = ""; // Cleared
                }
            }
        }
    }

    // 3. Merge & Save
    const finalData = { ...dynamicData, bgColor, textColor };
    let newApps = [...state.apps];

    if (existingId) {
        const idx = newApps.findIndex(a => a.id === existingId);
        if (idx !== -1) {
            newApps[idx] = {
                ...newApps[idx],
                name: name,
                data: { ...newApps[idx].data, ...finalData }
            };
        }
    } else {
        const appDef = registry.get(type);
        const size = appDef.metadata.defaultSize || { cols: 1, rows: 1 };
        newApps.push({
            id: Date.now(),
            name: name,
            subtype: type,
            type: "static",
            x: 1, y: 1,
            cols: size.cols || size.w,
            rows: size.rows || size.h,
            data: finalData
        });
    }

    setState('apps', newApps);
    saveState();
    await renderGrid();
    showToast(existingId ? "App updated!" : "App added!", "success");
}