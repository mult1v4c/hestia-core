import { requestJson } from '../baseApp.js';

export async function fetchJellyfin(baseUrl, endpoint, params = {}, apiKey = '') {
    const base = baseUrl.trim().replace(/\/+$/, '');
    const url = new URL(base + endpoint, window.location.origin);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const headers = { Accept: 'application/json' };
    if (apiKey) headers.Authorization = `MediaBrowser Token="${apiKey.trim().replace(/["\\\r\n]/g, '')}"`;
    return requestJson(url, { headers });
}

export function getJellyfinImage(baseUrl, itemId, type = 'Backdrop') {
    const base = baseUrl.trim().replace(/\/+$/, '');
    return `${base}/Items/${encodeURIComponent(itemId)}/Images/${type}/0?quality=90`;
}
