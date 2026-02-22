// ===== STATE =====
let token = localStorage.getItem('token') || null;
let username = localStorage.getItem('username') || null;
let currentPage = 1;
let currentLimit = 24;
let favorites = [];
let debounceTimer = null;
let showShiny = false;
let lastPokemonsResult = null; // Cache pour ne pas recharger quand on revient

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    loadPokemons();
});

// ===== API HELPER =====
async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api${endpoint}`, { ...options, headers });

    if (res.status === 204) return null;

    // Si le token est expiré/invalide, déconnecter automatiquement
    if (res.status === 401) {
        const data = await res.json();
        // Si on était connecté, c'est que le token a expiré
        if (token) {
            token = null;
            username = null;
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            favorites = [];
            updateAuthUI();
            showToast('Session expirée. Veuillez vous reconnecter.', 'info');
            refreshCurrentGrid();
        }
        throw new Error(data.error || 'Authentification requise');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
}

// ===== NAVIGATION =====
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

    if (page === 'pokedex') {
        resetPokedexFilters();
        loadPokemons();
    }
    if (page === 'favorites') loadFavorites();
    if (page === 'teams') loadTeams();
    if (page === 'stats') loadStats();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetPokedexFilters() {
    document.getElementById('search-name').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-sort').value = 'id';
    currentPage = 1;
    showShiny = false;
    const btn = document.getElementById('shiny-toggle');
    if (btn) {
        btn.classList.remove('active');
        btn.textContent = '✨ Shiny';
    }
}

// ===== AUTH =====
function updateAuthUI() {
    const authDiv = document.getElementById('nav-auth');
    if (token && username) {
        authDiv.innerHTML = `
            <div class="user-info">
                <span>👤 ${username}</span>
                <button class="btn btn-outline btn-small" onclick="logout()">Déconnexion</button>
            </div>
        `;
        document.getElementById('btn-create-team').style.display = 'inline-block';
        loadUserFavorites();
    } else {
        authDiv.innerHTML = `
            <button class="btn btn-outline" onclick="showModal('login')">Connexion</button>
            <button class="btn btn-primary" onclick="showModal('register')">Inscription</button>
        `;
        document.getElementById('btn-create-team').style.display = 'none';
        favorites = [];
    }
}

async function loadUserFavorites() {
    if (!token) return;
    try {
        const data = await api('/favorites');
        favorites = data.map(p => p.id);
    } catch {
        favorites = [];
    }
}

function showModal(type) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    if (type === 'login') {
        content.innerHTML = `
            <h2>Connexion</h2>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Nom d'utilisateur</label>
                    <input type="text" id="login-username" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label>Mot de passe</label>
                    <div class="password-field">
                        <input type="password" id="login-password" required autocomplete="current-password">
                        <button type="button" class="password-toggle" onclick="togglePasswordVisibility('login-password', this)" title="Afficher/masquer le mot de passe">👁️</button>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Se connecter</button>
                </div>
            </form>
        `;
    } else if (type === 'register') {
        content.innerHTML = `
            <h2>Inscription</h2>
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label>Nom d'utilisateur</label>
                    <input type="text" id="register-username" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label>Mot de passe</label>
                    <div class="password-field">
                        <input type="password" id="register-password" required autocomplete="new-password">
                        <button type="button" class="password-toggle" onclick="togglePasswordVisibility('register-password', this)" title="Afficher/masquer le mot de passe">👁️</button>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">S'inscrire</button>
                </div>
            </form>
        `;
    }

    overlay.classList.add('active');
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.title = 'Masquer le mot de passe';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
        btn.title = 'Afficher le mot de passe';
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

async function handleLogin(e) {
    e.preventDefault();
    try {
        const data = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: document.getElementById('login-username').value,
                password: document.getElementById('login-password').value
            })
        });
        token = data.token;
        username = document.getElementById('login-username').value;
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        updateAuthUI();
        closeModal();
        showToast('Connecté avec succès !', 'success');
        refreshCurrentGrid();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    try {
        await api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                username: document.getElementById('register-username').value,
                password: document.getElementById('register-password').value
            })
        });
        showToast('Inscription réussie ! Connectez-vous.', 'success');
        closeModal();
        showModal('login');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function logout() {
    token = null;
    username = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    favorites = [];
    updateAuthUI();
    showToast('Déconnecté.', 'info');
    refreshCurrentGrid();
}

// ===== SHINY TOGGLE =====
function toggleShiny() {
    showShiny = !showShiny;
    const btn = document.getElementById('shiny-toggle');
    if (btn) {
        btn.classList.toggle('active', showShiny);
        btn.textContent = showShiny ? '✨ Shiny ON' : '✨ Shiny';
    }
    if (lastPokemonsResult) {
        const grid = document.getElementById('pokemon-grid');
        renderPokemonGrid(lastPokemonsResult.data, grid);
    }
}

// ===== POKEMONS =====
async function loadPokemons() {
    const grid = document.getElementById('pokemon-grid');
    grid.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement...</div>';

    const name = document.getElementById('search-name').value;
    const type = document.getElementById('filter-type').value;
    const sort = document.getElementById('filter-sort').value;

    let url = `/pokemons?page=${currentPage}&limit=${currentLimit}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;

    try {
        const result = await api(url);
        lastPokemonsResult = result;
        renderPokemonGrid(result.data, grid);
        renderPagination(result);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><p>Erreur : ${err.message}</p></div>`;
    }
}

function refreshCurrentGrid() {
    if (lastPokemonsResult) {
        const grid = document.getElementById('pokemon-grid');
        renderPokemonGrid(lastPokemonsResult.data, grid);
    }
}

function getPokemonImage(p) {
    if (showShiny && p.shinyImage) return p.shinyImage;
    return p.image || `/assets/pokemons/${p.id}.png`;
}

function renderPokemonGrid(pokemons, container) {
    if (!pokemons || pokemons.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Aucun Pokémon trouvé.</p></div>';
        return;
    }

    container.innerHTML = pokemons.map(p => {
        const name = p.name?.french || p.name?.english || '???';
        const types = (p.type || []).map(t => `<span class="type-badge ${t}">${t}</span>`).join('');
        const imgSrc = getPokemonImage(p);
        const isFav = favorites.includes(p.id);
        const hasShiny = !!p.shinyImage;

        return `
            <div class="pokemon-card" onclick="showPokemonDetail(${p.id})">
                <span class="pokemon-id">#${String(p.id).padStart(3, '0')}</span>
                ${token ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${p.id})">${isFav ? '❤️' : '🤍'}</button>` : ''}
                ${hasShiny && showShiny ? '<span class="shiny-indicator">✨</span>' : ''}
                <img src="${imgSrc}" alt="${name}" loading="lazy" onerror="this.src='/assets/pokemons/${p.id}.png'">
                <div class="pokemon-name">${name}</div>
                <div class="pokemon-types">${types}</div>
            </div>
        `;
    }).join('');
}

function renderPagination(result) {
    const container = document.getElementById('pagination');
    if (!result || result.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button ${result.page <= 1 ? 'disabled' : ''} onclick="goToPage(${result.page - 1})">◀</button>`;

    for (let i = 1; i <= result.totalPages; i++) {
        if (i === result.page) {
            html += `<button class="active">${i}</button>`;
        } else if (Math.abs(i - result.page) <= 2 || i === 1 || i === result.totalPages) {
            html += `<button onclick="goToPage(${i})">${i}</button>`;
        } else if (Math.abs(i - result.page) === 3) {
            html += `<span class="page-info">…</span>`;
        }
    }

    html += `<button ${result.page >= result.totalPages ? 'disabled' : ''} onclick="goToPage(${result.page + 1})">▶</button>`;
    html += `<span class="page-info">${result.total} Pokémon</span>`;

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadPokemons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onFilterChange() {
    currentPage = 1;
    loadPokemons();
}

function debouncedSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        currentPage = 1;
        loadPokemons();
    }, 300);
}

// ===== POKEMON DETAIL =====
async function showPokemonDetail(id) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    overlay.classList.add('active');

    try {
        const p = await api(`/pokemons/${id}`);
        const name = p.name?.french || p.name?.english || '???';
        const normalImg = p.image || `/assets/pokemons/${p.id}.png`;
        const shinyImg = p.shinyImage || null;
        const types = (p.type || []).map(t => `<span class="type-badge ${t}">${t}</span>`).join('');

        const stats = [
            { label: 'HP', value: p.base?.HP, color: '#ff5252', icon: '❤️' },
            { label: 'Attack', value: p.base?.Attack, color: '#ff7043', icon: '⚔️' },
            { label: 'Defense', value: p.base?.Defense, color: '#42a5f5', icon: '🛡️' },
            { label: 'Sp. Atk', value: p.base?.SpecialAttack, color: '#ab47bc', icon: '🔮' },
            { label: 'Sp. Def', value: p.base?.SpecialDefense, color: '#66bb6a', icon: '🧿' },
            { label: 'Speed', value: p.base?.Speed, color: '#f7d02c', icon: '⚡' },
        ].filter(s => s.value != null);

        const statBars = stats.map(s => `
            <div class="stat-row">
                <span class="stat-label">${s.label}</span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${Math.min((s.value / 255) * 100, 100)}%; background: ${s.color}"></div>
                </div>
                <span class="stat-value">${s.value}</span>
            </div>
        `).join('');

        const isFav = favorites.includes(p.id);

        let teamsHtml = '';
        if (token) {
            try {
                const teams = await api('/teams');
                allTeamsCache = teams;
                if (teams.length > 0) {
                    teamsHtml = `
                        <div class="detail-teams-section">
                            <h4>👥 Ajouter à une équipe</h4>
                            <div class="detail-team-list">
                                ${teams.map(team => {
                                    const count = team.pokemons?.length || 0;
                                    const isFull = count >= 6;
                                    const alreadyIn = team.pokemons?.some(tp => tp.id === p.id);

                                    const pokemonSlots = [];
                                    for (let i = 0; i < 6; i++) {
                                        if (team.pokemons && team.pokemons[i]) {
                                            const tp = team.pokemons[i];
                                            pokemonSlots.push(`<img src="${tp.image || `/assets/pokemons/${tp.id}.png`}" alt="${tp.name?.french || '?'}" class="detail-team-mini-img" onerror="this.src='/assets/pokemons/${tp.id}.png'">`);
                                        } else {
                                            pokemonSlots.push(`<span class="detail-team-empty-slot"></span>`);
                                        }
                                    }

                                    return `
                                        <div class="detail-team-row ${isFull || alreadyIn ? 'disabled' : ''}"
                                             ${!isFull && !alreadyIn ? `onclick="addPokemonToTeamFromDetail('${team._id}', '${p._id}', ${p.id})"` : ''}>
                                            <div class="detail-team-info">
                                                <strong>${team.name}</strong>
                                                <span class="detail-team-count">${count}/6</span>
                                            </div>
                                            <div class="detail-team-slots">${pokemonSlots.join('')}</div>
                                            ${alreadyIn ? '<span class="detail-team-status check">✓ Déjà</span>' : ''}
                                            ${isFull && !alreadyIn ? '<span class="detail-team-status full">Pleine</span>' : ''}
                                            ${!isFull && !alreadyIn ? '<span class="detail-team-status add">+ Ajouter</span>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    teamsHtml = `
                        <div class="detail-teams-section">
                            <h4>👥 Équipes</h4>
                            <p class="detail-no-team">Aucune équipe. <a href="#" onclick="event.preventDefault(); closeDetail(); navigateTo('teams'); showCreateTeamModal();">Créer une équipe</a></p>
                        </div>
                    `;
                }
            } catch { /* ignore */ }
        }

        content.innerHTML = `
            <div class="detail-header">
                <div class="detail-images">
                    <img id="detail-img" src="${normalImg}" alt="${name}" onerror="this.src='/assets/pokemons/${p.id}.png'">
                    ${shinyImg ? `
                        <div class="detail-img-toggle">
                            <button class="btn btn-small btn-outline" onclick="toggleDetailImage('${normalImg}', '${shinyImg}')">
                                ✨ Normal / Shiny
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="detail-info">
                    <h2>${name}</h2>
                    <div class="detail-id">#${String(p.id).padStart(3, '0')}</div>
                    <div class="detail-types">${types}</div>
                    ${token ? `
                        <button class="btn btn-small ${isFav ? 'btn-danger' : 'btn-success'}" onclick="toggleFavorite(${p.id}); closeDetail();">
                            ${isFav ? '💔 Retirer des favoris' : '❤️ Ajouter aux favoris'}
                        </button>
                    ` : ''}
                </div>
            </div>
            ${stats.length > 0 ? `<div class="stat-bars">${statBars}</div>` : '<p style="color:var(--text-muted)">Aucune statistique disponible.</p>'}
            ${teamsHtml}
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><p>Erreur : ${err.message}</p></div>`;
    }
}

let detailShowingShiny = false;
function toggleDetailImage(normalSrc, shinySrc) {
    const img = document.getElementById('detail-img');
    detailShowingShiny = !detailShowingShiny;
    img.src = detailShowingShiny ? shinySrc : normalSrc;
}

function closeDetail() {
    document.getElementById('detail-overlay').classList.remove('active');
    detailShowingShiny = false;
}

// ===== FAVORITES =====
async function toggleFavorite(pokemonId) {
    if (!token) {
        showToast('Connectez-vous pour ajouter des favoris !', 'error');
        return;
    }

    try {
        if (favorites.includes(pokemonId)) {
            await api(`/favorites/${pokemonId}`, { method: 'DELETE' });
            favorites = favorites.filter(id => id !== pokemonId);
            showToast('Retiré des favoris', 'info');
        } else {
            await api(`/favorites/${pokemonId}`, { method: 'POST' });
            favorites.push(pokemonId);
            showToast('Ajouté aux favoris !', 'success');
        }

        const activePage = document.querySelector('.page.active').id;
        if (activePage === 'page-pokedex') refreshCurrentGrid();
        if (activePage === 'page-favorites') loadFavorites();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadFavorites() {
    const grid = document.getElementById('favorites-grid');
    const empty = document.getElementById('favorites-empty');

    if (!token) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.querySelector('p').textContent = 'Connectez-vous pour voir vos favoris.';
        return;
    }

    grid.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement...</div>';
    empty.style.display = 'none';

    try {
        const data = await api('/favorites');
        if (data.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            empty.querySelector('p').textContent = "Vous n'avez aucun favori. Cliquez sur 🤍 pour en ajouter !";
        } else {
            renderPokemonGrid(data, grid);
        }
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

// ===== TEAMS =====
let allTeamsCache = [];

async function loadTeams() {
    const list = document.getElementById('teams-list');
    const empty = document.getElementById('teams-empty');

    if (!token) {
        list.innerHTML = '';
        empty.style.display = 'block';
        empty.querySelector('p').textContent = 'Connectez-vous pour gérer vos équipes.';
        return;
    }

    list.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement...</div>';
    empty.style.display = 'none';

    try {
        const teams = await api('/teams');
        allTeamsCache = teams;

        if (teams.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            empty.querySelector('p').textContent = "Vous n'avez aucune équipe. Créez-en une !";
        } else {
            list.innerHTML = teams.map(team => {
                const pokemonsList = team.pokemons || [];
                const slots = [];
                for (let i = 0; i < 6; i++) {
                    if (pokemonsList[i]) {
                        const p = pokemonsList[i];
                        const imgSrc = p.image || `/assets/pokemons/${p.id}.png`;
                        const pokeName = p.name?.french || p.name?.english || '?';
                        const types = (p.type || []).map(t => `<span class="type-badge ${t}">${t}</span>`).join('');
                        slots.push(`
                            <div class="team-slot filled" onclick="event.stopPropagation(); showPokemonDetail(${p.id})">
                                <button class="slot-remove" onclick="event.stopPropagation(); removePokemonFromTeam('${team._id}', ${i})" title="Retirer">✕</button>
                                <img src="${imgSrc}" alt="${pokeName}" onerror="this.src='/assets/pokemons/${p.id || 1}.png'">
                                <span class="slot-name">${pokeName}</span>
                                <div class="slot-types">${types}</div>
                            </div>
                        `);
                    } else {
                        slots.push(`
                            <div class="team-slot empty" onclick="event.stopPropagation(); showAddPokemonToTeamModal('${team._id}')" title="Ajouter un Pokémon">
                                <div class="slot-add-icon">+</div>
                                <span class="slot-name">Vide</span>
                            </div>
                        `);
                    }
                }

                return `
                    <div class="team-card">
                        <div class="team-card-header">
                            <div class="team-card-title">
                                <h3>${team.name}</h3>
                                <span class="team-card-count">${pokemonsList.length}/6 Pokémon</span>
                            </div>
                            <div class="team-card-actions">
                                <button class="btn btn-outline btn-small" onclick="showEditTeamModal('${team._id}', '${team.name.replace(/'/g, "\\'")}')">✏️ Renommer</button>
                                <button class="btn btn-danger btn-small" onclick="deleteTeam('${team._id}')">🗑️</button>
                            </div>
                        </div>
                        <div class="team-slots-grid">${slots.join('')}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        list.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

function showCreateTeamModal() {
    if (!token) {
        showToast('Connectez-vous d\'abord !', 'error');
        return;
    }

    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <h2>Nouvelle équipe</h2>
        <form onsubmit="handleCreateTeam(event)">
            <div class="form-group">
                <label>Nom de l'équipe</label>
                <input type="text" id="team-name" required placeholder="Mon équipe de rêve">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Créer</button>
            </div>
        </form>
    `;

    overlay.classList.add('active');
}

async function handleCreateTeam(e) {
    e.preventDefault();
    const name = document.getElementById('team-name').value;

    try {
        await api('/teams', {
            method: 'POST',
            body: JSON.stringify({ name, pokemons: [] })
        });
        showToast('Équipe créée !', 'success');
        closeModal();
        loadTeams();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function showEditTeamModal(teamId, teamName) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <h2>Renommer l'équipe</h2>
        <form onsubmit="handleEditTeam(event, '${teamId}')">
            <div class="form-group">
                <label>Nom de l'équipe</label>
                <input type="text" id="edit-team-name" required value="${teamName}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Modifier</button>
            </div>
        </form>
    `;

    overlay.classList.add('active');
}

async function handleEditTeam(e, teamId) {
    e.preventDefault();
    const name = document.getElementById('edit-team-name').value;

    try {
        const team = allTeamsCache.find(t => t._id === teamId);
        const pokemonIds = team ? team.pokemons.map(p => p._id) : [];

        await api(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, pokemons: pokemonIds })
        });
        showToast('Équipe renommée !', 'success');
        closeModal();
        loadTeams();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteTeam(teamId) {
    if (!confirm('Supprimer cette équipe ?')) return;

    try {
        await api(`/teams/${teamId}`, { method: 'DELETE' });
        showToast('Équipe supprimée.', 'info');
        loadTeams();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function showAddPokemonToTeamModal(teamId) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    content.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement...</div>';
    overlay.classList.add('active');

    try {
        const result = await api('/pokemons?limit=151&sort=id');
        const pokemons = result.data;

        const team = allTeamsCache.find(t => t._id === teamId);
        const currentIds = team ? team.pokemons.map(p => p.id) : [];

        content.innerHTML = `
            <h2>Ajouter un Pokémon</h2>
            <div class="form-group">
                <input type="text" id="team-pokemon-search" placeholder="Chercher un Pokémon..." oninput="filterTeamPokemonList()">
            </div>
            <div class="pokemon-picker" id="pokemon-picker">
                ${pokemons.map(p => {
                    const name = p.name?.french || p.name?.english || '???';
                    const imgSrc = p.image || `/assets/pokemons/${p.id}.png`;
                    const alreadyIn = currentIds.includes(p.id);
                    return `
                        <div class="picker-item ${alreadyIn ? 'disabled' : ''}"
                             data-name="${name.toLowerCase()}"
                             ${!alreadyIn ? `onclick="addPokemonToTeam('${teamId}', '${p._id}')"` : ''}>
                            <img src="${imgSrc}" alt="${name}" onerror="this.style.display='none'">
                            <span>${name}</span>
                            ${alreadyIn ? '<small>✓</small>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

async function addPokemonToTeamFromDetail(teamId, pokemonMongoId, pokemonId) {
    try {
        const team = allTeamsCache.find(t => t._id === teamId);
        if (!team) throw new Error('Équipe non trouvée');

        if (team.pokemons.length >= 6) {
            showToast('Équipe pleine (6/6) !', 'error');
            return;
        }

        const currentPokemonIds = team.pokemons.map(p => p._id);
        currentPokemonIds.push(pokemonMongoId);

        await api(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: team.name, pokemons: currentPokemonIds })
        });

        showToast('Pokémon ajouté à l\'équipe !', 'success');
        showPokemonDetail(pokemonId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function addPokemonToTeam(teamId, pokemonMongoId) {
    try {
        const team = allTeamsCache.find(t => t._id === teamId);
        if (!team) throw new Error('Équipe non trouvée');

        if (team.pokemons.length >= 6) {
            showToast('Équipe pleine (6/6) !', 'error');
            return;
        }

        const currentPokemonIds = team.pokemons.map(p => p._id);
        currentPokemonIds.push(pokemonMongoId);

        await api(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: team.name, pokemons: currentPokemonIds })
        });

        showToast('Pokémon ajouté à l\'équipe !', 'success');
        closeModal();
        loadTeams();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removePokemonFromTeam(teamId, index) {
    try {
        const team = allTeamsCache.find(t => t._id === teamId);
        if (!team) throw new Error('Équipe non trouvée');

        const pokemonIds = team.pokemons.map(p => p._id);
        const removedName = team.pokemons[index]?.name?.french || 'Pokémon';
        pokemonIds.splice(index, 1);

        await api(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: team.name, pokemons: pokemonIds })
        });

        showToast(`${removedName} retiré de l'équipe`, 'info');
        loadTeams();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function filterTeamPokemonList() {
    const search = document.getElementById('team-pokemon-search').value.toLowerCase();
    document.querySelectorAll('.picker-item').forEach(item => {
        const name = item.getAttribute('data-name');
        item.style.display = name.includes(search) ? '' : 'none';
    });
}

// ===== STATS =====
async function loadStats() {
    const container = document.getElementById('stats-content');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement des statistiques...</div>';

    try {
        const stats = await api('/stats');

        let html = '';

        // Hero
        html += `
        <div class="stats-hero">
            <div class="stats-hero-pokeball">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="pokeball">
            </div>
            <div class="stats-hero-number" id="stats-counter" data-target="${stats.totalPokemons}">0</div>
            <div class="stats-hero-label">Pokémon dans le Pokédex</div>
        </div>`;

        // Records
        const records = [
            { data: stats.highestAttack, icon: '⚔️', label: 'Attaque', stat: 'Attack', unit: 'ATK', color: '#ff7043' },
            { data: stats.highestHP, icon: '💚', label: 'Points de vie', stat: 'HP', unit: 'HP', color: '#66bb6a' },
            { data: stats.fastestPokemon, icon: '⚡', label: 'Vitesse', stat: 'Speed', unit: 'SPD', color: '#f7d02c' },
            { data: stats.highestDefense, icon: '🛡️', label: 'Défense', stat: 'Defense', unit: 'DEF', color: '#42a5f5' },
        ];

        html += `<h2 class="stats-section-title">🏆 Les Champions</h2>`;
        html += `<p class="stats-section-desc">Les Pokémon qui dominent dans chaque catégorie</p>`;
        html += `<div class="stats-records">`;
        records.forEach(r => {
            if (r.data) {
                const p = r.data;
                const name = p.name?.french || p.name?.english || '???';
                const types = (p.type || []).map(t => `<span class="type-badge ${t}">${t}</span>`).join('');
                html += `
                    <div class="record-card" onclick="showPokemonDetail(${p.id})" style="cursor:pointer">
                        <div class="record-accent" style="background: ${r.color}"></div>
                        <div class="record-body">
                            <div class="record-left">
                                <img src="/assets/pokemons/${p.id}.png" alt="${name}" onerror="this.style.display='none'">
                            </div>
                            <div class="record-right">
                                <div class="record-category">${r.icon} Meilleur(e) ${r.label}</div>
                                <div class="record-pokemon-name">${name}</div>
                                <div class="record-types">${types}</div>
                                <div class="record-stat" style="color: ${r.color}">${p.base?.[r.stat] || '?'} ${r.unit}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        html += `</div>`;

        // Type distribution
        html += `<h2 class="stats-section-title">📊 Répartition des types</h2>`;
        html += `<p class="stats-section-desc">Nombre de Pokémon et HP moyens pour chaque type</p>`;
        html += `<div class="stats-two-cols">`;

        html += `<div class="stats-card"><h3>Pokémon par type</h3><div class="type-chart">`;
        if (stats.countByType) {
            const maxCount = stats.countByType[0]?.count || 1;
            stats.countByType.forEach(item => {
                const pct = Math.round((item.count / maxCount) * 100);
                html += `
                    <div class="type-chart-row">
                        <span class="type-badge ${item._id}">${item._id}</span>
                        <div class="type-chart-bar-bg">
                            <div class="type-chart-bar" style="width: ${pct}%;" data-type="${item._id.toLowerCase()}"></div>
                        </div>
                        <span class="type-chart-value">${item.count}</span>
                    </div>`;
            });
        }
        html += `</div></div>`;

        html += `<div class="stats-card"><h3>💚 HP moyen par type</h3><div class="type-chart">`;
        if (stats.avgHPByType) {
            const maxHP = stats.avgHPByType[0]?.avgHP || 1;
            stats.avgHPByType.forEach(item => {
                if (item.avgHP != null) {
                    const pct = Math.round((item.avgHP / maxHP) * 100);
                    html += `
                        <div class="type-chart-row">
                            <span class="type-badge ${item._id}">${item._id}</span>
                            <div class="type-chart-bar-bg">
                                <div class="type-chart-bar" style="width: ${pct}%;" data-type="${item._id.toLowerCase()}"></div>
                            </div>
                            <span class="type-chart-value">${Math.round(item.avgHP)}</span>
                        </div>`;
                }
            });
        }
        html += `</div></div>`;
        html += `</div>`;

        // Global averages
        if (stats.globalAvg) {
            html += `<h2 class="stats-section-title">📈 Moyennes globales</h2>`;
            html += `<p class="stats-section-desc">Les statistiques moyennes de tous les Pokémon</p>`;
            html += `<div class="stats-averages">`;
            const avgStats = [
                { label: 'HP', value: stats.globalAvg.avgHP, color: '#ff5252', icon: '❤️', max: 255 },
                { label: 'Attaque', value: stats.globalAvg.avgAttack, color: '#ff7043', icon: '⚔️', max: 255 },
                { label: 'Défense', value: stats.globalAvg.avgDefense, color: '#42a5f5', icon: '🛡️', max: 255 },
                { label: 'Vitesse', value: stats.globalAvg.avgSpeed, color: '#f7d02c', icon: '⚡', max: 255 },
            ];
            avgStats.forEach(s => {
                if (s.value != null) {
                    const pct = Math.round((s.value / s.max) * 100);
                    html += `
                        <div class="avg-card">
                            <div class="avg-icon">${s.icon}</div>
                            <div class="avg-value" style="color: ${s.color}">${Math.round(s.value)}</div>
                            <div class="avg-label">${s.label}</div>
                            <div class="avg-bar-bg">
                                <div class="avg-bar" style="width: ${pct}%; background: ${s.color}"></div>
                            </div>
                        </div>
                    `;
                }
            });
            html += `</div>`;
        }

        container.innerHTML = html;

        animateCounter('stats-counter');

        document.querySelectorAll('.type-chart-bar[data-type]').forEach(bar => {
            const type = bar.getAttribute('data-type');
            const colors = {
                normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
                grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
                ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
                rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
                steel: '#B7B7CE', fairy: '#D685AD'
            };
            bar.style.background = colors[type] || '#888';
        });

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Erreur : ${err.message}</p></div>`;
    }
}

function animateCounter(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const target = parseInt(el.getAttribute('data-target')) || 0;
    const duration = 1200;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}