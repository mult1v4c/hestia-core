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
    let resolvedUserId = userId;
    let isIdResolved = false;

    // 2. Return Update Function
    return async () => {
        // --- STEP 0: Auto-Resolve Username ---
        if (!isIdResolved && resolvedUserId) {
            try {
                if (resolvedUserId.length === 32) {
                    isIdResolved = true;
                } else {
                    const users = await fetchJellyfin(url, '/Users', {}, apiKey);
                    const match = users.find(u =>
                        u.Name.toLowerCase() === resolvedUserId.toLowerCase() ||
                        u.Id === resolvedUserId
                    );
                    if (match) {
                        resolvedUserId = match.Id;
                        isIdResolved = true;
                    }
                }
            } catch (e) {
                console.error("[Jellyfin] User lookup failed:", e);
            }
        }

        // --- STEP 1: Check Sessions ---
        const sessions = await fetchJellyfin(url, '/Sessions', {}, apiKey);
        const activeSession = sessions.find(s => s.NowPlayingItem && s.NowPlayingItem.MediaType === 'Video');

        if (activeSession) {
            renderPlayer(el, url, activeSession);
        } else {
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
        const pct = (session.PlayState.PositionTicks / item.RunTimeTicks) * 100;
        el.querySelector('.jf-progress-fill').style.width = `${pct}%`;
        el.querySelector('.jf-state').innerText = session.PlayState.IsPaused ? "PAUSED" : "PLAYING";
    }
}

async function renderShelf(el, baseUrl, apiKey, userId) {
    const player = el.querySelector('.jf-player');
    const shelf = el.querySelector('.jf-shelf');

    player.style.display = 'none';
    shelf.style.display = 'flex';

    if (!userId) {
        el.querySelector('#jf-list').innerHTML = '<div style="opacity:0.5; font-size:0.8rem; text-align:center; padding-top:20px;">User not found</div>';
        return;
    }

    // Fetch Latest Movies
    const response = await fetchJellyfin(baseUrl, `/Users/${userId}/Items/Latest`, {
        Limit: 20,
        IncludeItemTypes: "Movie",
        Fields: "ProductionYear,OfficialRating,Genres"
    }, apiKey);

    let latest = [];
    if (Array.isArray(response)) latest = response;
    else if (response && response.Items) latest = response.Items;

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
            <div class="jf-poster-thumb" style="background-image: url('${imgUrl}')"></div>
            <div class="jf-item-info">
                <div class="jf-item-title" title="${item.Name}">${item.Name}</div>
                <div class="jf-item-meta">
                    <span class="jf-item-year">${year}</span>
                    ${rating ? `<span class="jf-item-rating">${rating}</span>` : ''}
                </div>
                <div class="jf-item-genre">${genres}</div>
            </div>
        `;

        listEl.appendChild(card);
    });

    if (latest.length === 0) {
        listEl.innerHTML = '<div style="opacity:0.5; font-size:0.8rem; text-align:center;">No recent movies</div>';
    }
}