// script.js (Modified for static/local storage)

document.addEventListener('DOMContentLoaded', () => {
    console.log("HestiaHUD: DOM Loaded. Initializing...");

    // =========================================================================
    // 1. DOM ELEMENTS AND GLOBAL STATE
    // =========================================================================

    // --- DOM ELEMENTS ---
    const dashboard = document.getElementById('dashboard');
    let gridLines = document.getElementById('gridLines'); // Initialized here, updated in init/rebuild
    const editBtn = document.getElementById('editBtn');
    const addBtn = document.getElementById('addBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const headerTitle = document.getElementById('headerTitle');
    const presetSelect = document.getElementById('presetSelect');
    const palettePopover = document.getElementById('palettePopover');

    // Modal Elements
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');

    // --- STATE ---
    let isEditMode = false;
    // Data passed from the server (OLD), now uses initial config and local storage
    let availablePalettes = window.HESTIA_PALETTES || {}; // Loaded from palette.js

    // --- NEW: Load Config from localStorage or initial default data ---
    function loadConfig() {
        let savedTheme = {};
        let savedCustomPresets = {};
        let savedApps = null;
        let initialConfig = window.HESTIA_CONFIG_DEFAULT; // Default loaded from index.html

        try {
            // Load theme/presets from localStorage
            const localThemeJson = localStorage.getItem('hestia_theme');
            if (localThemeJson) {
                const localData = JSON.parse(localThemeJson);
                savedTheme = localData.theme || initialConfig.theme;
                savedCustomPresets = localData.custom_presets || initialConfig.custom_presets;
            } else {
                savedTheme = initialConfig.theme;
                savedCustomPresets = initialConfig.custom_presets;
            }

            // Load app layout from localStorage
            const localAppsJson = localStorage.getItem('hestia_apps');
            if (localAppsJson) {
                savedApps = JSON.parse(localAppsJson);
            }

        } catch (e) {
            console.error("Error loading config from localStorage:", e);
            savedTheme = initialConfig.theme;
            savedCustomPresets = initialConfig.custom_presets;
        }

        return {
            theme: savedTheme,
            custom_presets: savedCustomPresets,
            apps: savedApps !== null ? savedApps : window.HESTIA_APPS_DEFAULT || []
        };
    }

    let currentConfig = loadConfig();
    let activePopoverKey = null;
    let modalAction = null;


    // =========================================================================
    // 2. CORE HELPER UTILITIES
    // =========================================================================

    window.formatColor = (c) => {
        if(!c) return '#000000';
        return c.startsWith('#') ? c : '#' + c;
    };

    window.toPx = (val) => {
        if (val === undefined || val === null || val === '') return '0px';
        const str = String(val).trim();
        return /^[0-9.]+$/.test(str) ? str + 'px' : str;
    };

    window.showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if(!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('slide-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    };

    window.exportConfig = () => {
        // 1. Gather current theme/presets (hestia_theme) and apps (hestia_apps)
        const exportData = {
            theme: JSON.parse(localStorage.getItem('hestia_theme')) || { theme: currentConfig.theme, custom_presets: currentConfig.custom_presets },
            apps: JSON.parse(localStorage.getItem('hestia_apps')) || currentConfig.apps
        };

        const json = JSON.stringify(exportData, null, 4);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = 'hestia-core_config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Configuration exported!", "success");
    };

    window.importConfig = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.theme && data.apps) {
                    // 1. Save theme and presets to localStorage
                    localStorage.setItem('hestia_theme', JSON.stringify(data.theme));

                    // 2. Save app layout to localStorage
                    localStorage.setItem('hestia_apps', JSON.stringify(data.apps));

                    showToast("Configuration imported. Reloading...", "success");
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    throw new Error("Invalid Hestia-Core configuration format.");
                }
            } catch (error) {
                showToast("Error importing config: " + error.message, "error");
            }
        };
        reader.readAsText(file);
    };

    window.confirmReset = () => {
        showModal(
            "Reset Dashboard",
            `<p>Are you sure you want to wipe <strong>ALL</strong> saved themes, presets, and app layout? This cannot be undone.</p>`,
            `<i class="fa-solid fa-check"></i>`,
            () => {
                localStorage.removeItem('hestia_theme');
                localStorage.removeItem('hestia_apps');
                showToast("Dashboard reset. Reloading...", "warning");
                setTimeout(() => window.location.reload(), 500);
            },
            true
        );
    };

    // HELPER: Toggle fields in the Add App Modal
    window.toggleFormFields = (type) => {
        const urlField = document.getElementById('field-url');
        const iconField = document.getElementById('field-icon');
        const contentField = document.getElementById('field-content');

        if(urlField) urlField.style.display = (type === 'text') ? 'none' : 'block';
        if(iconField) iconField.style.display = (type === 'link') ? 'block' : 'none';
        if(contentField) contentField.style.display = (type === 'text') ? 'block' : 'none';
    };

    // HELPER: Generate HTML based on App Type
    function getAppContentHTML(app) {
        const data = app.data || {};
        const subtype = app.subtype || 'link';

        if (subtype === 'link') {
            const icon = data.icon || 'fa-globe';
            const url = data.url || '#';
            return `<a href="${url}" target="_blank" class="app-content app-type-link"><i class="fa-solid ${icon}"></i><span>${app.name}</span></a>`;
        }
        if (subtype === 'text') {
            return `<div class="app-content app-type-text"><h4>${app.name}</h4><p>${data.content || ''}</p></div>`;
        }
        if (subtype === 'image') {
            return `<img src="${data.url}" alt="${app.name}" class="app-content app-type-image" draggable="false">`;
        }
        return `<div class="app-content">Unknown Type</div>`;
    }

    // =========================================================================
    // 3. APP LIFECYCLE & INITIALIZATION
    // =========================================================================

    function rebuildDashboardFromConfig(appsArray) {
        dashboard.innerHTML = '<div class="grid-lines" id="gridLines"></div>';
        appsArray.forEach(app => {
            const div = document.createElement('div');
            div.className = 'app-card';
            div.id = `app-${app.id}`;
            div.dataset.id = app.id;
            div.dataset.x = app.x;
            div.dataset.y = app.y;
            div.dataset.cols = app.cols;
            div.dataset.rows = app.rows;
            div.dataset.type = app.type;

            // FIX: Restore Metadata to Dataset
            div.dataset.name = app.name;
            div.dataset.subtype = app.subtype;
            div.dataset.appData = JSON.stringify(app.data || {});

            applyGrid(div, app.x, app.y, app.cols, app.rows);

            const innerHTML = getAppContentHTML(app);

            div.innerHTML = `
                ${innerHTML}
                <div class="resize-handle"></div>
                <div class="card-meta">${app.cols}x${app.rows}</div>
                <div class="delete-btn" onclick="confirmDelete(event, this)" title="Delete App">
                    <i class="fa-solid fa-trash"></i>
                </div>
            `;
            dashboard.appendChild(div);
        });

        gridLines = document.getElementById('gridLines');
        for(let i=0; i<60; i++) {
            const div = document.createElement('div');
            div.className = 'grid-cell';
            gridLines.appendChild(div);
        }
    }


    function init() {
        // 1. Draw Grid Lines (Only for initial render if no local save)
        if (currentConfig.apps.length === 0) {
            gridLines.innerHTML = '';
            for(let i=0; i<60; i++) {
                const div = document.createElement('div');
                div.className = 'grid-cell';
                gridLines.appendChild(div);
            }
        } else {
            rebuildDashboardFromConfig(currentConfig.apps);
        }

        renderPresetOptions();
        applyTheme(currentConfig.theme);
        sanitizeAppLayout();

        if (currentConfig.theme.activePalette && availablePalettes[currentConfig.theme.activePalette]) {
            setPaletteDefaults(availablePalettes[currentConfig.theme.activePalette]);
            if(presetSelect) presetSelect.value = "base16:" + currentConfig.theme.activePalette;
        }
    }

    // =========================================================================
    // 4. THEME & COLOR LOGIC
    // =========================================================================

    function renderPresetOptions() {
        if(!presetSelect) return;
        presetSelect.innerHTML = '<option value="" disabled selected>Select a Theme...</option>';

        const groupBase16 = document.createElement('optgroup');
        groupBase16.label = "Base16 Palettes";
        Object.keys(availablePalettes).sort().forEach(slug => {
            const palette = availablePalettes[slug];
            const opt = document.createElement('option');
            opt.value = "base16:" + slug;
            opt.innerText = palette.name;
            groupBase16.appendChild(opt);
        });
        presetSelect.appendChild(groupBase16);

        const groupCustom = document.createElement('optgroup');
        groupCustom.label = "Custom Presets";
        const customPresets = currentConfig.custom_presets || {};
        for (const key of Object.keys(customPresets)) {
            const opt = document.createElement('option');
            opt.value = "custom:" + key;
            opt.innerText = key;
            groupCustom.appendChild(opt);
        }
        if (groupCustom.children.length > 0) presetSelect.appendChild(groupCustom);
    }

    window.applyPreset = (value) => {
        if(!value) return;
        const [type, name] = value.split(':');

        if (type === 'base16') {
            const palette = availablePalettes[name];
            if (palette) {
                applyBase16Theme(palette); // Overwrites config
                currentConfig.theme.activePalette = name;
                saveTheme();
            }
        } else if (type === 'custom') {
            const themeData = currentConfig.custom_presets[name];
            if (themeData) {
                // Ensure we don't accidentally wipe out non-color settings (e.g., gapSize)
                Object.assign(currentConfig.theme, themeData);
                applyTheme(currentConfig.theme);
                currentConfig.theme.activePalette = null;
                saveTheme();
            }
        }
        presetSelect.value = value;
    };

    function setPaletteDefaults(palette) {
        // Sets the `data-default` attribute on inputs for the reset button
        const mapping = {
            'bgCanvas':     'base00', 'bgSurface':    'base01', 'bgHighlight':  'base02',
            'borderDim':    'base02', 'borderBright': 'base03',
            'textMain':     'base05', 'textMuted':    'base04', 'textFaint':    'base03', 'textInverse':  'base00',
            'brandPrimary': 'base0B', 'brandSecondary':'base0D', 'brandTertiary': 'base0E',
            'statusError':   'base08', 'statusWarning': 'base09', 'statusSuccess': 'base0B'
        };

        for (const [semanticKey, baseKey] of Object.entries(mapping)) {
            if (palette[baseKey]) {
                updateInputDefault(semanticKey, formatColor(palette[baseKey]));
            }
        }
        // Ensure UI reflects modified state immediately
        syncInputs(currentConfig.theme);
    }

    function applyBase16Theme(palette) {
        // 1. Set Defaults for Reset Buttons
        setPaletteDefaults(palette);

        // 2. Overwrite Current Config with Palette Colors
        const mapping = {
            'bgCanvas': 'base00', 'bgSurface': 'base01', 'bgHighlight': 'base02',
            'borderDim': 'base02', 'borderBright': 'base03',
            'textMain': 'base05', 'textMuted': 'base04', 'textFaint': 'base03', 'textInverse': 'base00',
            'brandPrimary': 'base0B', 'brandSecondary': 'base0D', 'brandTertiary': 'base0E',
            'statusError': 'base08', 'statusWarning': 'base09', 'statusSuccess': 'base0B'
        };

        for (const [semanticKey, baseKey] of Object.entries(mapping)) {
            if (palette[baseKey]) {
                currentConfig.theme[semanticKey] = formatColor(palette[baseKey]);
            }
        }

        // 3. Apply CSS
        applyTheme(currentConfig.theme);
    }

    function applyTheme(theme) {
        // Applies all colors and geometry to the root CSS variables
        const root = document.documentElement;

        // 1. Apply Semantic Color Variables
        const colorProps = [
            'bgCanvas', 'bgSurface', 'bgHighlight',
            'borderDim', 'borderBright',
            'textMain', 'textMuted', 'textFaint', 'textInverse',
            'brandPrimary', 'brandSecondary', 'brandTertiary',
            'statusError', 'statusWarning', 'statusSuccess'
        ];

        colorProps.forEach(key => {
            if(theme[key]) {
                // Convert camelCase key to --kebab-case var
                const cssVar = '--' + key.replace(/([A-Z])/g, "-$1").toLowerCase();
                root.style.setProperty(cssVar, theme[key]);
            }
        });

        // 2. Apply Layout Settings (Geometry, Toggles, Header Text)
        applyLayoutSettings();

        // 3. Sync UI Inputs
        syncInputs(theme);
    }

    function applyLayoutSettings() {
        // Applies all non-color theme settings
        const theme = currentConfig.theme;
        const root = document.documentElement;

        // Geometry
        root.style.setProperty('--gap-size', toPx(theme.gapSize));
        root.style.setProperty('--radius', toPx(theme.borderRadius));
        root.style.setProperty('--grid-padding', toPx(theme.gridPadding));
        root.style.setProperty('--grid-cols', theme.gridColumns || 10);
        root.style.setProperty('--grid-rows', theme.gridRows || 6);

        // Font Family
        const font = theme.fontFamily || "Courier New";
        root.style.setProperty('--font-main-stack', font);

        // Toggles
        if (theme.shadow) document.body.classList.add('shadow-on');
        else document.body.classList.remove('shadow-on');

        if (theme.outlines) dashboard.classList.add('show-outlines');
        else dashboard.classList.remove('show-outlines');

        // Header Info
        const iconClass = theme.titleBarIcon || "fa-fire";
        if(headerTitle) headerTitle.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${theme.titleBarText}`;
    }

    // =========================================================================
    // 5. SETTINGS PANEL & UI INTERACTIONS
    // =========================================================================

    window.toggleSettingsPanel = () => {
            const isClosing = settingsPanel.classList.contains('active');

            settingsPanel.classList.toggle('active');
            closePopover();

            if (isClosing) {
                showToast("Dashboard settings saved!", "success");
            }
    };

    window.updateSetting = (key, value, isCheckbox = false) => {
        // Auto-append 'px' for geometry inputs if it's numeric
        if (!isCheckbox && !isNaN(value) && value.trim() !== '' && (key.includes('Size') || key.includes('Padding') || key.includes('Radius'))) {
             value += 'px';
        }
        currentConfig.theme[key] = value;
        applyTheme(currentConfig.theme);

        const input = document.getElementById(`input-${key}`);
        checkResetVisibility(input, key);

        if(key === 'gridColumns' || key === 'gridRows') {
            redrawGridLines();
            sanitizeAppLayout();
        }

        saveTheme();
    };

    function syncInputs(theme) {
        // Updates all form fields and color previews to match the current theme state
        for (const [key, value] of Object.entries(theme)) {
            const input = document.getElementById(`input-${key}`);
            if (input) {
                // Handle the case where the hardcoded value in HTML doesn't match the new theme data.
                // This ensures the inputs reflect the loaded config (localstorage) or default.
                if(input.type === 'checkbox') {
                    // Only update if theme property is explicitly set, otherwise trust the hardcoded/default
                    if (value !== undefined) input.checked = value;
                } else {
                    input.value = value;
                }

                // Update Color Preview Box
                const preview = document.getElementById(`preview-${key}`);
                if(preview) preview.style.backgroundColor = value;

                checkResetVisibility(input, key);
            }
        }
    }

    window.resetSetting = (key) => {
        const input = document.getElementById(`input-${key}`);
        const def = input.getAttribute('data-default');
        if(input.type === 'checkbox') {
            input.checked = (def === 'true');
            window.updateSetting(key, (def === 'true'), true);
        } else {
            input.value = def;
            window.updateSetting(key, def);
        }
    };

    function updateInputDefault(key, color) {
        // Used by Base16 logic to set the 'reset to palette' color
        const input = document.getElementById(`input-${key}`);
        if(input) input.setAttribute('data-default', formatColor(color));
    }

    function checkResetVisibility(input, key) {
        // Shows/hides the reset icon based on whether the input value differs from its default
        const defaultVal = input.getAttribute('data-default');
        const resetBtn = document.getElementById(`reset-${key}`);
        if(!resetBtn || !defaultVal) return;

        let isDifferent = false;
        if(input.type === 'checkbox') isDifferent = (input.checked !== (defaultVal === 'true'));
        else isDifferent = (input.value.toLowerCase() !== defaultVal.toLowerCase());

        if(isDifferent) resetBtn.classList.add('visible');
        else resetBtn.classList.remove('visible');
    }

    window.saveCustomPreset = () => {
        const nameInput = document.getElementById('newThemeName');
        const name = nameInput.value.trim();
        if (!name) { showToast("Please enter a theme name.", "error"); return; }

        // Only save semantic colors (not layout properties like gapSize)
        const currentColors = {};
        const props = [
            'bgCanvas', 'bgSurface', 'bgHighlight', 'borderDim', 'borderBright',
            'textMain', 'textMuted', 'textFaint', 'textInverse',
            'brandPrimary', 'brandSecondary', 'brandTertiary',
            'statusError', 'statusWarning', 'statusSuccess'
        ];
        props.forEach(p => currentColors[p] = currentConfig.theme[p]);

        if (!currentConfig.custom_presets) currentConfig.custom_presets = {};
        currentConfig.custom_presets[name] = currentColors;

        renderPresetOptions();
        presetSelect.value = "custom:" + name;
        nameInput.value = "";
        saveTheme();
        showToast("Custom preset saved!", "success");
    };

    // --- COLOR PICKER & POPOVER LOGIC ---
    window.openPicker = (key) => {
        activePopoverKey = key;
        const preview = document.getElementById(`preview-${key}`);
        if(!preview) return;

        const rect = preview.getBoundingClientRect();
        const panelRect = settingsPanel.getBoundingClientRect();

        // Position the popover near the color swatch, adjusted for center modal
        palettePopover.style.top = (rect.bottom - panelRect.top + 5) + 'px';
        palettePopover.style.left = (rect.left - panelRect.left + 490) + 'px';

        let colors = [];
        const activePal = currentConfig.theme.activePalette;
        if(activePal && availablePalettes[activePal]) {
            const p = availablePalettes[activePal];
            ['base00','base01','base02','base03','base04','base05','base06','base07',
             'base08','base09','base0A','base0B','base0C','base0D','base0E','base0F'].forEach(k => {
                 if(p[k]) colors.push(formatColor(p[k]));
             });
        } else {
            // If no base16 palette is active (custom mode), immediately open native picker
            document.getElementById(`input-${key}`).click();
            return;
        }

        let html = '<div class="popover-grid">';
        colors.forEach(c => {
            html += `<div class="palette-swatch" style="background:${c}" onclick="selectPopoverColor('${c}')"></div>`;
        });
        html += '</div><div class="popover-footer"><button class="btn" onclick="openNativePicker()">Custom...</button></div>';
        palettePopover.innerHTML = html;
        palettePopover.classList.add('active');
    };

    window.selectPopoverColor = (color) => {
        if(activePopoverKey) {
            const input = document.getElementById(`input-${activePopoverKey}`);
            input.value = color;
            window.updateSetting(activePopoverKey, color);
        }
        closePopover();
    };

    window.openNativePicker = () => {
        if(activePopoverKey) document.getElementById(`input-${activePopoverKey}`).click();
        closePopover();
    };

    function closePopover() {
        if(palettePopover) {
            palettePopover.classList.remove('active');
            activePopoverKey = null;
        }
    }


    // =========================================================================
    // 6. DASHBOARD & EDIT MODE LOGIC (UPDATED FOR LOCAL STORAGE)
    // =========================================================================

    window.toggleEditMode = () => {
        const clearBtn = document.getElementById('clearBtn');

        if (!isEditMode) {
            // ENTERING EDIT MODE
            isEditMode = true;
            dashboard.classList.add('edit-mode');

            editBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
            editBtn.title = 'Save Layout'; // Update tooltip
            editBtn.classList.remove('btn-primary');
            editBtn.style.borderColor = "var(--brand-primary)";

            addBtn.disabled = false;   // Light up Add button
            if(clearBtn) clearBtn.disabled = false; // Light up Clear button

            window.getSelection().removeAllRanges();
        } else {
            // EXITING EDIT MODE
            saveApps();
            isEditMode = false;
            dashboard.classList.remove('edit-mode');

            editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
            editBtn.title = 'Edit Layout'; // Reset tooltip
            editBtn.classList.add('btn-primary');

            addBtn.disabled = true;    // Dim Add button
            if(clearBtn) clearBtn.disabled = true;  // Dim Clear button
        }
    };

    function saveApps() {
        const apps = [];
        document.querySelectorAll('.app-card').forEach(card => {
            apps.push({
                id: parseInt(card.dataset.id),
                name: card.dataset.name,
                subtype: card.dataset.subtype,
                type: card.dataset.type || "static",
                x: parseInt(card.dataset.x),
                y: parseInt(card.dataset.y),
                cols: parseInt(card.dataset.cols),
                rows: parseInt(card.dataset.rows),
                data: JSON.parse(card.dataset.appData || '{}')
            });
        });
        currentConfig.apps = apps;

        try {
            localStorage.setItem('hestia_apps', JSON.stringify(apps));

            const originalIcon = editBtn.innerHTML;
            editBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                 if(!isEditMode) editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
                 else editBtn.innerHTML = originalIcon;
            }, 1500);
            showToast("App layout saved!", "success");
        } catch(err) {
            showToast("Error saving apps. " + err, "error");
        }
    }

    function saveTheme() {
        // Prepare payload: Theme + Custom Presets (No Apps)
        const payload = {
            theme: currentConfig.theme,
            custom_presets: currentConfig.custom_presets || {}
        };

        // Use localStorage instead of server-side API
        try {
            localStorage.setItem('hestia_theme', JSON.stringify(payload));
        //    showToast("Theme settings saved!", "success");
        } catch(err) {
            showToast("Error saving theme: " + err, "error");
        }
    }

    // --- APP CRUD LOGIC ---
    window.promptNewApp = () => {
        if(!isEditMode) return;

        const html = `
            <div class="form-group" style="display:flex; flex-direction:column; gap:10px;">
                <input type="text" id="appName" class="modal-input" placeholder="App Name (e.g. Google)">
                <select id="appSubtype" class="modal-input" onchange="toggleFormFields(this.value)">
                    <option value="link">Link Button</option>
                    <option value="text">Text Note</option>
                    <option value="image">Image Frame</option>
                </select>
                <div id="field-url" class="dynamic-field"><input type="text" id="appUrl" class="modal-input" placeholder="URL (https://...)"></div>
                <div id="field-icon" class="dynamic-field"><input type="text" id="appIcon" class="modal-input" placeholder="Icon (e.g. fa-google)"></div>
                <div id="field-content" class="dynamic-field" style="display:none;"><textarea id="appContent" class="modal-input" rows="3" placeholder="Type your note here..."></textarea></div>
            </div>
        `;

        showModal("Add Static App", html, `<i class="fa-solid fa-plus"></i>`, () => {
            const name = document.getElementById('appName').value.trim() || "Untitled";
            const subtype = document.getElementById('appSubtype').value;

            const newAppData = { type: 'static', subtype: subtype, name: name, data: {} };

            if(subtype === 'link') {
                newAppData.data.url = document.getElementById('appUrl').value;
                newAppData.data.icon = document.getElementById('appIcon').value || 'fa-link';
            } else if (subtype === 'image') {
                newAppData.data.url = document.getElementById('appUrl').value;
            } else if (subtype === 'text') {
                newAppData.data.content = document.getElementById('appContent').value;
            }
            window.createApp(newAppData);
        });
    };

    window.createApp = (appConfig) => {
        // FIX: Ensure we are using the passed object, not 'name'
        const cols = parseInt(currentConfig.theme.gridColumns) || 10;
        const rows = parseInt(currentConfig.theme.gridRows) || 6;

        cachedApps = Array.from(document.querySelectorAll('.app-card')).map(app => ({
            el: app, x: parseInt(app.dataset.x, 10)||0, y: parseInt(app.dataset.y, 10)||0,
            cols: parseInt(app.dataset.cols, 10)||1, rows: parseInt(app.dataset.rows, 10)||1
        }));

        let x = 1, y = 1, found = false;

        for(let r=1; r<=rows; r++) {
            for(let c=1; c<=cols; c++) {
                if(!checkCollision(null, c, r, 1, 1)) {
                    x = c; y = r; found = true; break;
                }
            }
            if(found) break;
        }

        if (!found) { window.showToast("Dashboard full!", "error"); return; }

        const div = document.createElement('div');
        const newId = Date.now();
        div.className = 'app-card';
        div.id = `app-${newId}`;
        div.dataset.id = newId;
        div.dataset.x = x;
        div.dataset.y = y;

        // FIX: Store Metadata in Dataset so saveApps() can find it
        div.dataset.name = appConfig.name;
        div.dataset.subtype = appConfig.subtype;
        div.dataset.appData = JSON.stringify(appConfig.data);

        // Default Sizes
        let w = 1, h = 1;
        if(appConfig.subtype === 'text') { w = 2; h = 2; }
        if(appConfig.subtype === 'image') { w = 3; h = 2; }

        div.dataset.cols = w;
        div.dataset.rows = h;
        div.dataset.type = "static";

        applyGrid(div, x, y, w, h);

        // Construct full object for renderer
        const fullAppObj = {
            id: newId,
            name: appConfig.name,
            subtype: appConfig.subtype,
            data: appConfig.data,
            x:x, y:y, cols:w, rows:h
        };

        const innerHTML = getAppContentHTML(fullAppObj);

        div.innerHTML = `
            ${innerHTML}
            <div class="resize-handle"></div>
            <div class="card-meta">${w}x${h}</div>
            <div class="delete-btn" onclick="confirmDelete(event, this)" title="Delete App">
                <i class="fa-solid fa-trash"></i>
            </div>
        `;

        dashboard.appendChild(div);
        saveApps();
        window.showToast(`${appConfig.name} added!`, "success");
    };


    window.confirmDelete = (e, btn) => {
        e.stopPropagation(); if(!isEditMode) return;
        const card = btn.closest('.app-card');

        // FIX: Use dataset.name
        const appName = card.dataset.name || "App";

        showModal(
            "Delete App",
            `<p>Remove <strong>${appName}</strong>?</p>`,
            `<i class="fa-solid fa-trash"></i>`,
            () => {
                card.remove();
                window.showToast("App deleted", "success");
            },
            true
        );
    };

    window.confirmClearAll = () => {
        if(!isEditMode) return; // Safety check

        showModal(
            "Clear Dashboard",
            "<p>Are you sure you want to remove <strong>ALL</strong> apps? This cannot be undone.</p>",
            `<i class="fa-solid fa-broom"></i>`,
            () => {
                // 1. Wipe Config
                currentConfig.apps = [];
                // 2. Wipe Local Storage
                saveApps();
                // 3. Wipe UI
                rebuildDashboardFromConfig([]);
                window.showToast("Dashboard cleared!", "success");
            },
            true
        );
    };

    window.renameApp = (el) => {
        if(!isEditMode) return;
        el.contentEditable = true; el.focus();
        const save = () => { el.contentEditable = false; el.removeEventListener('blur', save); el.removeEventListener('keydown', key); };
        const key = (e) => { if(e.key === 'Enter') { e.preventDefault(); save(); } };
        el.addEventListener('blur', save); el.addEventListener('keydown', key);
    };

    // --- GRID HELPERS ---
    function applyGrid(el, x, y, w, h) { el.style.gridColumn = `${x} / span ${w}`; el.style.gridRow = `${y} / span ${h}`; }

    function checkCollision(targetEl, x, y, w, h) {
        const tL = x, tR = x + w, tT = y, tB = y + h;
        for (let app of cachedApps) {
            if (app.el === targetEl) continue;
            if (tL < app.x + app.cols && tR > app.x && tT < app.y + app.rows && tB > app.y) {
                return true;
            }
        }
        return false;
    }

    function redrawGridLines() {
        if(!gridLines) return;
        gridLines.innerHTML = '';
        const cols = parseInt(currentConfig.theme.gridColumns) || 10;
        const rows = parseInt(currentConfig.theme.gridRows) || 6;
        const count = cols * rows;

        for(let i=0; i<count; i++) {
            const div = document.createElement('div');
            div.className = 'grid-cell';
            gridLines.appendChild(div);
        }
    }

    function sanitizeAppLayout() {
        const cols = parseInt(currentConfig.theme.gridColumns) || 10;
        const rows = parseInt(currentConfig.theme.gridRows) || 6;
        const allApps = document.querySelectorAll('.app-card');
        let movedCount = 0;

        // 1. First Pass: Clamp everyone to the new grid limits
        allApps.forEach(card => {
            let x = parseInt(card.dataset.x) || 1;
            let y = parseInt(card.dataset.y) || 1;
            let w = parseInt(card.dataset.cols) || 1;
            let h = parseInt(card.dataset.rows) || 1;

            let needsUpdate = false;

            // Clamp X and Y (Move app in if it's too far right/down)
            if (x > cols) { x = cols; needsUpdate = true; }
            if (y > rows) { y = rows; needsUpdate = true; }

            // Clamp Width and Height (Shrink app if it spills over edge)
            // Formula: (Start + Size - 1) must be <= Limit
            if (x + w - 1 > cols) { w = Math.max(1, cols - x + 1); needsUpdate = true; }
            if (y + h - 1 > rows) { h = Math.max(1, rows - y + 1); needsUpdate = true; }

            if (needsUpdate) {
                // Apply new values
                card.dataset.x = x;
                card.dataset.y = y;
                card.dataset.cols = w;
                card.dataset.rows = h;
                applyGrid(card, x, y, w, h);

                // Update visual "3x2" label
                const meta = card.querySelector('.card-meta');
                if(meta) meta.innerText = `${w}x${h}`;

                movedCount++;
            }
        });

        // 2. Second Pass: Check for overlaps to warn the user
        let hasOverlap = false;

        // Create a temporary cache of the NEW positions
        const tempCache = Array.from(allApps).map(app => ({
            el: app,
            x: parseInt(app.dataset.x),
            y: parseInt(app.dataset.y),
            cols: parseInt(app.dataset.cols),
            rows: parseInt(app.dataset.rows)
        }));

        for (let i = 0; i < tempCache.length; i++) {
            const A = tempCache[i];
            for (let j = i + 1; j < tempCache.length; j++) {
                const B = tempCache[j];

                // Simple Rectangle Intersection Test
                if (A.x < B.x + B.cols &&
                    A.x + A.cols > B.x &&
                    A.y < B.y + B.rows &&
                    A.y + A.rows > B.y) {
                        hasOverlap = true;
                        break;
                }
            }
            if(hasOverlap) break;
        }

        // 3. Save and Notify
        if (movedCount > 0) {
            saveApps(); // Save the new clamped positions
            if (hasOverlap) {
                showToast("Grid resized. Some apps may be overlapping.", "warning");
            } else {
                showToast("Grid resized. Apps adjusted to fit.", "success");
            }
        }
    }

    // --- MODAL LOGIC (Unchanged) ---
    function showModal(title, html, confirmText, action, isDestructive = false) {
        if(!modalOverlay) return;
        modalTitle.innerText = title;
        modalContent.innerHTML = html;
        modalConfirm.innerHTML = confirmText;
        modalAction = action;

        modalConfirm.classList.remove('btn-primary', 'btn-error');

        if (isDestructive) {
            modalConfirm.classList.add('btn-error');
        } else {
            modalConfirm.classList.add('btn-primary');
    }

    modalOverlay.classList.add('active');
    const input = modalContent.querySelector('input'); if(input) setTimeout(() => input.focus(), 50);
}

    function closeModal() { if(modalOverlay) modalOverlay.classList.remove('active'); modalAction = null; }
    if(modalCancel) modalCancel.onclick = closeModal;
    if(modalConfirm) modalConfirm.onclick = () => { if(modalAction) modalAction(); closeModal(); };

    // --- DRAG AND DROP LOGIC (Unchanged) ---
    let actItem, initX, initY, sGX, sGY, sC, sR, mode, gridRect, cachedApps = [];
    dashboard.addEventListener('mousedown', e => {
        if(!isEditMode || e.target.closest('.delete-btn') || e.target.isContentEditable) return;
        if(e.target.classList.contains('resize-handle')) { mode='resize'; actItem=e.target.parentElement; }
        else if(e.target.closest('.app-card')) { mode='move'; actItem=e.target.closest('.app-card'); }
        else return;
        e.preventDefault(); initX = e.clientX; initY = e.clientY;

        gridRect = gridLines.getBoundingClientRect();

        cachedApps = Array.from(document.querySelectorAll('.app-card')).map(app => ({
            el: app,
            x: parseInt(app.dataset.x, 10)||0,
            y: parseInt(app.dataset.y, 10)||0,
            cols: parseInt(app.dataset.cols, 10)||1,
            rows: parseInt(app.dataset.rows, 10)||1
        }));

        sGX = parseInt(actItem.dataset.x, 10); sGY = parseInt(actItem.dataset.y, 10); sC = parseInt(actItem.dataset.cols, 10); sR = parseInt(actItem.dataset.rows, 10);
        actItem.classList.add('moving');
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);

    });
    function onMove(e) {
        if(!actItem) return;

        const cols = parseInt(currentConfig.theme.gridColumns) || 10;
        const rows = parseInt(currentConfig.theme.gridRows) || 6;

        // Use cached gridRect instead of getBoundingClientRect()
        const cW = gridRect.width / cols;
        const cH = gridRect.height / rows;

        const gDx = Math.round((e.clientX - initX) / cW);
        const gDy = Math.round((e.clientY - initY) / cH);

        const maxC = cols + 1;
        const maxR = rows + 1;

        if(mode === 'move') {
            let nX = sGX + gDx, nY = sGY + gDy;

            if(nX < 1) nX = 1;
            if(nY < 1) nY = 1;
            if(nX + sC > maxC) nX = maxC - sC;
            if(nY + sR > maxR) nY = maxR - sR;

            if(!checkCollision(actItem, nX, nY, sC, sR)) {
                applyGrid(actItem, nX, nY, sC, sR);
                actItem.classList.remove('collision');
            } else {
                actItem.classList.add('collision');
            }
        } else { // resize mode
            let nC = sC + gDx, nR = sR + gDy;

            if(nC < 1) nC = 1;
            if(nR < 1) nR = 1;
            if(sGX + nC > maxC) nC = maxC - sGX;
            if(sGY + nR > maxR) nR = maxR - sGY;

            if(!checkCollision(actItem, sGX, sGY, nC, nR)) {
                applyGrid(actItem, sGX, sGY, nC, nR);
                actItem.classList.remove('collision');
            } else {
                actItem.classList.add('collision');
            }
        }
    }
    function onUp() {
        if(actItem) {
            actItem.classList.remove('moving', 'collision');
            // The following lines assume gridColumn/gridRow style properties are set by applyGrid in a way that includes 'start' and 'span'
            // We need to parse the values. The applyGrid function sets: el.style.gridColumn = `${x} / span ${w}`;
            const colsSpan = actItem.style.gridColumn.split('span ')[1];
            const rowsSpan = actItem.style.gridRow.split('span ')[1];
            const x = actItem.style.gridColumnStart;
            const y = actItem.style.gridRowStart;

            actItem.dataset.x = x;
            actItem.dataset.y = y;
            actItem.dataset.cols = colsSpan;
            actItem.dataset.rows = rowsSpan;

            const meta = actItem.querySelector('.card-meta'); if(meta) meta.innerText = `${actItem.dataset.cols}x${actItem.dataset.rows}`;
        }
        actItem=null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
    }

    // Global click listener for closing settings/popover when clicking outside
    document.addEventListener('click', (e) => {
        if (settingsPanel && settingsPanel.classList.contains('active') && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target) && (!palettePopover || !palettePopover.contains(e.target)) && !e.target.closest('.color-preview')) { settingsPanel.classList.remove('active'); closePopover(); showToast("Dashboard settings saved!", "success");}
        if(palettePopover && palettePopover.classList.contains('active') && !palettePopover.contains(e.target) && !e.target.closest('.color-preview')) closePopover();
    });

    if(modalOverlay) modalOverlay.addEventListener('mousedown', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Start application
    init();
});