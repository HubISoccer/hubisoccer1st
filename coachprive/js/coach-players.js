// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
let players = [];
let searchTimeout = null;
let selectedPlayer = null;

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ===== LOADER =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseCoachPrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL COACH =====
async function loadCoachProfile() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentCoach = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DES JOUEURS =====
async function loadPlayers() {
    showLoader(true);
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_players')
            .select(`
                id,
                player_id,
                notes,
                created_at,
                updated_at,
                player:player_id (id, full_name, avatar_url, username)
            `)
            .eq('coach_id', currentCoach.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        players = data || [];
        renderPlayers();
    } catch (err) {
        console.error('Erreur chargement joueurs:', err);
        showToast('Erreur lors du chargement des joueurs', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES JOUEURS =====
function renderPlayers() {
    const container = document.getElementById('playersList');
    if (!container) return;

    if (players.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun joueur suivi pour le moment.</p>';
        return;
    }

    container.innerHTML = players.map(player => {
        const playerInfo = player.player || {};
        const fullName = playerInfo.full_name || 'Joueur inconnu';
        const avatar = playerInfo.avatar_url || 'img/user-default.jpg';
        const age = '?'; // À calculer si on a la date de naissance
        const position = 'Non renseigné'; // À récupérer depuis player_scouting
        const level = 'N/A'; // À récupérer

        const notesPreview = player.notes ? player.notes.substring(0, 80) : 'Aucune note';
        const hasNotes = player.notes && player.notes.length > 0;

        return `
            <div class="player-card" data-player-id="${player.id}">
                <div class="player-header">
                    <div class="player-avatar">
                        <img src="${avatar}" alt="${fullName}">
                    </div>
                    <div class="player-info">
                        <div class="player-name">${fullName}</div>
                        <div class="player-details">
                            <span><i class="fas fa-calendar-alt"></i> ${age} ans</span>
                            <span><i class="fas fa-futbol"></i> ${position}</span>
                            <span><i class="fas fa-chart-line"></i> ${level}</span>
                        </div>
                    </div>
                </div>
                <div class="player-notes">
                    <i class="fas fa-sticky-note"></i> ${notesPreview}${hasNotes ? '' : ' (Aucune note)'}
                </div>
                <div class="player-actions">
                    <button class="player-action-btn" onclick="viewPlayerProfile('${playerInfo.id}')">
                        <i class="fas fa-eye"></i> Profil
                    </button>
                    <button class="player-action-btn" onclick="openEditNotes('${player.id}', '${player.notes?.replace(/'/g, "\\'") || ''}')">
                        <i class="fas fa-edit"></i> Notes
                    </button>
                    <button class="player-action-btn delete" onclick="deletePlayer('${player.id}')">
                        <i class="fas fa-trash-alt"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RECHERCHE DE JOUEURS =====
function initSearch() {
    const searchInput = document.getElementById('searchPlayerInput');
    const resultsDiv = document.getElementById('searchResults');

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            resultsDiv.innerHTML = '';
            selectedPlayer = null;
            document.getElementById('confirmAddPlayer').disabled = true;
            return;
        }
        searchTimeout = setTimeout(async () => {
            // Rechercher dans profiles (rôle joueur) par nom ou username ou hub_id
            const { data, error } = await supabaseCoachPrive
                .from('profiles')
                .select('id, full_name, username, hub_id, avatar_url')
                .eq('role', 'joueur')
                .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,hub_id.ilike.%${query}%`)
                .limit(5);

            if (error) {
                console.error('Erreur recherche:', error);
                return;
            }

            if (data.length === 0) {
                resultsDiv.innerHTML = '<div class="search-result-item">Aucun joueur trouvé</div>';
                selectedPlayer = null;
                document.getElementById('confirmAddPlayer').disabled = true;
                return;
            }

            resultsDiv.innerHTML = data.map(player => `
                <div class="search-result-item" onclick="selectPlayer(${JSON.stringify(player).replace(/"/g, '&quot;')})">
                    <img src="${player.avatar_url || 'img/user-default.jpg'}" alt="${player.full_name}">
                    <div class="info">
                        <div class="name">${player.full_name}</div>
                        <div class="id">${player.hub_id || player.username || player.id}</div>
                    </div>
                </div>
            `).join('');
        }, 300);
    });
}

window.selectPlayer = function(player) {
    selectedPlayer = player;
    document.getElementById('searchPlayerInput').value = player.full_name;
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('confirmAddPlayer').disabled = false;
};

// ===== AJOUTER UN JOUEUR =====
async function addPlayer() {
    if (!selectedPlayer) {
        showToast('Veuillez sélectionner un joueur', 'warning');
        return;
    }

    // Vérifier si le joueur est déjà dans la liste
    const exists = players.some(p => p.player_id === selectedPlayer.id);
    if (exists) {
        showToast('Ce joueur est déjà dans votre liste', 'warning');
        return;
    }

    const notes = document.getElementById('playerNotes').value.trim();

    showLoader(true);
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_players')
            .insert([{
                coach_id: currentCoach.id,
                player_id: selectedPlayer.id,
                notes: notes || null
            }])
            .select()
            .single();

        if (error) throw error;

        showToast('Joueur ajouté avec succès', 'success');
        closeAddPlayerModal();
        await loadPlayers();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ajout', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== ÉDITER NOTES =====
function openEditNotes(playerId, currentNotes) {
    document.getElementById('editPlayerId').value = playerId;
    document.getElementById('editNotesText').value = currentNotes;
    document.getElementById('editNotesModal').style.display = 'block';
}

async function saveNotes() {
    const playerId = document.getElementById('editPlayerId').value;
    const notes = document.getElementById('editNotesText').value.trim();

    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_players')
            .update({ notes: notes || null, updated_at: new Date() })
            .eq('id', playerId);

        if (error) throw error;

        showToast('Notes mises à jour', 'success');
        closeEditNotesModal();
        await loadPlayers();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== SUPPRIMER JOUEUR =====
async function deletePlayer(playerId) {
    if (!confirm('Supprimer ce joueur de votre liste ?')) return;

    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_players')
            .delete()
            .eq('id', playerId);

        if (error) throw error;

        showToast('Joueur supprimé', 'success');
        await loadPlayers();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== PROFIL JOUEUR =====
function viewPlayerProfile(playerId) {
    // Pour l'instant, redirige vers scouting.html (à adapter selon votre structure)
    window.location.href = `scouting.html?id=${playerId}`;
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    // Swipe avec correction
    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartX < 50) {
                openSidebar();
            } else if (diffX < 0 && sidebar.classList.contains('active')) {
                closeSidebarFunc();
            }
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseCoachPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== MODALES =====
function openAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'block';
    document.getElementById('searchPlayerInput').value = '';
    document.getElementById('playerNotes').value = '';
    document.getElementById('searchResults').innerHTML = '';
    selectedPlayer = null;
    document.getElementById('confirmAddPlayer').disabled = true;
}

function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
}

function closeEditNotesModal() {
    document.getElementById('editNotesModal').style.display = 'none';
}

// Exposer les fonctions globales
window.openAddPlayerModal = openAddPlayerModal;
window.closeAddPlayerModal = closeAddPlayerModal;
window.addPlayer = addPlayer;
window.selectPlayer = selectPlayer;
window.openEditNotes = openEditNotes;
window.closeEditNotesModal = closeEditNotesModal;
window.saveNotes = saveNotes;
window.deletePlayer = deletePlayer;
window.viewPlayerProfile = viewPlayerProfile;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page players (coach)');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadPlayers();

    initSearch();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('openAddPlayerModal').addEventListener('click', openAddPlayerModal);
    document.getElementById('confirmAddPlayer').addEventListener('click', addPlayer);
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});
