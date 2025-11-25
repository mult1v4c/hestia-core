import { state, setState } from "../state.js";
import { qs, qsa } from "../dom.js";
import { showModal } from "./modal.js";
import { showToast } from "./toasts.js";
import { saveImage } from "../imageStore.js";
import { openColorPicker } from "./colorPicker.js";
import { renderGrid } from "../grid.js";
import { saveState } from "../storage.js";
import { formatColor } from "../utils.js";
import { logger } from "../logger.js";

// ... (FORM_HTML remains the same) ...
const FORM_HTML = `
    <div class="form-group" style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="appName" class="modal-input" placeholder="App Name">

        <select id="appSubtype" class="modal-input">
            <option value="link">Link Button</option>
            <option value="text">Text Note</option>
            <option value="image">Image Frame</option>
        </select>

        <div class="dynamic-field" style="display:flex; gap:20px; margin:10px 0;">
            <div style="flex:1;">
                <label style="font-size:0.8rem; color:var(--text-muted);">Background</label>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="color-preview" id="modal-bg-preview" style="background:var(--bg-surface)"></div>
                    <input type="text" id="modalAppBgColorInput" class="modal-input-color" placeholder="#HEX">
                    <!-- Hidden Native Picker for Modal -->
                    <input type="color" id="native-modal-bg" style="display:none;">
                </div>
            </div>
            <div style="flex:1;">
                <label style="font-size:0.8rem; color:var(--text-muted);">Text Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="color-preview" id="modal-text-preview" style="background:var(--text-main)"></div>
                    <input type="text" id="modalAppTextColorInput" class="modal-input-color" placeholder="#HEX">
                    <!-- Hidden Native Picker for Modal -->
                    <input type="color" id="native-modal-text" style="display:none;">
                </div>
            </div>
        </div>

        <div id="field-img-source" class="dynamic-field" style="display:none; gap:15px;">
            <label style="cursor:pointer; display:flex; gap:5px;"><input type="radio" name="imgSource" value="url" checked> Link</label>
            <label style="cursor:pointer; display:flex; gap:5px;"><input type="radio" name="imgSource" value="upload"> Upload</label>
        </div>

        <div id="field-url" class="dynamic-field"><input type="text" id="appUrl" class="modal-input" placeholder="URL (https://...)"></div>
        <div id="field-file" class="dynamic-field" style="display:none;">
            <input type="file" id="appFileInput" class="modal-input" accept="image/*">
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:5px;">Saved to database.</div>
        </div>
        <div id="field-icon" class="dynamic-field"><input type="text" id="appIcon" class="modal-input" placeholder="Icon (e.g. fa-google)"></div>
        <div id="field-content" class="dynamic-field" style="display:none;"><textarea id="appContent" class="modal-input" rows="3" placeholder="Note content..."></textarea></div>
    </div>
`;

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

function updateFormVisibility() {
    const subtypeInput = qs('#appSubtype');
    const subtype = subtypeInput ? subtypeInput.value : 'link';
    const sourceInput = qs('input[name="imgSource"]:checked');
    const source = sourceInput ? sourceInput.value : 'url';

    ['url','icon','content','img-source','file'].forEach(id => {
        const el = qs(`#field-${id}`);
        if(el) el.style.display = 'none';
    });

    if (subtype === 'link') {
        qs('#field-url').style.display = 'block';
        qs('#field-icon').style.display = 'block';
    } else if (subtype === 'text') {
        qs('#field-content').style.display = 'block';
    } else if (subtype === 'image') {
        qs('#field-img-source').style.display = 'flex';
        if (source === 'upload') qs('#field-file').style.display = 'block';
        else qs('#field-url').style.display = 'block';
    }
}

function promptNewApp() {
    if (!state.ui.editMode) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const defaults = {
        name: "", subtype: "link",
        bgColor: rootStyle.getPropertyValue('--bg-surface').trim(),
        textColor: rootStyle.getPropertyValue('--text-main').trim()
    };

    showModal("Add App", FORM_HTML, '<i class="fa-solid fa-plus"></i>', () => {
        handleSaveApp(null);
    });

    setupFormInteractions(defaults);
}

function promptEditApp(card) {
    if (!state.ui.editMode) return;
    const id = parseInt(card.dataset.id);
    const app = state.apps.find(a => a.id === id);
    if (!app) return;

    showModal(`Edit: ${app.name}`, FORM_HTML, '<i class="fa-solid fa-save"></i>', () => {
        handleSaveApp(id);
    });

    qs('#appName').value = app.name;
    qs('#appSubtype').value = app.subtype;

    if (app.subtype === 'link') {
        qs('#appUrl').value = app.data.url || '';
        qs('#appIcon').value = app.data.icon || '';
    } else if (app.subtype === 'text') {
        qs('#appContent').value = app.data.content || '';
    } else if (app.subtype === 'image') {
        const isDB = app.data.url && app.data.url.startsWith('img_');
        const radioVal = isDB ? 'upload' : 'url';
        const radio = qs(`input[name="imgSource"][value="${radioVal}"]`);
        if(radio) radio.checked = true;

        if (isDB) {
            qs('#appUrl').value = "Stored Image";
            qs('#appUrl').disabled = true;
        } else {
            qs('#appUrl').value = app.data.url || '';
        }
    }

    setupFormInteractions({
        bgColor: app.data.bgColor || 'var(--bg-surface)',
        textColor: app.data.textColor || 'var(--text-main)'
    });
}

function promptDeleteApp(card) {
    if (!state.ui.editMode) return;
    const id = parseInt(card.dataset.id);

    showModal(
        "Delete App",
        `<p>Delete <strong>this app</strong>?</p>`,
        `<i class="fa-solid fa-trash"></i>`,
        async () => {
            const newApps = state.apps.filter(a => a.id !== id);
            setState('apps', newApps);
            saveState();
            await renderGrid();
            showToast("App deleted", "success");
        },
        true
    );
}

function setupFormInteractions(initials) {
    qs('#appSubtype').onchange = updateFormVisibility;
    qsa('input[name="imgSource"]').forEach(r => r.onchange = updateFormVisibility);
    updateFormVisibility();

    const bgPreview = qs('#modal-bg-preview');
    const bgInput = qs('#modalAppBgColorInput');
    const txtPreview = qs('#modal-text-preview');
    const txtInput = qs('#modalAppTextColorInput');

    // Hidden native pickers (added in HTML template above)
    const nativeBg = qs('#native-modal-bg');
    const nativeText = qs('#native-modal-text');

    // Init Values
    bgInput.value = initials.bgColor;
    bgPreview.style.background = initials.bgColor;
    txtInput.value = initials.textColor;
    txtPreview.style.background = initials.textColor;

    // Sync Native inputs to current values
    if(nativeBg) nativeBg.value = formatColor(initials.bgColor);
    if(nativeText) nativeText.value = formatColor(initials.textColor);

    // Interactions - Background
    bgPreview.onclick = () => openColorPicker(bgPreview,
        (c) => { // On Select Swatch
            bgInput.value = c;
            bgPreview.style.background = c;
            if(nativeBg) nativeBg.value = formatColor(c);
        },
        () => { // On Custom
            if(nativeBg) nativeBg.click();
        }
    );
    // Sync text input to preview
    bgInput.onchange = (e) => {
        const val = formatColor(e.target.value);
        bgPreview.style.background = val;
        if(nativeBg) nativeBg.value = val;
    };
    // Sync native picker to text input/preview
    if(nativeBg) nativeBg.oninput = (e) => {
        const val = e.target.value;
        bgInput.value = val;
        bgPreview.style.background = val;
    };

    // Interactions - Text Color
    txtPreview.onclick = () => openColorPicker(txtPreview,
        (c) => {
            txtInput.value = c;
            txtPreview.style.background = c;
            if(nativeText) nativeText.value = formatColor(c);
        },
        () => {
            if(nativeText) nativeText.click();
        }
    );
    txtInput.onchange = (e) => {
        const val = formatColor(e.target.value);
        txtPreview.style.background = val;
        if(nativeText) nativeText.value = val;
    };
    if(nativeText) nativeText.oninput = (e) => {
        const val = e.target.value;
        txtInput.value = val;
        txtPreview.style.background = val;
    };
}

async function handleSaveApp(existingId) {
    logger.info("handleSaveApp triggered", { existingId });

    const name = qs('#appName').value.trim() || "Untitled";
    const subtype = qs('#appSubtype').value;

    const data = {
        bgColor: qs('#modalAppBgColorInput').value,
        textColor: qs('#modalAppTextColorInput').value,
        url: undefined,
        icon: undefined,
        content: undefined
    };

    if (subtype === 'link') {
        data.url = qs('#appUrl').value;
        data.icon = qs('#appIcon').value;
    } else if (subtype === 'text') {
        data.content = qs('#appContent').value;
    } else if (subtype === 'image') {
        const isUpload = qs('input[name="imgSource"][value="upload"]').checked;
        if (isUpload) {
            const file = qs('#appFileInput').files[0];
            if (file) {
                try {
                    data.url = await saveImage(file);
                } catch(e) {
                    showToast("Image save failed", "error");
                    return;
                }
            } else if (existingId) {
                const old = state.apps.find(a => a.id === existingId);
                if (old) data.url = old.data.url;
            }
        } else {
            data.url = qs('#appUrl').value;
        }
    }

    const newApps = [...state.apps];

    if (existingId) {
        const idx = newApps.findIndex(a => a.id === existingId);
        if (idx !== -1) {
            newApps[idx] = { ...newApps[idx], name, subtype, data };
        }
    } else {
        newApps.push({
            id: Date.now(),
            name, subtype, type: "static",
            x: 1, y: 1, cols: subtype==='link'?1:2, rows: subtype==='link'?1:2,
            data
        });
    }

    setState('apps', newApps);
    saveState();
    await renderGrid();
    showToast(existingId ? "App updated!" : "App added!", "success");
}