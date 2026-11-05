import { requestJson, ServiceError } from '../baseApp.js';
export { formatBytes } from '../glances/gCore.js';

let requestId = 1;
export function delugeUrl(raw) {
    const url = new URL(raw.trim(), window.location.origin);
    url.pathname = url.pathname.replace(/\/+$/, '');
    if (!url.pathname.endsWith('/json')) url.pathname += '/json';
    return url;
}

export async function fetchDeluge(rawUrl, method, params = [], password = '') {
    const url = delugeUrl(rawUrl);
    const rpc = async (name, args) => {
        const data = await requestJson(url, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: name, params: args, id: requestId++ })
        });
        if (data?.error) {
            const auth = Number(data.error.code) === 1 || /not authenticated|not authorized|unauthorized/i.test(data.error.message || '');
            throw new ServiceError(auth ? 'Deluge session expired. Check the Web password.' : 'Deluge RPC failed. Check its Web UI and daemon.', auth ? 'auth' : 'error');
        }
        if (!data || !Object.hasOwn(data, 'result')) throw new ServiceError('Invalid Deluge RPC response. Check the JSON-RPC URL.');
        return data.result;
    };
    try { return await rpc(method, params); }
    catch (error) {
        // Only authentication failures warrant a login. Preserve gateway errors.
        if (error.kind !== 'auth' || !password || method === 'auth.login') throw error;
        if (await rpc('auth.login', [password]) !== true) throw new ServiceError('Deluge rejected the Web password.', 'auth');
        return rpc(method, params);
    }
}
