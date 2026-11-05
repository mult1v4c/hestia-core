import { ServiceError } from '../baseApp.js';
import { escapeHtml } from '../../utils.js';
import { fetchJellyfin, getJellyfinImage } from "./jCore.js";

export function initJellyfin(el, config) {
    const { url, apiKey, userId } = config;
    const bodyEl = el.querySelector('.jellyfin-body');

    // 1. Setup DOM
    bodyEl.innerHTML = `
        <div class="jf-player" style="display:none;">
            <div class="jf-backdrop"></div>
            <div class="jf-overlay">
                <div class="jf-meta-top">
                    <span class="jf-user badge">User</span>
                    <span class="jf-state">Playing</span>
                </div>
                <div class="jf-info">
                    <div class="jf-title">Title</div>
                    <div class="jf-meta-row">
                        <span class="jf-year">2024</span>
                        <span class="jf-rating">PG-13</span>
                    </div>
                    <div class="jf-genre">Action</div>
                </div>
                <div class="jf-progress-track">
                    <div class="jf-progress-fill"></div>
                </div>
            </div>
        </div>

        <div class="jf-shelf" style="display:none;">
            <div class="jf-shelf-header">LATEST ADDED</div>
            <div class="jf-list" id="jf-list">
                <div style="text-align:center; padding:20px; opacity:0.5;">Loading...</div>
            </div>
        </div>
    `;

    // State for ID Resolution
    let resolvedUserId = (userId || '').trim();
    let isIdResolved = false;

    // 2. Return Update Function
    return async () => {
        // --- STEP 1: Check Sessions ---
        const sessions = await fetchJellyfin(url, '/Sessions', {}, apiKey);
        if (!Array.isArray(sessions)) throw new ServiceError('Invalid Jellyfin sessions response.');
        const activeSession = sessions.find(s => s.NowPlayingItem && s.NowPlayingItem.MediaType === 'Video');

        if (activeSession) {
            renderPlayer(el, url, activeSession);
        } else {
            if (!isIdResolved && resolvedUserId) {
                if (!/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(resolvedUserId)) {
                    const users = await fetchJellyfin(url, '/Users', {}, apiKey);
                    if (!Array.isArray(users)) throw new ServiceError('Invalid Jellyfin users response.');
                    const match = users.find(user => user.Name?.toLowerCase() === resolvedUserId.toLowerCase());
                    if (!match) throw new ServiceError('Jellyfin user not found. Check the User ID / Name setting.', 'setup');
                    resolvedUserId = match.Id;
                }
                isIdResolved = true;
            }
            await renderShelf(el, url, apiKey, resolvedUserId);
        }
    };
}

function renderPlayer(el, baseUrl, session) {
    const player = el.querySelector('.jf-player');
    const shelf = el.querySelector('.jf-shelf');
    const item = session.NowPlayingItem;

    player.style.display = 'flex';
    shelf.style.display = 'none';

    // 1. Backdrop
    const backdropUrl = getJellyfinImage(baseUrl, item.Id, "Backdrop");
    const backdropEl = el.querySelector('.jf-backdrop');
    if (backdropEl.dataset.current !== item.Id) {
        backdropEl.style.backgroundImage = `url('${backdropUrl}')`;
        backdropEl.dataset.current = item.Id;
    }

    // 2. Text Info
    el.querySelector('.jf-user').innerText = session.UserName;
    el.querySelector('.jf-title').innerText = item.Name;
    el.querySelector('.jf-year').innerText = item.ProductionYear || '';

    const rating = item.OfficialRating || '';
    const ratingEl = el.querySelector('.jf-rating');
    if (rating) {
        ratingEl.innerText = rating;
        ratingEl.style.display = 'inline-block';
    } else {
        ratingEl.style.display = 'none';
    }

    const genreText = (item.Genres || []).slice(0, 3).join(', ');
    el.querySelector('.jf-genre').innerText = genreText;

    // 3. Progress
    if (session.PlayState) {
        const pct = item.RunTimeTicks > 0 ? Math.max(0, Math.min(100, (Number(session.PlayState.PositionTicks) || 0) / item.RunTimeTicks * 100)) : 0;
        el.querySelector('.jf-progress-fill').style.width = `${pct}%`;
        el.querySelector('.jf-state').innerText = session.PlayState.IsPaused ? "PAUSED" : "PLAYING";
    }
}

async function renderShelf(el, baseUrl, apiKey, userId) {
    const player = el.querySelector('.jf-player');
    const shelf = el.querySelector('.jf-shelf');

    player.style.display = 'none';
    shelf.style.display = 'flex';

    // API keys can request a server-wide shelf when no user is configured.
    const response = await fetchJellyfin(baseUrl, userId ? '/Items/Latest' : '/Items', {
        ...(userId ? { UserId: userId } : { SortBy: 'DateCreated', SortOrder: 'Descending', Recursive: true }),
        Limit: 20, IncludeItemTypes: 'Movie', Fields: 'ProductionYear,OfficialRating,Genres'
    }, apiKey);

    let latest = [];
    if (Array.isArray(response)) latest = response;
    else if (Array.isArray(response?.Items)) latest = response.Items;
    else throw new ServiceError('Invalid Jellyfin library response.');

    const listEl = el.querySelector('#jf-list');
    listEl.innerHTML = '';

    latest.forEach(item => {
        const imgUrl = getJellyfinImage(baseUrl, item.Id, "Primary");
        // Optimization: Request smaller backdrop for list background (saves bandwidth)
        const backdropUrl = getJellyfinImage(baseUrl, item.Id, "Backdrop") + "&maxWidth=400";

        const year = item.ProductionYear || '';
        const rating = item.OfficialRating || '';
        const genres = (item.Genres || []).slice(0, 2).join(', ');

        const card = document.createElement('div');
        card.className = 'jf-list-item';
        // Set background image as CSS var for the pseudo-element to use
        card.style.setProperty('--bg-url', `url('${backdropUrl}')`);

        card.innerHTML = `
            <div class="jf-poster-thumb" style="background-image: url('${escapeHtml(imgUrl)}')"></div>
            <div class="jf-item-info">
                <div class="jf-item-title" title="${escapeHtml(item.Name)}">${escapeHtml(item.Name)}</div>
                <div class="jf-item-meta">
                    <span class="jf-item-year">${escapeHtml(year)}</span>
                    ${rating ? `<span class="jf-item-rating">${escapeHtml(rating)}</span>` : ''}
                </div>
                <div class="jf-item-genre">${escapeHtml(genres)}</div>
            </div>
        `;

        listEl.appendChild(card);
    });

    if (latest.length === 0) {
        listEl.innerHTML = '<div style="opacity:0.5; font-size:0.8rem; text-align:center;">No recent movies</div>';
    }
}