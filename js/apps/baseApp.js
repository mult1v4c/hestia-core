// apps/baseApp.js

export class BaseApp {
    constructor() {
        this.disposers = [];
        this.disposed = false;
    }

    // All apps must implement this
    async render(appData) {
        throw new Error("Render method not implemented");
    }

    addCleanup(fn) { this.disposers.push(fn); }

    dispose() {
        this.disposed = true;
        this.cleanup?.();
        this.disposers.splice(0).forEach(fn => fn());
    }

    poll(el, update, interval = 5000) {
        const content = el.querySelector('.app-content') || el;
        let timer;
        let running = false;
        let failures = 0;
        const delay = Math.max(1000, Number(interval) || 5000);
        const run = async () => {
            if (running || this.disposed || !el.isConnected) return;
            clearTimeout(timer);
            running = true;
            try {
                await update();
                if (!this.disposed) showServiceState(content, 'online');
                failures = 0;
            } catch (error) {
                failures++;
                if (!this.disposed) showServiceError(content, error);
            } finally {
                running = false;
                if (!this.disposed && el.isConnected) timer = setTimeout(run, Math.min(delay * 2 ** Math.min(failures, 4), Math.max(delay, 300000)));
            }
        };
        content.retryService = run;
        showServiceState(content, 'loading', 'Connecting…');
        this.addCleanup(() => { clearTimeout(timer); delete content.retryService; });
        run();
        return run;
    }
}

// Shared transport and status UI. Never expose response bodies or credentials in errors.
export class ServiceError extends Error {
    constructor(message, kind = 'error', status = 0) {
        super(message);
        this.kind = kind;
        this.status = status;
    }
}

export async function request(url, options = {}) {
    const timeout = AbortSignal.timeout(10000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    let res;
    try {
        res = await fetch(url, { ...options, signal });
    } catch (error) {
        if (options.signal?.aborted) throw error;
        throw new ServiceError(timeout.aborted
            ? 'Request timed out. Check the service and proxy.'
            : 'Cannot reach service. Check its URL, network, HTTPS and CORS settings.', 'offline');
    }
    if (!res.ok) {
        const status = res.status;
        if (status === 401 || status === 403) throw new ServiceError(`HTTP ${status}: check credentials and permissions.`, 'auth', status);
        if (status === 502 || status === 503 || status === 504) throw new ServiceError(`HTTP ${status}: proxy or upstream service unavailable.`, 'offline', status);
        if (status === 404) throw new ServiceError('HTTP 404: check the API URL and version.', 'error', status);
        throw new ServiceError(`Service returned HTTP ${status}.`, 'error', status);
    }
    return res;
}

export async function requestJson(url, options) {
    const res = await request(url, options);
    try { return await res.json(); }
    catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new ServiceError('Request timed out or was cancelled.', 'offline');
        throw new ServiceError('Expected JSON. Check the API URL and proxy route.');
    }
}

export function showServiceState(el, kind, message = '') {
    if (!document.getElementById('service-state-css')) {
        const style = document.createElement('style');
        style.id = 'service-state-css';
        style.textContent = `
            .service-state { position:absolute; inset:0; z-index:12; display:flex; flex-direction:column;
                align-items:center; justify-content:center; gap:8px; padding:12px; box-sizing:border-box;
                background:var(--bg-surface, #202028); color:var(--text-main, #eee); text-align:center; overflow:auto; }
            .service-state[hidden] { display:none; }
            .service-state strong { font-size:.8rem; color:var(--status-warning, #edb65d); }
            .service-state span { max-width:36ch; font-size:.75rem; overflow-wrap:anywhere; }
            .service-state button { font:inherit; font-size:.75rem; color:inherit; background:var(--bg-highlight, #333);
                border:1px solid var(--border-dim, #666); border-radius:4px; padding:4px 10px; cursor:pointer; }
            .app-card > .edit-btn, .app-card > .delete-btn, .app-card > .resize-handle { z-index:20; }
        `;
        document.head.appendChild(style);
    }
    el.dataset.serviceState = kind;
    let panel = el.querySelector(':scope > .service-state');
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'service-state';
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');
        panel.innerHTML = '<strong></strong><span></span><button type="button">Retry</button>';
        panel.querySelector('button').onclick = event => { event.stopPropagation(); el.retryService?.(); };
        el.appendChild(panel);
    }
    panel.hidden = kind === 'online';
    const labels = { loading: 'LOADING', offline: 'OFFLINE', auth: 'AUTH ERROR', error: 'ERROR', setup: 'SETUP REQUIRED' };
    panel.querySelector('strong').textContent = labels[kind] || kind.toUpperCase();
    panel.querySelector('span').textContent = message;
    panel.querySelector('button').hidden = !el.retryService || kind === 'loading' || kind === 'setup';
}

export function showServiceError(el, error) {
    showServiceState(el, error.kind || 'error', error instanceof ServiceError ? error.message : 'Unable to load widget data. Check the service configuration.');
}
