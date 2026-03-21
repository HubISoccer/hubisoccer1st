// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentPlayer = null;
let tournaments = [];
let currentTournament = null;
let messages = [];
let starredPlayers = new Set();
let messagesSubscription = null;
const profileCache = new Map();

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL JOUEUR (depuis profiles) =====
async function loadPlayerProfile() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil joueur:', error);
            return null;
        }
        currentPlayer = data;
        document.getElementById('userName').textContent = data.full_name || 'Joueur';
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentPlayer;
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES TOURNOIS =====
async function loadTournaments() {
    const { data, error } = await supabasePlayersSpacePrive
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('Erreur chargement tournois:', error);
        showToast('Erreur lors du chargement des tournois', 'error');
        return;
    }

    tournaments = data || [];
    if (tournaments.length === 0) {
        showToast('Aucun tournoi disponible', 'info');
        return;
    }

    currentTournament = tournaments[0];
    await loadTournamentDetails(currentTournament.id);
    await loadStarredPlayers(currentTournament.id);
    renderTournamentList();
    renderLiveTournament();
}

// ===== CHARGEMENT DES DÉTAILS D'UN TOURNOI (joueurs) =====
async function loadTournamentDetails(tournamentId) {
    try {
        const { data: playersData, error } = await supabasePlayersSpacePrive
            .from('tournament_players')
            .select(`
                id,
                position,
                jersey_number,
                player_id,
                profiles:player_id (full_name, avatar_url)
            `)
            .eq('tournament_id', tournamentId);

        if (error) throw error;

        currentTournament = {
            ...currentTournament,
            players: (playersData || []).map(p => ({
                id: p.id,
                playerId: p.player_id,
                name: p.profiles?.full_name || 'Joueur inconnu',
                avatar: p.profiles?.avatar_url,
                position: p.position,
                jersey_number: p.jersey_number
            }))
        };
    } catch (error) {
        console.error('Erreur chargement joueurs:', error);
        showToast('Erreur lors du chargement des joueurs', 'error');
    }
}

// ===== CHARGEMENT DES ÉTOILES (favoris) =====
async function loadStarredPlayers(tournamentId) {
    const { data, error } = await supabasePlayersSpacePrive
        .from('player_stars')
        .select('player_id')
        .eq('user_id', currentPlayer.id)
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error('Erreur chargement étoiles:', error);
        return;
    }

    starredPlayers = new Set(data.map(s => s.player_id));
}

// ===== RENDU DE LA LISTE DES TOURNOIS (modale) =====
function renderTournamentList() {
    const list = document.getElementById('tournamentList');
    if (!list) return;

    if (tournaments.length === 0) {
        list.innerHTML = '<p class="no-data">Aucun tournoi disponible</p>';
        return;
    }

    list.innerHTML = tournaments.map(t => `
        <div class="tournament-item" data-tournament-id="${t.id}">
            <span class="tournament-item-name">${t.name}</span>
            <span class="tournament-item-date">${new Date(t.date).toLocaleDateString('fr-FR')}</span>
        </div>
    `).join('');

    document.querySelectorAll('.tournament-item').forEach(item => {
        item.addEventListener('click', () => {
            const tournamentId = parseInt(item.dataset.tournamentId);
            selectTournament(tournamentId);
        });
    });
}

// ===== RENDU DU TOURNOI EN DIRECT =====
function renderLiveTournament() {
    if (!currentTournament) return;

    const container = document.getElementById('liveTournament');

    let videoHtml = '';
    if (currentTournament.stream_url) {
        videoHtml = `<iframe src="${currentTournament.stream_url}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        videoHtml = '<div class="no-stream">Aucun stream disponible pour le moment</div>';
    }

    container.innerHTML = `
        <div class="tournament-video">
            ${videoHtml}
        </div>
        <div class="tournament-info">
            <h2 class="tournament-name">${currentTournament.name}</h2>
            <span class="tournament-date">${new Date(currentTournament.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="tournament-actions">
            <button class="btn-players" onclick="openPlayersModal()"><i class="fas fa-users"></i> Voir les joueurs</button>
        </div>
        <div class="chat-section">
            <h3>Chat en direct</h3>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-area">
                <input type="text" id="chatInput" placeholder="Votre message..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                <button id="refreshChatBtn" class="btn-refresh" style="margin-left: 5px;"><i class="fas fa-sync-alt"></i> Rafraîchir</button>
            </div>
        </div>
    `;

    renderChatMessages();
}

// ===== CHARGEMENT DES MESSAGES DU CHAT =====
async function loadMessages(tournamentId) {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('tournament_messages')
            .select(`
                id,
                user_id,
                message,
                created_at,
                profiles:user_id (full_name)
            `)
            .eq('tournament_id', tournamentId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        messages = (data || []).map(m => ({
            id: m.id,
            userId: m.user_id,
            author: m.profiles?.full_name || 'Inconnu',
            text: m.message,
            time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }));

        renderChatMessages();
    } catch (error) {
        console.error('Erreur chargement messages:', error);
        showToast('Erreur lors du chargement des messages', 'error');
    }
}

// ===== RAFRAÎCHISSEMENT MANUEL DES MESSAGES =====
async function refreshMessages() {
    if (!currentTournament) return;
    const refreshBtn = document.getElementById('refreshChatBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        const originalIcon = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rafraîchir';
        await loadMessages(currentTournament.id);
        refreshBtn.innerHTML = originalIcon;
        refreshBtn.disabled = false;
    } else {
        await loadMessages(currentTournament.id);
    }
}

// ===== RENDU DES MESSAGES DU CHAT =====
function renderChatMessages() {
    const chatDiv = document.getElementById('chatMessages');
    if (!chatDiv) return;

    chatDiv.innerHTML = messages.map(msg => {
        const isOwn = msg.userId === currentPlayer.id;
        return `
            <div class="chat-message ${isOwn ? 'own' : ''}">
                <div class="author">${msg.author}</div>
                <div class="text">${msg.text}</div>
                <div class="time">${msg.time}</div>
            </div>
        `;
    }).join('');

    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ===== ENVOI D'UN MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !currentTournament) return;

    input.disabled = true;
    const sendBtn = document.querySelector('.chat-input-area button:first-of-type');
    const originalHtml = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    sendBtn.disabled = true;

    try {
        const { error } = await supabasePlayersSpacePrive
            .from('tournament_messages')
            .insert([{
                tournament_id: currentTournament.id,
                user_id: currentPlayer.id,
                message: text
            }]);

        if (error) {
            console.error('Erreur envoi message:', error);
            showToast('Erreur lors de l\'envoi du message', 'error');
            return;
        }

        input.value = '';
    } catch (err) {
        console.error('Erreur inattendue:', err);
        showToast('Erreur lors de l\'envoi du message', 'error');
    } finally {
        input.disabled = false;
        sendBtn.innerHTML = originalHtml;
        sendBtn.disabled = false;
        input.focus();
    }
}

// ===== SOUSCRIPTION AUX NOUVEAUX MESSAGES =====
function subscribeToMessages(tournamentId) {
    if (messagesSubscription) messagesSubscription.unsubscribe();

    messagesSubscription = supabasePlayersSpacePrive
        .channel(`tournament_messages:${tournamentId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'tournament_messages',
            filter: `tournament_id=eq.${tournamentId}`
        }, async (payload) => {
            let authorName = profileCache.get(payload.new.user_id);
            if (!authorName) {
                const { data } = await supabasePlayersSpacePrive
                    .from('profiles')
                    .select('full_name')
                    .eq('id', payload.new.user_id)
                    .single();
                authorName = data?.full_name || 'Inconnu';
                profileCache.set(payload.new.user_id, authorName);
            }

            const newMsg = {
                id: payload.new.id,
                userId: payload.new.user_id,
                author: authorName,
                text: payload.new.message,
                time: new Date(payload.new.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            };
            messages.push(newMsg);
            renderChatMessages();
        })
        .subscribe();
}

// ===== SÉLECTION D'UN TOURNOI =====
async function selectTournament(tournamentId) {
    const container = document.getElementById('liveTournament');
    if (container) container.innerHTML = '<div class="spinner" style="margin:50px auto;"></div>';

    currentTournament = tournaments.find(t => t.id === tournamentId);
    await loadTournamentDetails(tournamentId);
    await loadStarredPlayers(tournamentId);
    await loadMessages(tournamentId);
    subscribeToMessages(tournamentId);
    renderLiveTournament();
    closeTournamentModal();
}

// ===== MODALES =====
function openTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'block';
}
function closeTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'none';
}
function openPlayersModal() {
    renderPlayersList();
    document.getElementById('playersModal').style.display = 'block';
}
function closePlayersModal() {
    document.getElementById('playersModal').style.display = 'none';
}

// ===== RENDU DE LA LISTE DES JOUEURS =====
function renderPlayersList() {
    const list = document.getElementById('playersList');
    if (!list || !currentTournament?.players) return;

    list.innerHTML = currentTournament.players.map(p => {
        const isStarred = starredPlayers.has(p.id);
        return `
            <div class="player-item">
                <div class="player-avatar">
                    <img src="${p.avatar || 'img/user-default.jpg'}" alt="${p.name}">
                </div>
                <div class="player-info">
                    <div class="player-name">${p.name}</div>
                    <div class="player-position">${p.position || 'Poste inconnu'}</div>
                </div>
                <div class="player-star ${isStarred ? 'active' : ''}" onclick="toggleStar(${p.id})">
                    <i class="fas fa-star"></i>
                </div>
            </div>
        `;
    }).join('');
}

// ===== AJOUT/SUPPRESSION D'UNE ÉTOILE =====
async function toggleStar(playerTournamentId) {
    if (starredPlayers.has(playerTournamentId)) {
        const { error } = await supabasePlayersSpacePrive
            .from('player_stars')
            .delete()
            .eq('user_id', currentPlayer.id)
            .eq('tournament_id', currentTournament.id)
            .eq('player_id', playerTournamentId);
        if (error) {
            showToast('Erreur lors de la suppression de l\'étoile', 'error');
            console.error(error);
            return;
        }
        starredPlayers.delete(playerTournamentId);
    } else {
        const { error } = await supabasePlayersSpacePrive
            .from('player_stars')
            .insert([{
                user_id: currentPlayer.id,
                tournament_id: currentTournament.id,
                player_id: playerTournamentId
            }]);
        if (error) {
            showToast('Erreur lors de l\'ajout de l\'étoile', 'error');
            console.error(error);
            return;
        }
        starredPlayers.add(playerTournamentId);
    }
    renderPlayersList();
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar?.classList.add('active');
        overlay?.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
    }

    menuBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebarFunc);
    overlay?.addEventListener('click', closeSidebarFunc);
}

// ===== GESTION DES SWIPES =====
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
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
        if (e.cancelable) e.preventDefault();
        const leftSidebar = document.getElementById('leftSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (diffX > 0 && touchStartX < 50) {
            leftSidebar?.classList.add('active');
            overlay?.classList.add('active');
        } else if (diffX < 0 && leftSidebar?.classList.contains('active')) {
            leftSidebar?.classList.remove('active');
            overlay?.classList.remove('active');
        }
    }
}, { passive: false });

// ===== DÉCONNEXION =====
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabasePlayersSpacePrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page tournois (joueur)');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    if (!currentPlayer) return;

    await loadTournaments();

    if (currentTournament) {
        await loadMessages(currentTournament.id);
        subscribeToMessages(currentTournament.id);
    }

    document.getElementById('openTournamentModal').addEventListener('click', openTournamentModal);
    const refreshBtn = document.getElementById('refreshChatBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshMessages);

    // Exposer les fonctions globales
    window.closeTournamentModal = closeTournamentModal;
    window.closePlayersModal = closePlayersModal;
    window.openPlayersModal = openPlayersModal;
    window.toggleStar = toggleStar;
    window.sendMessage = sendMessage;
    window.refreshMessages = refreshMessages;

    initUserMenu();
    initSidebar();
    initLogout();

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