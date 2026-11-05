import { requestJson, ServiceError } from '../baseApp.js';
const sessions = new Map();

export async function fetchPihole(fullUrl, params = {}, token = '', baseUrl = '') {
    const url = new URL(fullUrl, window.location.origin);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const key = `${new URL(baseUrl || fullUrl, window.location.origin).href}|${token}`;
    const headers = { Accept: 'application/json' };
    if (sessions.has(key)) headers['X-FTL-SID'] = sessions.get(key);
    try { return await requestJson(url, { headers }); }
    catch (error) {
        if (error.status !== 401 || !token || !baseUrl) throw error;
        sessions.delete(key);
        const auth = await requestJson(new URL(`${baseUrl}/auth`, window.location.origin), {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: token })
        });
        if (!auth.session?.sid || auth.session.valid === false) throw new ServiceError('Pi-hole rejected the password.', 'auth');
        sessions.set(key, auth.session.sid);
        headers['X-FTL-SID'] = auth.session.sid;
        return requestJson(url, { headers });
    }
}

export function formatNumber(num) {
    if (num === undefined || num === null) return '--';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
}
